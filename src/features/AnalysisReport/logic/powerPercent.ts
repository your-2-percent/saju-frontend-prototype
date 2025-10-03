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
  const normArr = normalizeTo100(rawArr);

  const out: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  ELEMENT_ORDER.forEach((el, i) => { out[el] = normArr[i]!; });
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

  // 그대로 반환 (정규화 X)
  return {
    목: elementScoreRaw.목 ?? 0,
    화: elementScoreRaw.화 ?? 0,
    토: elementScoreRaw.토 ?? 0,
    금: elementScoreRaw.금 ?? 0,
    수: elementScoreRaw.수 ?? 0,
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
