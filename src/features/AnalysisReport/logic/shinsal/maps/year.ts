// features/AnalysisReport/logic/shinsal/maps/year.ts
import { normBranchChar } from "../core/normalize";

export type YMap = Record<string, string[]>;

const Y = (o: Record<string, string | string[]>): YMap =>
  Object.fromEntries(
    Object.entries(o).map(([k, v]) => [
      normBranchChar(k),
      (Array.isArray(v) ? v : [v]).map((x) => normBranchChar(x)),
    ])
  );

export const MAP_Y_TAEBaek_month = Y({ 자:"사", 축:"축", 인:"유", 묘:"사", 진:"축", 사:"유", 오:"사", 미:"축", 신:"유", 유:"사", 술:"축", 해:"유" });
export const MAP_Y_OGWI_day = Y({ 자:"진", 축:"사", 인:"오", 묘:"미", 진:"신", 사:"유", 오:"술", 미:"해", 신:"자", 유:"축", 술:"인", 해:"묘" });
export const MAP_Y_SANGMOON_se = Y({ 자:"인", 축:"묘", 인:"진", 묘:"사", 진:"오", 사:"미", 오:"신", 미:"유", 신:"술", 유:"해", 술:"자", 해:"축" });
export const MAP_Y_GOSHIN_month = Y({ 자:"인", 축:"인", 인:"사", 묘:"사", 진:"사", 사:"신", 오:"신", 미:"신", 신:"해", 유:"해", 술:"해", 해:"인" });
export const MAP_Y_GWASOOK_month = Y({ 자:"술", 축:"술", 인:"축", 묘:"축", 진:"축", 사:"진", 오:"진", 미:"진", 신:"미", 유:"미", 술:"미", 해:"술" });
export const MAP_Y_JOGAEK_se = Y({ 자:"술", 축:"해", 인:"자", 묘:"축", 진:"인", 사:"묘", 오:"진", 미:"사", 신:"오", 유:"미", 술:"신", 해:"유" });
export const MAP_Y_SUOK_all = Y({ 자:"오", 축:"묘", 인:"자", 묘:"유", 진:"오", 사:"묘", 오:"자", 미:"유", 신:"오", 유:"묘", 술:"자", 해:"유" });
export const MAP_Y_DANMYEONG_hour = Y({ 자:"사", 축:"인", 인:"진", 묘:"미", 진:"사", 사:"인", 오:"진", 미:"미", 신:"사", 유:"인", 술:"진", 해:"미" });
export const MAP_Y_CHUNMO_all = Y({ 자:"신", 축:"술", 인:"자", 묘:"인", 진:"진", 사:"오", 오:"신", 미:"술", 신:"자", 유:"인", 술:"진", 해:"오" });
export const MAP_Y_JIMO_all = Y({ 자:"사", 축:"미", 인:"유", 묘:"해", 진:"축", 사:"묘", 오:"사", 미:"미", 신:"유", 유:"해", 술:"축", 해:"묘" });
export const MAP_Y_DAEMO_all = Y({ 자:"오", 축:"미", 인:"신", 묘:"유", 진:"술", 사:"해", 오:"자", 미:"축", 신:"인", 유:"묘", 술:"진", 해:"사" });
export const MAP_Y_SOMO_all = Y({ 자:"사", 축:"오", 인:"미", 묘:"신", 진:"유", 사:"술", 오:"해", 미:"자", 신:"축", 유:"인", 술:"묘", 해:"진" });
export const MAP_Y_GYEOKGAK_all = Y({ 자:"인", 축:"묘", 인:"진", 묘:"사", 진:"오", 사:"미", 오:"신", 미:"유", 신:"술", 유:"해", 술:"자", 해:"축" });
export const MAP_Y_PAGUN_all = Y({ 자:"신", 축:"사", 인:"인", 묘:"해", 진:"신", 사:"사", 오:"인", 미:"해", 신:"신", 유:"사", 술:"인", 해:"해" });
export const MAP_Y_GUSHIN_all = Y({ 자:"묘", 축:"진", 인:"사", 묘:"오", 진:"미", 사:"신", 오:"유", 미:"술", 신:"해", 유:"자", 술:"축", 해:"인" });
export const MAP_Y_GYOSHIN_all = Y({ 자:"유", 축:"술", 인:"해", 묘:"자", 진:"축", 사:"인", 오:"묘", 미:"진", 신:"사", 유:"오", 술:"미", 해:"신" });
export const MAP_Y_BANEUM_all = Y({ 자:"자", 축:"축", 인:"인", 묘:"묘", 진:"진", 사:"사", 오:"오", 미:"미", 신:"신", 유:"유", 술:"술", 해:"해" });
export const MAP_Y_BOGEUM_all = Y({ 자:"오", 축:"미", 인:"신", 묘:"유", 진:"술", 사:"해", 오:"자", 미:"축", 신:"인", 유:"묘", 술:"진", 해:"사" });
export const MAP_Y_BYEONGBU_all = Y({ 자:"해", 축:"자", 인:"축", 묘:"인", 진:"묘", 사:"진", 오:"사", 미:"오", 신:"미", 유:"신", 술:"유", 해:"술" });
export const MAP_Y_SABU_all = MAP_Y_SOMO_all;
export const MAP_Y_GWANBU_all = MAP_Y_OGWI_day;
export const MAP_Y_TAEUM_all = MAP_Y_BYEONGBU_all;
export const MAP_Y_SEPA_all = Y({ 자:"유", 축:"진", 인:"해", 묘:"오", 진:"축", 사:"신", 오:"묘", 미:"술", 신:"사", 유:"자", 술:"미", 해:"인" });
export const MAP_Y_CHUNGU_all = MAP_Y_JOGAEK_se;
export const MAP_Y_BIYEOM_all = Y({ 자:"신", 축:"유", 인:"술", 묘:"해", 진:"자", 사:"축", 오:"인", 미:"묘", 신:"진", 유:"사", 술:"오", 해:"미" });
export const MAP_Y_MAEA_all = Y({ 자:"축", 축:"묘", 인:"신", 묘:"축", 진:"묘", 사:"신", 오:"축", 미:"묘", 신:"신", 유:"축", 술:"묘", 해:"신" });
export const MAP_Y_TANGHWA_all = Y({ 자:"오", 축:"미", 인:"인", 묘:"오", 진:"미", 사:"인", 오:"오", 미:"미", 신:"인", 유:"오", 술:"미", 해:"인" });
