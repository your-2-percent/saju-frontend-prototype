// features/AnalysisReport/logic/relations/groups.ts

import type { Element } from "../../utils/types";

export type KoBranch =
  | "자" | "축" | "인" | "묘" | "진" | "사"
  | "오" | "미" | "신" | "유" | "술" | "해";

export type TrioGroup = {
  name: string;
  members: [KoBranch, KoBranch, KoBranch];
  out: Element;
  wang: KoBranch;
};

// 삼합/방합 공통 그룹
export const SANHE_GROUPS: TrioGroup[] = [
  { name: "해묘미", members: ["해", "묘", "미"], out: "목", wang: "묘" },
  { name: "인오술", members: ["인", "오", "술"], out: "화", wang: "오" },
  { name: "사유축", members: ["사", "유", "축"], out: "금", wang: "유" },
  { name: "신자진", members: ["신", "자", "진"], out: "수", wang: "자" },
];

export const BANGHAP_GROUPS: TrioGroup[] = [
  { name: "인묘진", members: ["인", "묘", "진"], out: "목", wang: "묘" },
  { name: "사오미", members: ["사", "오", "미"], out: "화", wang: "오" },
  { name: "신유술", members: ["신", "유", "술"], out: "금", wang: "유" },
  { name: "해자축", members: ["해", "자", "축"], out: "수", wang: "자" },
];

// 삼형 그룹
export const TRIAD_SHAPE_GROUPS: Array<{
  name: string;
  members: [KoBranch, KoBranch, KoBranch];
}> = [
  { name: "인사신", members: ["인", "사", "신"] },
  { name: "축술미", members: ["축", "술", "미"] },
];
