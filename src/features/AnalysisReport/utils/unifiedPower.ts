// features/AnalysisReport/utils/computeUnifiedPower.ts
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import { defaultSettings } from "@/shared/lib/hooks/useSettingsStore";
import { computePowerDataDetailed } from "./computePowerData";
import type { Element, PowerData, TenGod } from "./types";

/* =========================
 * 십신 소분류 타입
 * ========================= */
const STEM_H2K: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
const BRANCH_H2K: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};

/** 지지 → 본기 천간(한글) */
const BRANCH_MAIN_STEM: Record<string, string> = {
  자: "계", 축: "기", 인: "갑", 묘: "을", 진: "무", 사: "병",
  오: "정", 미: "기", 신: "경", 유: "신", 술: "무", 해: "임",
  子: "계", 丑: "기", 寅: "갑", 卯: "을", 辰: "무", 巳: "병",
  午: "정", 未: "기", 申: "경", 酉: "신", 戌: "무", 亥: "임",
};
const YANG_STEMS = ["갑","병","무","경","임"] as const;
function isYang(stemKo: string) { return (YANG_STEMS as readonly string[]).includes(stemKo); }
const SHENG_NEXT: Record<Element, Element> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
const KE:         Record<Element, Element> = { 목:"토", 화:"금", 토:"수", 금:"목", 수:"화" };
const KE_REV:     Record<Element, Element> = { 토:"목", 금:"화", 수:"토", 목:"금", 화:"수" };
const SHENG_PREV: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };

type TenGodSubtype =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

function normalizeStemLike(token: string): string | null {
  if (!token) return null;
  const s = token.trim();
  if (["갑","을","병","정","무","기","경","신","임","계"].includes(s)) return s;
  if (STEM_H2K[s]) return STEM_H2K[s];
  if (["자","축","인","묘","진","사","오","미","신","유","술","해"].includes(s)) return BRANCH_MAIN_STEM[s] ?? null;
  if (BRANCH_H2K[s]) return BRANCH_MAIN_STEM[BRANCH_H2K[s]] ?? null;
  const first = s.charAt(0);
  if (STEM_H2K[first]) return STEM_H2K[first];
  if (["갑","을","병","정","무","기","경","신","임","계"].includes(first)) return first;
  if (BRANCH_H2K[first]) return BRANCH_MAIN_STEM[BRANCH_H2K[first]] ?? null;
  if (["자","축","인","묘","진","사","오","미","신","유","술","해"].includes(first)) return BRANCH_MAIN_STEM[first] ?? null;
  return null;
}

function mapStemToTenGodSub(dayStemKo: string, targetStemKo: string): TenGodSubtype {
  const dayEl = STEM_TO_ELEMENT[dayStemKo as keyof typeof STEM_TO_ELEMENT];
  const targetEl = STEM_TO_ELEMENT[targetStemKo as keyof typeof STEM_TO_ELEMENT];
  if (!dayEl || !targetEl) return "비견";
  let main: TenGodSubtype;
  if (targetEl === dayEl) main = "비견";
  else if (targetEl === SHENG_NEXT[dayEl]) main = "식신";
  else if (targetEl === KE[dayEl]) main = "편재";
  else if (targetEl === KE_REV[dayEl]) main = "편관";
  else if (targetEl === SHENG_PREV[dayEl]) main = "편인";
  else main = "비견";
  const same = isYang(dayStemKo) === isYang(targetStemKo);
  switch (main) {
    case "비견": return same ? "비견" : "겁재";
    case "식신": return same ? "식신" : "상관";
    case "편재": return same ? "편재" : "정재";
    case "편관": return same ? "편관" : "정관";
    case "편인": return same ? "편인" : "정인";
  }
}

function normalizeTo100(obj: Record<string, number>): Record<string, number> {
  const entries = Object.entries(obj) as [string, number][];
  const sum = entries.reduce((a, [,v]) => a + (v > 0 ? v : 0), 0);
  if (sum <= 0) return Object.fromEntries(entries.map(([k]) => [k, 0])) as Record<string, number>;
  const raw = entries.map(([k, v]) => [k, (v > 0 ? v : 0) * 100 / sum] as const);
  const floored = raw.map(([k, x]) => [k, Math.round(x)] as const);
  let used = floored.reduce((a, [,x]) => a + x, 0);
  const rema = raw.map(([k, x]) => [k, x - Math.round(x)] as const).sort((a, b) => b[1] - a[1]);
  const out: Record<string, number> = Object.fromEntries(floored.map(([k, x]) => [k, x])) as Record<string, number>;
  let i = 0;
  while (used < 100 && i < rema.length) { out[rema[i][0]] += 1; used += 1; i += 1; }
  return out;
}

