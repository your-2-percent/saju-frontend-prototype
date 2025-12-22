import type { Element, PowerData, TenGod } from "../utils/types";
import type { ComputeResult } from "./powerDataTypes";

const EMPTY_TEN_GODS: TenGod[] = ["비겁", "식상", "재성", "관성", "인성"];
const EMPTY_PER_TEN_GOD = {
  비겁: { a: "비견", b: "겁재", aVal: 0, bVal: 0 },
  식상: { a: "식신", b: "상관", aVal: 0, bVal: 0 },
  재성: { a: "정재", b: "편재", aVal: 0, bVal: 0 },
  관성: { a: "정관", b: "편관", aVal: 0, bVal: 0 },
  인성: { a: "정인", b: "편인", aVal: 0, bVal: 0 },
} as const;
const EMPTY_PER_TEN_GOD_SUB = {
  비견: 0, 겁재: 0, 식신: 0, 상관: 0,
  정재: 0, 편재: 0, 정관: 0, 편관: 0,
  정인: 0, 편인: 0,
} as const;
const EMPTY_DEUK_FLAGS = {
  비겁: { 령: false, 지: false, 세: false },
  식상: { 령: false, 지: false, 세: false },
  재성: { 령: false, 지: false, 세: false },
  관성: { 령: false, 지: false, 세: false },
  인성: { 령: false, 지: false, 세: false },
} as const;

export function hasRequiredPillars(pillarsKo: string[]): boolean {
  return (
    pillarsKo.length === 4 &&
    !!pillarsKo[0] && pillarsKo[0].length >= 2 &&
    !!pillarsKo[1] && pillarsKo[1].length >= 2 &&
    !!pillarsKo[2] && pillarsKo[2].length >= 2
  );
}

export function buildEmptyPowerDataResult(
  elementScore: Record<Element, number>
): ComputeResult {
  const zeros: PowerData[] = EMPTY_TEN_GODS.map((n) => ({
    name: n,
    value: 0,
    color: "#999999",
  }));

  return {
    overlay: {
      totalsSub: { ...EMPTY_PER_TEN_GOD_SUB },
      perStemAugBare: {},
      perStemAugFull: {},
    },
    totals: zeros,
    perTenGod: { ...EMPTY_PER_TEN_GOD },
    PerTenGodSub: { ...EMPTY_PER_TEN_GOD_SUB },
    elementScoreRaw: elementScore,
    deukFlags: { ...EMPTY_DEUK_FLAGS },
    perStemElement: {},
    perStemElementScaled: {},
    stemScoreRaw: {},
    elementPercent100: { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 },
  };
}

export function deriveDayStemAndElement(
  pillarsKo: string[],
  dayStemOverride?: string
): { dayStem: string; dayEl: Element } {
  const dayStemFromPillars = pillarsKo[2]?.[0] ?? "";
  const dayStem = dayStemOverride ?? dayStemFromPillars;
  const dayEl: Element =
    dayStem === "갑" || dayStem === "을"
      ? "목"
      : dayStem === "병" || dayStem === "정"
      ? "화"
      : dayStem === "무" || dayStem === "기"
      ? "토"
      : dayStem === "경" || dayStem === "신"
      ? "금"
      : "수";
  return { dayStem, dayEl };
}
