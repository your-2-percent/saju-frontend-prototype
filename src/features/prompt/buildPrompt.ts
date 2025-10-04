// features/AnalysisReport/buildPrompt.ts
import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4, RelationTags } from "@/features/AnalysisReport/logic/relations";
import { buildHarmonyTags, buildAllRelationTags, normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import { natalShinPercent } from "@/features/AnalysisReport/logic/powerPercent";
import { buildShinsalTags, type ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import { useSajuSettingsStore } from "@/shared/lib/hooks/useSajuSettingsStore";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import { getDaewoonList } from "../luck/daewoonList";
import { getShinCategory } from "@/features/AnalysisReport/logic/shinStrength";
import { computeDeukFlags } from "@/features/AnalysisReport/utils/strength";
import { type LuckChain, UnifiedPowerResult } from "@/features/AnalysisReport/utils/unifiedPower";

// ─────────────────────────────────────────────
// AnalysisReport(컴포넌트) overlay 로직과 1:1 동일하게 복제
// ─────────────────────────────────────────────

import type { Element } from "@/features/AnalysisReport/utils/types";

/* ===== 맵/상수 ===== */
const POS_LABELS = ["연", "월", "일", "시"] as const;
const STEM_H2K: Record<string, string> = { 甲:"갑", 乙:"을", 丙:"병", 丁:"정", 戊:"무", 己:"기", 庚:"경", 辛:"신", 壬:"임", 癸:"계" };
const BRANCH_H2K: Record<string, string> = { 子:"자", 丑:"축", 寅:"인", 卯:"묘", 辰:"진", 巳:"사", 午:"오", 未:"미", 申:"신", 酉:"유", 戌:"술", 亥:"해" };
const STEM_TO_ELEMENT: Record<string, Element> = {
  갑:"목", 을:"목", 병:"화", 정:"화", 무:"토", 기:"토",
  경:"금", 신:"금", 임:"수", 계:"수",
};
const BRANCH_MAIN_STEM: Record<string, string> = {
  자:"계", 축:"기", 인:"갑", 묘:"을", 진:"무", 사:"병", 오:"정", 미:"기", 신:"경", 유:"신", 술:"무", 해:"임",
  子:"계", 丑:"기", 寅:"갑", 卯:"을", 辰:"무", 巳:"병", 午:"정", 未:"기", 申:"경", 酉:"신", 戌:"무", 亥:"임",
};
const YANG_STEMS = ["갑","병","무","경","임"] as const;
function isYang(stemKo: string) { return (YANG_STEMS as readonly string[]).includes(stemKo); }
const SHENG_NEXT: Record<Element, Element> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
const KE:         Record<Element, Element> = { 목:"토", 화:"금", 토:"수", 금:"목", 수:"화" };
const KE_REV:     Record<Element, Element> = { 토:"목", 금:"화", 수:"토", 목:"금", 화:"수" };
const SHENG_PREV: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };

/* ===== 유틸 ===== */
function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) { if (v.length > 0) out[k as keyof T] = v as T[keyof T]; }
    else if (typeof v === "object" && v !== null) {
      const cleaned = cleanObject(v as Record<string, unknown>);
      if (Object.keys(cleaned).length > 0) out[k as keyof T] = cleaned as T[keyof T];
    } else if (v !== null && v !== undefined && v !== "") { out[k as keyof T] = v as T[keyof T]; }
  }
  return out;
}
function prettyJson(data: unknown): string {
  return JSON.stringify(data, null, 2)!.replace(/\[\s+/g, "[").replace(/\s+\]/g, "]").replace(/\s*,\s*/g, ",");
}
function section(title: string, data: unknown): string {
  if (data === null || data === undefined || data === "") return "";
  const content = typeof data === "object" ? prettyJson(cleanObject(data as Record<string, unknown>)) : String(data);
  return `## ${title}\n${content}`;
}

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

/* ===== 십신 소분류 ===== */
type TenGodSubtype =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

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

/* ===== 정규화 ===== */
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

/* ===== bare/merge 유틸 (컴포넌트와 동일) ===== */
//const STEMS_BARE = ["갑","을","병","정","무","기","경","신","임","계"] as const;