function stemsScaledToSubTotals(
  perStemScaled: Record<string, number>,
  dayStem: string
): Record<TenGodSubtype, number> {

  const acc: Record<TenGodSubtype, number> = {
    비견:0, 겁재:0, 식신:0, 상관:0, 정재:0, 편재:0, 정관:0, 편관:0, 정인:0, 편인:0
  };
  for (const [k, v] of Object.entries(perStemScaled ?? {})) {
    if (v <= 0) continue;
    const stemKo = normalizeStemLike(k);
    if (!stemKo) continue;
    const sub = mapStemToTenGodSub(dayStem, stemKo);
    acc[sub] += v;
  }
  // ✅ 여기서만 normalize
  return normalizeTo100(acc) as Record<TenGodSubtype, number>;
}

function aggregateMainFromSubPercent(sub: PerTenGodSub): PerTenGodAggregated {
  return {
    비겁: { a: "비견", b: "겁재", aVal: sub.비견, bVal: sub.겁재 },
    식상: { a: "식신", b: "상관", aVal: sub.식신, bVal: sub.상관 },
    재성: { a: "정재", b: "편재", aVal: sub.정재, bVal: sub.편재 },
    관성: { a: "정관", b: "편관", aVal: sub.정관, bVal: sub.편관 },
    인성: { a: "정인", b: "편인", aVal: sub.정인, bVal: sub.편인 },
  };
}

export type LuckChain = {
  dae: string | null;
  se: string | null;
  wol: string | null;
  il: string | null;
};

type PerTenGodAggregated = {
  비겁: { a: TenGodSubtype; b: TenGodSubtype; aVal: number; bVal: number },
  식상: { a: TenGodSubtype; b: TenGodSubtype; aVal: number; bVal: number },
  재성: { a: TenGodSubtype; b: TenGodSubtype; aVal: number; bVal: number },
  관성: { a: TenGodSubtype; b: TenGodSubtype; aVal: number; bVal: number },
  인성: { a: TenGodSubtype; b: TenGodSubtype; aVal: number; bVal: number },
};

type PerTenGodSub = {
  비견: number; 겁재: number; 식신: number; 상관: number;
  정재: number; 편재: number; 정관: number; 편관: number;
  정인: number; 편인: number;
};


export interface UnifiedPowerResult {
  perStemElementScaled: Record<string, number>;
  perTenGod: PerTenGodAggregated;   // <- 여기 타입을 바꿈
  perTenGodSub: Record<string, number>;
  mergedStems: Record<string, number>;
  elementPercent100: Record<Element, number>;
  totals: PowerData[];
  dayStem: string;
  overlay: {
    totalsSub: PerTenGodSub;
    perStemAugBare: Record<string, number>;
    perStemAugFull: Record<string, number>;
  };
}

// 가중치 상수
const LUCK_RATIO = {
  natal: 50,
  dae: 30,
  se: 20,
  wol: 7,
  il: 3,
} as const;

/**
 * 여러 소스 bare stems를 가중치로 합산 후 normalize
 */
export function mergeStemsWithLuck(
  natalBare: Record<string, number>,
  chain?: LuckChain
): Record<string, number> {
  // 운 bare stems 추출
  const daeBare = chain?.dae ? toBareFromGZ(chain.dae) : {};
  const seBare  = chain?.se  ? toBareFromGZ(chain.se)  : {};
  const wolBare = chain?.wol ? toBareFromGZ(chain.wol) : {};
  const ilBare  = chain?.il  ? toBareFromGZ(chain.il)  : {};

  // 비율 합산
  const acc: Record<string, number> = {};

  const parts: { kind: keyof typeof LUCK_RATIO; bare: Record<string, number> }[] = [
    { kind: "natal", bare: natalBare },
    { kind: "dae",   bare: daeBare },
    { kind: "se",    bare: seBare },
    { kind: "wol",   bare: wolBare },
    { kind: "il",    bare: ilBare },
  ];

  for (const { kind, bare } of parts) {
    const ratio = LUCK_RATIO[kind];
    if (!bare || Object.keys(bare).length === 0) continue;

    const norm = normalizeTo100(bare); // 소스 합100으로 스케일
    for (const [stem, val] of Object.entries(norm)) {
      acc[stem] = (acc[stem] ?? 0) + val * ratio;
    }
  }

  // 최종 normalize (합100)
  const sum = Object.values(acc).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const k of Object.keys(acc)) {
      acc[k] = (acc[k] / sum) * 100;
    }
  }

  return acc;
}

/* =========================
 * 기본 매핑
 * ========================= */
const STEM_TO_ELEMENT: Record<string, Element> = {
  갑:"목", 을:"목", 병:"화", 정:"화", 무:"토",
  기:"토", 경:"금", 신:"금", 임:"수", 계:"수",
};

