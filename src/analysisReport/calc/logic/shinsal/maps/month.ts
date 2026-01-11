// features/AnalysisReport/logic/shinsal/maps/month.ts
import { normBranchChar } from "../core/normalize";

export type MMapB = Record<string, string[]>;
export type MMapS = Record<string, string>;
export type MMapIlju = Record<string, string[]>;

const toArr = (v: string | string[]) =>
  (Array.isArray(v) ? v : String(v).split("·"))
    .map((s) => normBranchChar(s.trim()))
    .filter(Boolean);

export const M_B = (o: Record<string, string | string[]>): MMapB =>
  Object.fromEntries(
    Object.entries(o).map(([k, v]) => [
      normBranchChar(k),
      (Array.isArray(v) ? v : [v]).map((s) => normBranchChar(s)),
    ])
  );

export const M_ILJU = (o: Record<string, string | string[]>): MMapIlju =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [normBranchChar(k), toArr(v)]));

// 월지(지지→천간)
export const MAP_M_CHEONDEOK_S: MMapS = { 인:"정", 묘:"신", 진:"임", 사:"신", 오:"해", 미:"갑", 신:"계", 유:"인", 술:"병", 해:"을", 자:"사", 축:"경" };
export const MAP_M_WOLDEOK_S:  MMapS = { 인:"병", 묘:"갑", 진:"임", 사:"경", 오:"병", 미:"갑", 신:"임", 유:"경", 술:"병", 해:"갑", 자:"임", 축:"경" };
export const MAP_M_CHEONDEOKHAP_S: MMapS = { 인:"임", 묘:"사", 진:"정", 사:"병", 오:"인", 미:"기", 신:"무", 유:"해", 술:"신", 해:"경", 자:"신", 축:"을" };
export const MAP_M_WOLDEOKHAP_S:  MMapS = { 인:"신", 묘:"기", 진:"정", 사:"을", 오:"신", 미:"기", 신:"정", 유:"을", 술:"신", 해:"기", 자:"정", 축:"을" };

// 월지(지지→지지)
export const MAP_M_HYULJI_B = M_B({ 인:"술", 묘:"해", 진:"자", 사:"축", 오:"인", 미:"묘", 신:"진", 유:"사", 술:"오", 해:"미", 자:"신", 축:"유" });
export const MAP_M_GEUMSOE_B = M_B({ 인:"신", 묘:"유", 진:"술", 사:"해", 오:"자", 미:"축", 신:"신", 유:"유", 술:"술", 해:"해", 자:"자", 축:"축" });

// 월지→특정 일주(일간+일지) 리스트
export const MAP_M_CHUNSA_ILJU = M_ILJU({
  인:"무인", 묘:"무인", 진:"무인", 사:"갑오", 오:"갑오", 미:"갑오", 신:"무신", 유:"무신", 술:"무신", 해:"갑자", 자:"갑자", 축:"갑자",
});
export const MAP_M_CHUNJEON_ILJU = M_ILJU({
  인:"을묘", 묘:"을묘", 진:"을묘", 사:"병오", 오:"병오", 미:"병오", 신:"신유", 유:"신유", 술:"신유", 해:"임자", 자:"임자", 축:"임자",
});
export const MAP_M_JIJEON_ILJU = M_ILJU({
  인:"신묘", 묘:"신묘", 진:"신묘", 사:"무오", 오:"무오", 미:"무오", 신:"계유", 유:"계유", 술:"계유", 해:"병자", 자:"병자", 축:"병자",
});
export const MAP_M_JINSIN_ILJU = M_ILJU({
  인:"갑자", 묘:"갑자", 진:"갑자", 사:"갑오", 오:"갑오", 미:"갑오", 신:"무신", 유:"무신", 술:"무신", 해:"갑자", 자:"갑자", 축:"갑자",
});

// 급각/단교관/...
export const MAP_M_GUPGAK_B = M_B({
  인:["해","자"], 묘:["해","자"], 진:["해","자"], 사:["묘","미"], 오:["묘","미"], 미:["묘","미"],
  신:["인","술"], 유:["인","술"], 술:["인","술"], 해:["축","진"], 자:["축","진"], 축:["축","진"],
});
export const MAP_M_DANGYO_B = M_B({ 인:"인", 묘:"묘", 진:"신", 사:"축", 오:"술", 미:"유", 신:"진", 유:"사", 술:"오", 해:"미", 자:"해", 축:"자" });
export const MAP_M_BUBYEOK_B = M_B({ 인:"유", 묘:"사", 진:"축", 사:"유", 오:"사", 미:"축", 신:"유", 유:"사", 술:"축", 해:"유", 자:"사", 축:"축" });
export const MAP_M_YOKBUN_B  = M_B({ 인:"진", 묘:"진", 진:"진", 사:"미", 오:"미", 미:"미", 신:"술", 유:"술", 술:"술", 해:"축", 자:"축", 축:"축" });
export const MAP_M_SAJUGWAN_B= M_B({
  인:["사","해"], 묘:["진","술"], 진:["묘","유"], 사:["인","신"], 오:["축","미"], 미:["자","오"],
  신:["사","해"], 유:["진","술"], 술:["묘","유"], 해:["인","신"], 자:["축","미"], 축:["자","오"],
});
export const MAP_M_CHEONUI_B = M_B({ 인:"축", 묘:"인", 진:"묘", 사:"진", 오:"사", 미:"오", 신:"미", 유:"신", 술:"유", 해:"술", 자:"해", 축:"자" });
export const MAP_M_CHEONHUI_DH = M_B({ 인:"미", 묘:"오", 진:"사", 사:"진", 오:"묘", 미:"인", 신:"축", 유:"자", 술:"해", 해:"술", 자:"유", 축:"신" });
export const MAP_M_HWANGEUN_DH = M_B({ 인:"술", 묘:"축", 진:"인", 사:"사", 오:"유", 미:"묘", 신:"자", 유:"오", 술:"해", 해:"진", 자:"신", 축:"미" });
export const MAP_M_HONGLAN_B = M_B({ 인:"축", 묘:"자", 진:"해", 사:"술", 오:"유", 미:"신", 신:"미", 유:"오", 술:"사", 해:"진", 자:"묘", 축:"인" });
export const MAP_M_JANGSU_B = M_B({ 인:"해", 묘:"술", 진:"유", 사:"신", 오:"미", 미:"오", 신:"사", 유:"진", 술:"묘", 해:"인", 자:"축", 축:"자" });