function toBareStemMap(input: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (v <= 0) continue;
    const stemKo = normalizeStemLike(k);
    if (!stemKo) continue;
    out[stemKo] = (out[stemKo] ?? 0) + v;
  }
  return out;
}

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

/* 가중치 */
const LUCK_RATIO = { natal:50, dae:30, se:20, wol:7, il:3 } as const;

function mergeWithRatio(
  parts: { kind: keyof typeof LUCK_RATIO; bare: Record<string, number> }[]
): Record<string, number> {
  const acc: Record<string, number> = {};

  for (const { kind, bare } of parts) {
    const ratio = LUCK_RATIO[kind] ?? 0;
    if (ratio <= 0) continue;

    const norm = normalizeTo100(bare); // ✅ 소스 자체 합100 맞춰줌
    for (const [stem, val] of Object.entries(norm)) {
      acc[stem] = (acc[stem] ?? 0) + val * ratio;
    }
  }

  // ✅ 최종 합100으로 normalize
  const sum = Object.values(acc).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const k of Object.keys(acc)) {
      acc[k] = (acc[k] / sum) * 100;
    }
  }
  return acc;
}

// ✅ 새 유틸: 이미 정수 100으로 정규화된 per-stem 분포를 받아 단순 합산만 한다.
function elementsFromNormalized(perStemInt: Record<string, number>, stemToElement: Record<string, "목"|"화"|"토"|"금"|"수">) {
  const acc: Record<"목"|"화"|"토"|"금"|"수", number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  for (const [stem, v] of Object.entries(perStemInt)) {
    const el = stemToElement[stem];
    if (el) acc[el] += v;
  }
  return acc; // 추가 normalize/반올림 없음
}

function tenSubFromNormalized(perStemInt: Record<string, number>, dayStem: string) {
  const acc: Record<
    "비견"|"겁재"|"식신"|"상관"|"정재"|"편재"|"정관"|"편관"|"정인"|"편인",
    number
  > = { 비견:0, 겁재:0, 식신:0, 상관:0, 정재:0, 편재:0, 정관:0, 편관:0, 정인:0, 편인:0 };

  for (const [stemKo, v] of Object.entries(perStemInt)) {
    if (v <= 0) continue;
    const sub = mapStemToTenGodSub(dayStem, stemKo); // 기존 함수
    acc[sub] += v;
  }
  return acc; // 추가 normalize/반올림 없음
}

function tenMainFromSub(sub: Record<"비견"|"겁재"|"식신"|"상관"|"정재"|"편재"|"정관"|"편관"|"정인"|"편인", number>) {
  return {
    비겁: sub.비견 + sub.겁재,
    식상: sub.식신 + sub.상관,
    재성: sub.정재 + sub.편재,
    관성: sub.정관 + sub.편관,
    인성: sub.정인 + sub.편인,
  } as const; // 합 100 보장
}


/* ===== 프롬프트 전용 overlay (AnalysisReport와 동일 계산) ===== */
function makeOverlayByLuck(unified: UnifiedPowerResult, tab: BlendTab, chain?: LuckChain) {
  // 1) 원국 스템 bare
  const natalBare = toBareStemMap(unified.perStemElementScaled);

  // 2) 운 스템 bare (탭 조건 동일 적용)
  const daeBare = (tab !== "원국" && chain?.dae) ? toBareFromGZ(chain.dae) : {};
  const seBare  = ((tab === "세운" || tab === "월운" || tab === "일운") && chain?.se) ? toBareFromGZ(chain.se) : {};
  const wolBare = ((tab === "월운" || tab === "일운") && chain?.wol) ? toBareFromGZ(chain.wol) : {};
  const ilBare  = (tab === "일운" && chain?.il) ? toBareFromGZ(chain.il) : {};

  // 3) 가중합산 → normalize 100
  const merged = mergeWithRatio([
    { kind:"natal", bare:natalBare },
    { kind:"dae",   bare:daeBare  },
    { kind:"se",    bare:seBare   },
    { kind:"wol",   bare:wolBare  },
    { kind:"il",    bare:ilBare   },
  ]);

  // ✅ 4) "정수 100"으로 딱 한 번 정규화 — 이 벡터만 사용!
  const mergedInt100 = normalizeTo100(merged);

  // ✅ 5) 여기서부터는 "추가 normalize 금지" — 단순 합산만
  const elementPercentInt = elementsFromNormalized(mergedInt100, STEM_TO_ELEMENT);
  const totalsSubInt      = tenSubFromNormalized(mergedInt100, unified.dayStem);
  const totalsMainInt     = tenMainFromSub(totalsSubInt);

  return {
    perStemAugBare: mergedInt100,          // 기반 벡터(정수100)
    elementPercent: elementPercentInt,     // 오행(정수) — 화 == 식신+상관 보장
    totalsSub: totalsSubInt,               // 소분류(정수)
    totalsMain: totalsMainInt,             // 대분류(정수)
  };
}

