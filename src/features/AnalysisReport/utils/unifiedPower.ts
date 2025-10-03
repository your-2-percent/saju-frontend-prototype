import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import { defaultSettings } from "@/shared/lib/hooks/useSettingsStore";
import { computePowerDataDetailed } from "./computePowerData";
import type { Element } from "./types";

// 🔑 십신 소분류 타입
type TenGodSubtype =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

export type LuckChain = {
  dae: string | null;
  se: string | null;
  wol: string | null;
  il: string | null;
};

export type UnifiedPowerResult = ReturnType<typeof computePowerDataDetailed> & {
  dayStem: string;
  dayEl: Element | null;
  perTenGodSub: Record<TenGodSubtype, number>; // 🔥 소분류 추가
  pillars: Pillars4;
};

const STEM_TO_ELEMENT: Record<string, Element> = {
  갑:"목", 을:"목", 병:"화", 정:"화", 무:"토",
  기:"토", 경:"금", 신:"금", 임:"수", 계:"수",
};
const BRANCH_MAIN_ELEMENT: Record<string, Element> = {
  자:"수", 축:"토", 인:"목", 묘:"목", 진:"토", 사:"화",
  오:"화", 미:"토", 신:"금", 유:"금", 술:"토", 해:"수",
};
const YANG_STEMS = ["갑","병","무","경","임"];
const SHENG_NEXT: Record<Element, Element> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
const SHENG_PREV: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };
const KE:         Record<Element, Element> = { 목:"토", 화:"금", 토:"수", 금:"목", 수:"화" };
const KE_REV:     Record<Element, Element> = { 토:"목", 금:"화", 수:"토", 목:"금", 화:"수" };

function isYang(stem: string): boolean {
  return YANG_STEMS.includes(stem);
}

/** 십신 소분류 판정 */
function mapElementToTenGodSub(dayStem: string, targetEl: Element, targetStem?: string): TenGodSubtype {
  const dayEl = STEM_TO_ELEMENT[dayStem];
  if (!dayEl) return "비견";

  let main: TenGodSubtype;
  if (targetEl === dayEl) main = "비견";
  else if (targetEl === SHENG_NEXT[dayEl]) main = "식신";
  else if (targetEl === KE[dayEl]) main = "정재";
  else if (targetEl === KE_REV[dayEl]) main = "정관";
  else if (targetEl === SHENG_PREV[dayEl]) main = "정인";
  else main = "비견";

  if (targetStem) {
    const samePolarity = isYang(dayStem) === isYang(targetStem);
    switch (main) {
      case "비견": return samePolarity ? "비견" : "겁재";
      case "식신": return samePolarity ? "식신" : "상관";
      case "정재": return samePolarity ? "정재" : "편재";
      case "정관": return samePolarity ? "정관" : "편관";
      case "정인": return samePolarity ? "정인" : "편인";
    }
  }
  return main;
}

/** 소분류 십신 강도 계산 */
function computeTenGodSubStrength(pillars: Pillars4, dayStem: string): Record<TenGodSubtype, number> {
  const result: Record<TenGodSubtype, number> = {
    비견:0, 겁재:0, 식신:0, 상관:0,
    정재:0, 편재:0, 정관:0, 편관:0,
    정인:0, 편인:0,
  };

  for (const gz of pillars) {
    if (!gz) continue;
    const s = gz.charAt(0);
    const b = gz.charAt(1);

    const elS = STEM_TO_ELEMENT[s];
    if (elS) {
      const tg = mapElementToTenGodSub(dayStem, elS, s);
      result[tg] += 10; // 천간 가중치
    }
    const elB = BRANCH_MAIN_ELEMENT[b];
    if (elB) {
      const tg = mapElementToTenGodSub(dayStem, elB);
      result[tg] += 6; // 지지 본기 가중치
    }
  }
  return result;
}

export function computeUnifiedPower(args: {
  natal: Pillars4;
  tab: BlendTab;
  chain?: LuckChain;
  hourKey?: string;
}): UnifiedPowerResult {
  const { natal, tab, chain, hourKey = "unified" } = args;

  const ko4: Pillars4 = [
    normalizeGZ(natal[0] ?? ""),
    normalizeGZ(natal[1] ?? ""),
    normalizeGZ(natal[2] ?? ""),
    normalizeGZ(natal[3] ?? ""),
  ];

  const dayStem = ko4[2]?.charAt(0) ?? "";
  const dayEl: Element | null = STEM_TO_ELEMENT[dayStem] ?? null;

  const { hiddenStemMode, hiddenStem } = defaultSettings;
  const mode   = hiddenStemMode === "classic" ? "classic" : "hgc";
  const hidden = hiddenStem === "regular" ? "regular" : "all";

  const luck = chain ? {
    tab,
    dae: chain.dae ? normalizeGZ(chain.dae) : undefined,
    se:  (tab === "세운" || tab === "월운" || tab === "일운") ? (chain.se  ? normalizeGZ(chain.se)  : undefined) : undefined,
    wol: (tab === "월운" || tab === "일운")                   ? (chain.wol ? normalizeGZ(chain.wol) : undefined) : undefined,
    il:  (tab === "일운")                                     ? (chain.il  ? normalizeGZ(chain.il)  : undefined) : undefined,
  } : { tab };

  const detailed = computePowerDataDetailed({
    pillars: ko4,
    dayStem,
    mode,
    hidden,
    criteriaMode: "modern",
    useHarmonyOverlay: true,
    luck,
    hourKey,
  });

  const perTenGodSub = computeTenGodSubStrength(ko4, dayStem);

  return {
    ...detailed,
    dayStem,
    dayEl,
    perTenGodSub, // 🔥 소분류 포함
    pillars: ko4
  };
}
