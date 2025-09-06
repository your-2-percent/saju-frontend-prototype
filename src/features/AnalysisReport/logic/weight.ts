// features/AnalysisReport/logic/weights.ts
export type CriteriaMode = "modern" | "classic";

export type PillarPos = "year" | "month" | "day" | "hour";
export const PILLAR_ORDER: PillarPos[] = ["year", "month", "day", "hour"];

// 현대 가중치
export const WEIGHTS_MODERN: Record<PillarPos, { stem: number; branch: number }> = {
  year:  { stem: 10,   branch: 10   },
  month: { stem: 15,   branch: 25   },
  day:   { stem: 25,   branch: 20   },
  hour:  { stem: 15,   branch: 12.5 },
};

// 고전 가중치
export const WEIGHTS_CLASSIC: Record<PillarPos, { stem: number; branch: number }> = {
  year:  { stem: 10,   branch: 10   },
  month: { stem: 15,   branch: 50   },
  day:   { stem: 25,   branch: 40   },
  hour:  { stem: 15,   branch: 12.5 },
};

export function selectWeights(mode: CriteriaMode) {
  return mode === "classic" ? WEIGHTS_CLASSIC : WEIGHTS_MODERN;
}
