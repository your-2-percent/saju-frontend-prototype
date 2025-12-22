// features/AnalysisReport/logic/relations/types.ts

import type { Element } from "../../utils/types";

export type Pillars4 = string[];

export interface RelationTags {
  title?: string;
  cheonganHap: string[];
  cheonganChung: string[];

  jijiSamhap: string[];
  jijiBanhap: string[];
  jijiBanghap: string[];

  jijiYukhap: string[];
  jijiChung: string[];
  jijiHyeong: string[];
  jijiPa: string[];
  jijiHae: string[];
  jijiWonjin: string[];
  jijiGwimun: string[];

  amhap: string[];
  ganjiAmhap: string[];
}

export interface HarmonyOptions {
  emitGanjiAmhap?: boolean;
  fillNone?: boolean;
  includeSamhap?: boolean;
  includeBanghap?: boolean;
}

export interface LuckOptions {
  emitNatalGanjiAmhap?: boolean;
  fillNone?: boolean;
}

export type HarmonyResult = {
  tags: RelationTags;
  overlayedElements: Partial<Record<Element, Element>>;
  elementBonus: Partial<Record<Element, number>>;
  elementPenalty: Partial<Record<Element, number>>;
  appliedSanhe: string[];
  appliedBanghap: string[];
  jijiChung: string[];
  jijiHyeong: string[];
  jijiPa: string[];
  jijiHae: string[];
};

export const SHENG_NEXT: Record<Element, Element> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

export const SHENG_PREV: Record<Element, Element> = {
  목: "수",
  화: "목",
  토: "화",
  금: "토",
  수: "금",
};

export const KE: Record<Element, Element> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

export const KE_INV: Record<Element, Element> = {
  목: "금",
  화: "수",
  토: "목",
  금: "화",
  수: "토",
};

export type StrengthLevel = "왕" | "상" | "휴" | "수" | "사";
export const LV_ADJ: Record<StrengthLevel, number> = { 왕: +0.15, 상: +0.10, 휴: -0.15, 수: -0.20, 사: -0.25 };

export type CoupleHarmony = {
  천간합: string[];
  천간충: string[];
  지지삼합: string[];
  지지반합: string[];
  지지방합: string[];
  지지육합: string[];
  암합: string[]; // 지지+지지 암합
  간지암합: string[]; // 천간+지지 암합
  지지충: string[];
  지지형: string[];
  지지파: string[];
  지지해: string[];
  지지원진: string[];
  지지귀문: string[];
};