// ─────────────────────────────────────────────
// 메인 프롬프트 빌더
// ─────────────────────────────────────────────
export function buildChatPrompt(params: {
  ms: MyeongSik;
  natal: Pillars4;
  chain?: LuckChain;
  basis?: ShinsalBasis;
  tab: BlendTab;
  includeTenGod?: boolean;
  unified: UnifiedPowerResult;
}): string {
  const { ms, natal: natalRaw, chain, basis, tab, unified } = params;

  const natal: Pillars4 = [
    normalizeGZ(natalRaw[0] ?? ""),
    normalizeGZ(natalRaw[1] ?? ""),
    normalizeGZ(natalRaw[2] ?? ""),
    normalizeGZ(natalRaw[3] ?? ""),
  ];

  const daeList = getDaewoonList(ms).slice(0, 10);

  // 형충회합(원국/운)
  const relNatal: RelationTags = buildHarmonyTags(natal);
  const relWithLuck: RelationTags = buildAllRelationTags({
    natal,
    daewoon: tab !== "원국" ? chain?.dae ?? undefined : undefined,
    sewoon:  (tab === "세운" || tab === "월운" || tab === "일운") ? chain?.se ?? undefined : undefined,
    wolwoon: (tab === "월운" || tab === "일운") ? chain?.wol ?? undefined : undefined,
    ilwoon:  (tab === "일운") ? chain?.il ?? undefined : undefined,
  });

  // 십이신살(설정 반영)
  const { shinsalEra, shinsalGaehwa, shinsalBase } = useSajuSettingsStore.getState();
  const baseBranch = shinsalBase === "연지" ? (natal[0]?.charAt(1) ?? "") : (natal[2]?.charAt(1) ?? "");
  const shinsalResult = natal.map((gz, i) => ({
    pos: POS_LABELS[i], gz,
    shinsal: getTwelveShinsalBySettings({ baseBranch, targetBranch: gz.charAt(1), era: shinsalEra, gaehwa: shinsalGaehwa }),
  }));

  // 🚩 AnalysisReport와 동일 계산으로 overlay 구성
  const overlay = makeOverlayByLuck(unified, tab, chain);
  const elemPercentObj = overlay.elementPercent;
  const totalsSub = overlay.totalsSub;

  // 신강도/득령·득지·득세
  const shinPct = natalShinPercent(natal, { criteriaMode: "modern", useHarmonyOverlay: true });
  const shinCategory = getShinCategory(shinPct);
  const { flags: deukFlags0 } = computeDeukFlags(natal, elemPercentObj);
  const shinLine = `${shinCategory} (${shinPct.toFixed(1)}%) · ${[
    `득령 ${deukFlags0.비겁.령 || deukFlags0.인성.령 ? "인정" : "불인정"}`,
    `득지 ${deukFlags0.비겁.지 || deukFlags0.인성.지 ? "인정" : "불인정"}`,
    `득세 ${deukFlags0.비겁.세 ? "인정" : "불인정"}`,
  ].join(", ")}`;

  function formatBirth(ms: MyeongSik): string {
    const rawDay = ms.birthDay ?? "";
    const year = rawDay.slice(0, 4), month = rawDay.slice(4, 6), day = rawDay.slice(6, 8);
    let correctedTime = "";
    if (ms.corrected instanceof Date && !isNaN(ms.corrected.getTime())) {
      const hh = String(ms.corrected.getHours()).padStart(2, "0");
      const mm = String(ms.corrected.getMinutes()).padStart(2, "0");
      correctedTime = `${hh}:${mm}`;
    }
    return `${year}년 ${month}월 ${day}일 보정시 ${correctedTime}`;
  }
  function formatLuckChain(tab: BlendTab, chain?: LuckChain): string {
    if (!chain) return "(없음)";
    const parts: string[] = [];
    if (tab === "대운" || tab === "세운" || tab === "월운" || tab === "일운") { if (chain.dae) parts.push(`대운:${normalizeGZ(chain.dae)}`); }
    if (tab === "세운" || tab === "월운" || tab === "일운") { if (chain.se) parts.push(`세운:${normalizeGZ(chain.se)}`); }
    if (tab === "월운" || tab === "일운") { if (chain.wol) parts.push(`월운:${normalizeGZ(chain.wol)}`); }
    if (tab === "일운") { if (chain.il) parts.push(`일운:${normalizeGZ(chain.il)}`); }
    return parts.length > 0 ? parts.join(" / ") : "(없음)";
  }

  const header = [
    `📌 명식: ${ms.name ?? "이름없음"} (${formatBirth(ms)}) 성별: ${ms.gender}`,
    `원국 4주: ${natal.map((gz, i) => (gz ? `${gz}${["년","월","일","시"][i]}` : "")).filter(Boolean).join(" ") || "(계산 실패)"}`,
    `운: ${formatLuckChain(tab, chain)}`,
  ].join("\n");

  const body = [
    section("대운 리스트 (10개)", daeList),
    section("신강도", shinLine),
    // 🚩 펜타곤과 완전 동기화된 수치
    section(`오행강약(퍼센트·탭=${tab})`, elemPercentObj),
    section(`십신 강약(소분류 10개·탭=${tab}·합계 100)`, totalsSub),
    section("십이운성(원국)", natal.map((gz, i) => ({ pos: POS_LABELS[i], gz, unseong: getTwelveUnseong(natal[2]?.charAt(0) ?? "", gz.charAt(1)) }))),
    section("십이신살(원국·설정 반영)", natal.map((x, i) => x && { pos: POS_LABELS[i], gz: x, shinsal: shinsalResult[i]?.shinsal })),
    section("형충회합(원국)", relNatal),
    section("형충회합(운 포함: 탭 연동)", relWithLuck),
    section("신살(원국 전용)", {
      good: buildShinsalTags({ natal, daewoon:null, sewoon:null, wolwoon:null, ilwoon:null, basis }).good,
      bad:  buildShinsalTags({ natal, daewoon:null, sewoon:null, wolwoon:null, ilwoon:null, basis }).bad,
      meta: buildShinsalTags({ natal, daewoon:null, sewoon:null, wolwoon:null, ilwoon:null, basis }).meta,
    }),
    section(`신살(운 포함·탭=${tab})`, buildShinsalTags({
      natal,
      daewoon: tab !== "원국" ? (chain?.dae ?? null) : null,
      sewoon:  (tab === "세운" || tab === "월운" || tab === "일운") ? (chain?.se ?? null) : null,
      wolwoon: (tab === "월운" || tab === "일운") ? (chain?.wol ?? null) : null,
      ilwoon:  (tab === "일운") ? (chain?.il ?? null) : null,
      basis,
    })),
  ].join("\n\n");

  const guide = [
    `당신은 명리학 전문가입니다.
    아래의 사주 명식을 기반으로 해석하십시오.
    ※ 반드시 단계적으로 서술하십시오.
    ※ 요약하지 말고, 각 항목을 빠짐없이 다루십시오.
    1. 원국과 대운 리스트로 큰 흐름 설명
    2. 오행 강약 + 일간 기준 십신 역할
    3. 형충회합(원국→운 포함 순서)
    4. 십이운성/십이신살 해석
    5. 주요 신살(길/흉) 구체 사례
    6. 종합 운세(애정/재물/건강/직업)
    7. 마크다운 금지, 구어체 문장형으로 서술.
    8. 사주에 대해 모르는 사람에게 설명하듯이, 친절하게, 일상에서의 예시를 들면서 서술.
    9. 최대한 모든 내용을 풀어서 구체적으로 설명해주세요. 예시나 비유를 많이 들어주세요.`,
  ].join("\n");

  return [header, body, guide].join("\n\n");
}
