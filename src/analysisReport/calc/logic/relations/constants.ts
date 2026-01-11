// features/AnalysisReport/logic/relations/constants.ts

export const POS_LABELS = ["연", "월", "일", "시"] as const;
export type PosLabel = (typeof POS_LABELS)[number];

export const POS = {
  year: 0,
  month: 1,
  day: 2,
  hour: 3,
} as const;

export const LUCK_ORDER = ["대운", "세운", "월운", "일운"] as const;
export type LuckKind = "대운" | "세운" | "월운" | "일운";

// 연X시(원국) 표기용 약표기. 현재는 빈 문자열 유지.
export const WEAK_SUFFIX = "";
