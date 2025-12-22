// features/AnalysisReport/logic/shinsal/maps/dayStem.ts
import { normBranchChar, normStemChar } from "../core/normalize";

export type DMap = Record<string, string[]>;

const toArr = (v: string | string[]) =>
  (Array.isArray(v) ? v : String(v).split("·"))
    .map((s) => normBranchChar(s.trim()))
    .filter(Boolean);

const D = (o: Record<string, string | string[]>): DMap =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [normStemChar(k), toArr(v)]));

// 길신
export const MAP_D_TAegeuk = D({ 갑:"자·오", 을:"자", 병:"묘", 정:"묘", 무:"진·술", 기:"축·미", 경:"인·해", 신:"인·해", 임:"사·신", 계:"사·신" });
export const MAP_D_CHEONEUL = D({ 갑:"축·미", 을:"자·신", 병:"해·유", 정:"해·유", 무:"축·미", 기:"자·신", 경:"축·미", 신:"인·오", 임:"사·묘", 계:"사·묘" });
export const MAP_D_CHEONJU  = D({ 갑:"사", 을:"오", 병:"사", 정:"오", 무:"신", 기:"유", 경:"해", 신:"자", 임:"인", 계:"묘" });
export const MAP_D_CHEONGWAN= D({ 갑:"유", 을:"신", 병:"자", 정:"해", 무:"묘", 기:"인", 경:"오", 신:"사", 임:"축·미", 계:"진·술" });
export const MAP_D_CHEONBOK = D({ 갑:"미", 을:"진", 병:"사", 정:"유", 무:"술", 기:"묘", 경:"해", 신:"신", 임:"인", 계:"오" });
export const MAP_D_MUNCHANG = D({ 갑:"사", 을:"오", 병:"신", 정:"유", 무:"신", 기:"유", 경:"해", 신:"자", 임:"인", 계:"묘" });
export const MAP_D_AMROK   = D({ 갑:"해", 을:"술", 병:"신", 정:"미", 무:"신", 기:"미", 경:"사", 신:"진", 임:"인", 계:"축" });
export const MAP_D_GEUMYEO = D({ 갑:"진", 을:"사", 병:"미", 정:"신", 무:"미", 기:"신", 경:"술", 신:"해", 임:"축", 계:"인" });
export const MAP_D_HYUPROK = D({ 갑:"축·묘", 을:"인·진", 병:"진·오", 정:"사·미", 무:"진·오", 기:"사·미", 경:"미·유", 신:"신·술", 임:"술·자", 계:"해·축" });
export const MAP_D_GWANGUI  = D({ 갑:"사", 을:"사", 병:"사", 정:"신", 무:"해", 기:"해", 경:"인", 신:"인", 임:"신", 계:"신" });
export const MAP_D_MUNGOK  = D({ 갑:"해", 을:"자", 병:"인", 정:"묘", 무:"인", 기:"묘", 경:"사", 신:"오", 임:"신", 계:"유" });
export const MAP_D_HAKDANG = D({ 갑:"해", 을:"오", 병:"인", 정:"유", 무:"인", 기:"유", 경:"사", 신:"자", 임:"신", 계:"묘" });
export const MAP_D_SIPGANROK = D({ 갑: "인", 을: "묘", 병: "사", 정: "오", 무: "사", 기: "오", 경: "신", 신: "유", 임: "해", 계: "자" });

// 흉신
export const MAP_D_HONGYEOM = D({ 갑:"신", 을:"오", 병:"인", 정:"미", 무:"진", 기:"진", 경:"술", 신:"유", 임:"자", 계:"신" });
export const MAP_D_YUHA    = D({ 갑:"유", 을:"술", 병:"미", 정:"신", 무:"사", 기:"오", 경:"진", 신:"묘", 임:"해", 계:"인" });
export const MAP_D_NAKJEONG= D({ 갑:"사", 을:"자", 병:"신", 정:"술", 무:"묘", 기:"사", 경:"자", 신:"신", 임:"술", 계:"묘" });
export const MAP_D_HYOSIN  = D({ 갑:"자", 을:"해", 병:"인", 정:"묘", 무:"오", 기:"사", 경:"진·술", 신:"축·미", 임:"신", 계:"유" });
export const MAP_D_GORAN   = D({ 갑:"인", 정:"사", 무:"신", 신:"해" });
export const MAP_D_BIIN    = D({ 갑:"유", 을:"술", 병:"자", 정:"축", 무:"자", 기:"축", 경:"묘", 신:"진", 임:"오", 계:"미" });
export const MAP_D_EUMCHAK = D({ 정:"축·미", 신:"묘·유", 계:"사·해" });
export const MAP_D_YANGCHAK= D({ 병:"자·오", 무:"인·신", 임:"진·술" });
export const MAP_D_JAEGO   = D({ 갑:"진", 을:"진", 병:"축", 정:"축", 무:"축", 기:"축", 경:"미", 신:"미", 임:"술", 계:"술" });
export const MAP_D_YANGIN  = D({ 갑:"묘", 을:"진", 병:"오", 정:"미", 무:"오", 기:"미", 경:"유", 신:"술", 임:"자", 계:"축" });
export const MAP_D_BAEKHO  = D({ 갑:"진", 을:"미", 병:"술", 정:"축", 무:"진", 임:"술", 계:"축" });
