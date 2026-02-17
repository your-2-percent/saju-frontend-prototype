// features/AnalysisReport/logic/powerPercent.ts
import type { Pillars4 } from "./relations";
import { normalizeGZ } from "./relations";
import type { Element } from "../utils/types";
import { computePowerDataDetailed } from "../utils/computePowerData";

/** 내부: 합계 100 정규화(반올림 + 잔여분 큰 순 배분) — computePowerData와 동일 전략 */
function normalizeTo100(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return values.map(() => 0);
  const pct = values.map(v => (v * 100) / sum);
  const rounded = pct.map(v => Math.round(v));
  const used = rounded.reduce((a, b) => a + b, 0);
  let rem = 100 - used;

  const frac = pct
    .map((v, i) => ({ i, f: v - Math.round(v) }))
    .sort((a, b) => b.f - a.f);

  for (let k = 0; k < frac.length && rem > 0; k++) {
    rounded[frac[k]!.i] += 1;
    rem -= 1;
  }
  return rounded;
}

const ELEMENT_ORDER: Element[] = ["목", "화", "토", "금", "수"];
const BRANCH_BOOST = {
  threeHarmony: 20,
  halfStrong: 12,
  halfMedium: 8,
  halfWeak: 4,
  monthBranch: 10,
  maxPerElement: 30,
} as const;

// --- Helper: 용신 로직과 동일한 세력 보정 함수 ---
const BRANCH_KO_MAP: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해"
};
function toKoBranch(b: string): string { return BRANCH_KO_MAP[b] ?? b; }

function getMonthBranchElement(monthGz: string): Element | null {
  const rawBranch = (monthGz || "").trim().slice(-1);
  const branch = toKoBranch(rawBranch);
  if ("인묘寅卯".includes(branch)) return "목";
  if ("사오巳午".includes(branch)) return "화";
  if ("신유申酉".includes(branch)) return "금";
  if ("해자亥子".includes(branch)) return "수";
  if ("진술축미辰戌丑未".includes(branch)) return "토";
  return null;
}

function detectCombinations(pillars: string[]): { element: Element; score: number }[] {
  const branches = pillars.map((p) => (p && p.length > 1 ? toKoBranch(p[1]) : ""));
  const bSet = new Set(branches);
  const results: { element: Element; score: number }[] = [];

  // 1. 삼합 (Three Harmony)
  if (bSet.has("인") && bSet.has("오") && bSet.has("술")) results.push({ element: "화", score: BRANCH_BOOST.threeHarmony });
  if (bSet.has("사") && bSet.has("유") && bSet.has("축")) results.push({ element: "금", score: BRANCH_BOOST.threeHarmony });
  if (bSet.has("신") && bSet.has("자") && bSet.has("진")) results.push({ element: "수", score: BRANCH_BOOST.threeHarmony });
  if (bSet.has("해") && bSet.has("묘") && bSet.has("미")) results.push({ element: "목", score: BRANCH_BOOST.threeHarmony });

  // 2. 반합 (Half Harmony)
  // 목
  if (bSet.has("해") && bSet.has("묘")) results.push({ element: "목", score: BRANCH_BOOST.halfStrong });
  else if (bSet.has("묘") && bSet.has("미")) results.push({ element: "목", score: BRANCH_BOOST.halfMedium });
  else if (bSet.has("해") && bSet.has("미")) results.push({ element: "목", score: BRANCH_BOOST.halfWeak });
  // 화
  if (bSet.has("인") && bSet.has("오")) results.push({ element: "화", score: BRANCH_BOOST.halfStrong });
  else if (bSet.has("오") && bSet.has("술")) results.push({ element: "화", score: BRANCH_BOOST.halfMedium });
  else if (bSet.has("인") && bSet.has("술")) results.push({ element: "화", score: BRANCH_BOOST.halfWeak });
  // 금
  if (bSet.has("사") && bSet.has("유")) results.push({ element: "금", score: BRANCH_BOOST.halfStrong });
  else if (bSet.has("유") && bSet.has("축")) results.push({ element: "금", score: BRANCH_BOOST.halfMedium });
  else if (bSet.has("사") && bSet.has("축")) results.push({ element: "금", score: BRANCH_BOOST.halfWeak });
  // 수
  if (bSet.has("신") && bSet.has("자")) results.push({ element: "수", score: BRANCH_BOOST.halfStrong });
  else if (bSet.has("자") && bSet.has("진")) results.push({ element: "수", score: BRANCH_BOOST.halfMedium });
  else if (bSet.has("신") && bSet.has("진")) results.push({ element: "수", score: BRANCH_BOOST.halfWeak });

  return results;
}

