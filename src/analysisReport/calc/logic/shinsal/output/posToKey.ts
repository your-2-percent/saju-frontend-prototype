// features/AnalysisReport/logic/shinsal/output/posToKey.ts

export type ShinsalPos =
  | "natal"
  | "daewoon"
  | "sewoon"
  | "wolwoon"
  | "ilwoon";

export function posToKey(pos: ShinsalPos): ShinsalPos {
  return pos;
}