/** GZ → bare stems (천간 + 지지본기천간) */
function stemsFromGZ(gz: string): string[] {
  if (!gz) return [];
  const s = normalizeStemLike(gz.charAt(0)); // 천간
  const b = normalizeStemLike(gz.charAt(1)); // 지지→본기천간
  return [s, b].filter(Boolean) as string[];
}

function toBareFromGZ(gz: string): Record<string, number> {
  const stems = stemsFromGZ(gz);
  const out: Record<string, number> = {};
  for (const s of stems) out[s] = (out[s] ?? 0) + 1;
  return out;
}

/**
 * 오행(Element) → 십신(TenGod) 변환
 * @param dayStem 기준 일간(천간)
 * @param targetEl 판정할 대상 오행
 * @param targetStem (optional) 대상 천간 (음양 판별용)
 */
export function mapElementToTenGod(
  dayStem: string,
  targetEl: Element,
  targetStem?: string
): TenGod {
  const dayEl = STEM_TO_ELEMENT[dayStem];
  if (!dayEl) return "비겁";

  let main: TenGod;
  if (targetEl === dayEl) main = "비겁";
  else if (targetEl === SHENG_NEXT[dayEl]) main = "식상";
  else if (targetEl === KE[dayEl]) main = "재성";
  else if (targetEl === KE_REV[dayEl]) main = "관성";
  else if (targetEl === SHENG_PREV[dayEl]) main = "인성";
  else main = "비겁";

  // 음양 판정 → 편/정 갈라줌
  if (targetStem) {
    const same = isYang(dayStem) === isYang(targetStem);
    switch (main) {
      case "비겁": return same ? "비겁" : "비겁"; // 비겁은 보통 편/정 안 나눔
      case "식상": return same ? "식상" : "식상";
      case "재성": return same ? "재성" : "재성";
      case "관성": return same ? "관성" : "관성";
      case "인성": return same ? "인성" : "인성";
    }
  }
  return main;
}

/** perStemElementScaled(키가 '갑목/신금' 또는 '갑/신' 섞여있어도) → '갑','을',… 단일천간 맵으로 통일 */
function toBareStemMap(input: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (v <= 0) continue;
    // "갑목" → "갑", "辛" → "신", "酉" → "신"(본기), 등등을 모두 단일 천간으로 정규화
    const stemKo = normalizeStemLike(k);
    if (!stemKo) continue;
    out[stemKo] = (out[stemKo] ?? 0) + v;
  }
  return out;
}

const STEMS_BARE = ["갑","을","병","정","무","기","경","신","임","계"] as const;
function bareToFullStemMap(
  bare: Record<string, number>
): Record<
  "갑목"|"을목"|"병화"|"정화"|"무토"|"기토"|"경금"|"신금"|"임수"|"계수",
  number
> {
  const zero: Record<
    "갑목"|"을목"|"병화"|"정화"|"무토"|"기토"|"경금"|"신금"|"임수"|"계수",
    number
  > = { 
    갑목:0, 을목:0, 병화:0, 정화:0, 무토:0, 기토:0, 경금:0, 신금:0, 임수:0, 계수:0 
  };

  // 여기서 타입 명시
  const out: Record<
    "갑목"|"을목"|"병화"|"정화"|"무토"|"기토"|"경금"|"신금"|"임수"|"계수",
    number
  > = { ...zero };

  for (const s of STEMS_BARE) {
    const el = STEM_TO_ELEMENT[s];          // 예: '신' → '금'
    const label = `${s}${el}` as keyof typeof out; // keyof로 안전하게
    out[label] = Math.max(0, Math.round(bare[s] ?? 0));
  }
  return out;
}

/* =========================
 * 메인 함수
 * ========================= */
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

  // overlay 생성
  const natalBare = toBareStemMap(detailed.perStemElementScaled);

    // const merged = mergeWithRatio([
    //   { kind: "natal", bare: natalBare },
    //   { kind: "dae",   bare: daeBare },
    //   { kind: "se",    bare: seBare },
    //   { kind: "wol",   bare: wolBare },
    //   { kind: "il",    bare: ilBare },
    // ]);

  const merged = mergeStemsWithLuck(natalBare, chain);
  const mergedNorm = normalizeTo100(merged);

  const totalsSub = stemsScaledToSubTotals(merged, dayStem) as PerTenGodSub;
  const totalsMain = aggregateMainFromSubPercent(totalsSub);
  const perStemAugFull = bareToFullStemMap(mergedNorm);

  return {
    ...detailed,
    dayStem,
    mergedStems: mergedNorm,
    perTenGodSub: totalsSub,
    perTenGod: totalsMain,
    overlay: { totalsSub, perStemAugBare: merged, perStemAugFull }
  };
}
