// features/AnalysisReport/logic/shinsal/types.ts

/** 위치 인덱스: year(0), month(1), day(2), hour(3) */
export type PosIndex = 0 | 1 | 2 | 3;

export type Source = "natal" | "dae" | "se" | "wol" | "il";

export type TagBucketPos = { name: string; weight: number; pos: PosIndex };

export type TagBucketsByPos = {
  si: string[];
  il: string[];
  yeon: string[];
  wol: string[];
};

export type ShinsalBasis = {
  voidBasis: "day" | "year";
  samjaeBasis: "day" | "year";
};
