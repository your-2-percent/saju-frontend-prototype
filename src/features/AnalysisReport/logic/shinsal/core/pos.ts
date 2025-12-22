// features/AnalysisReport/logic/shinsal/core/pos.ts
import type { PosIndex, TagBucketsByPos } from "../types";

/** 위치가중치: 일지(2)>월지(1)>시지(3)>연지(0) */
export const POS_WEIGHT: Record<PosIndex, number> = { 2: 4, 1: 3, 3: 2, 0: 1 } as const;

/** 우선순위: 월(1) > 일(2) > 연(0) > 시(3) */
export const POS_PRIORITY: Record<PosIndex, number> = { 1: 4, 2: 3, 0: 2, 3: 1 } as const;

export const idx: Readonly<{ year: 0; month: 1; day: 2; hour: 3 }> = {
  year: 0,
  month: 1,
  day: 2,
  hour: 3,
} as const;

export function posToKey(pos: PosIndex): keyof TagBucketsByPos {
  if (pos === 3) return "si";
  if (pos === 2) return "il";
  if (pos === 1) return "wol";
  return "yeon";
}

export const posKo = (p: PosIndex): "연지" | "월지" | "일지" | "시지" =>
  p === 0 ? "연지" : p === 1 ? "월지" : p === 2 ? "일지" : "시지";