/** 원국 기준 오행강약 %만 산출 (운 섞지 않음) — computePowerData의 elementScoreRaw와 완전 동기화 */
export function natalElementPercent(
  natal: Pillars4,
  opts?: { criteriaMode?: "modern" | "classic"; useHarmonyOverlay?: boolean }
): Record<Element, number> {
  const ko: Pillars4 = [
    normalizeGZ(natal[0] ?? ""),
    normalizeGZ(natal[1] ?? ""),
    normalizeGZ(natal[2] ?? ""),
    normalizeGZ(natal[3] ?? ""),
  ];

  const { elementScoreRaw } = computePowerDataDetailed({
    pillars: ko,
    criteriaMode: opts?.criteriaMode ?? "modern",
    useHarmonyOverlay: opts?.useHarmonyOverlay ?? true,
    luck: undefined,               // ✅ 운 배제
    hourKey: "prompt",
  });

  const rawArr = ELEMENT_ORDER.map(el => elementScoreRaw[el] ?? 0);
  
  // 1. 기본 점수 기준 1차 정규화
  const basePctArr = normalizeTo100(rawArr);
  const basePct: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  ELEMENT_ORDER.forEach((el, i) => { basePct[el] = basePctArr[i]!; });

  // 2. 보정 로직 적용 (용신 로직과 동일: 합국 + 월지 가중치)
  const combinations = detectCombinations(ko);
  const monthEl = getMonthBranchElement(ko[1]);

  const perElementBoost: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const combo of combinations) {
    perElementBoost[combo.element] += combo.score;
  }
  if (monthEl) {
    perElementBoost[monthEl] += BRANCH_BOOST.monthBranch;
  }
  for (const el of ELEMENT_ORDER) {
    basePct[el] = (basePct[el] ?? 0) + Math.min(BRANCH_BOOST.maxPerElement, perElementBoost[el] ?? 0);
  }

  // 3. 최종 재정규화 (합계 100%)
  const adjustedArr = ELEMENT_ORDER.map(el => basePct[el] ?? 0);
  const finalArr = normalizeTo100(adjustedArr);
  
  const out: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  ELEMENT_ORDER.forEach((el, i) => { out[el] = finalArr[i]!; });
  return out;
}

/** (필요시) 원국 오행 원시점수 그대로 가져오기 — 득령/득지/득세 등 ‘원시값’ 기준 판정에 사용 */
export function natalElementRaw(
  natal: Pillars4,
  opts?: { criteriaMode?: "modern" | "classic"; useHarmonyOverlay?: boolean }
): Record<Element, number> {
  const ko: Pillars4 = [
    normalizeGZ(natal[0] ?? ""),
    normalizeGZ(natal[1] ?? ""),
    normalizeGZ(natal[2] ?? ""),
    normalizeGZ(natal[3] ?? ""),
  ];

  const { elementScoreRaw } = computePowerDataDetailed({
    pillars: ko,
    criteriaMode: opts?.criteriaMode ?? "modern",
    useHarmonyOverlay: opts?.useHarmonyOverlay ?? true,
    luck: undefined,
    hourKey: "prompt",
  });

  // ✅ 보정 로직 적용 (합국 + 월지 가중치) - Raw 점수에 직접 가산
  const combinations = detectCombinations(ko);
  const monthEl = getMonthBranchElement(ko[1]);

  const out = { ...elementScoreRaw };

  const perElementBoost: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const combo of combinations) {
    perElementBoost[combo.element] += combo.score;
  }
  if (monthEl) {
    perElementBoost[monthEl] += BRANCH_BOOST.monthBranch;
  }
  for (const el of ELEMENT_ORDER) {
    out[el] = (out[el] ?? 0) + Math.min(BRANCH_BOOST.maxPerElement, perElementBoost[el] ?? 0);
  }

  // 그대로 반환 (정규화 X)
  return {
    목: out.목 ?? 0,
    화: out.화 ?? 0,
    토: out.토 ?? 0,
    금: out.금 ?? 0,
    수: out.수 ?? 0,
  };
}

/** 신강도 퍼센트 (일간 + 인성 70% 가중) — 동일 원천 퍼센트 사용 */
export function natalShinPercent(
  natal: Pillars4,
  opts?: { criteriaMode?: "modern" | "classic"; useHarmonyOverlay?: boolean }
): number {
  const perc = natalElementPercent(natal, opts); // ✅ 위와 동일 원천/정규화

  // 일간 오행
  const dayStem = normalizeGZ(natal[2] ?? "").charAt(0);
  const STEM_TO_ELEMENT: Record<string, Element> = {
    갑:"목", 을:"목", 병:"화", 정:"화", 무:"토", 기:"토",
    경:"금", 신:"금", 임:"수", 계:"수",
    甲:"목", 乙:"목", 丙:"화", 丁:"화", 戊:"토", 己:"토",
    庚:"금", 辛:"금", 壬:"수", 癸:"수",
  };
  const dayEl = STEM_TO_ELEMENT[dayStem] as Element | undefined;
  if (!dayEl) return 0;

  // 상생(인성)
  const SHENG_PREV: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };

  const base = perc[dayEl] ?? 0;
  const support = perc[SHENG_PREV[dayEl]] ?? 0;

  // 가중치
  return base + support * 0.7;
}
