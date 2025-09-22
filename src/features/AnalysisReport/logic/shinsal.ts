// features/AnalysisReport/logic/shinsal.ts
import type { Pillars4 } from "./relations";

/** 위치가중치: 일지(2)>월지(1)>시지(3)>연지(0) */
type PosIndex = 0 | 1 | 2 | 3;
const POS_WEIGHT: Record<PosIndex, number> = { 2: 4, 1: 3, 3: 2, 0: 1 } as const;

type Source = "natal" | "dae" | "se" | "wol";

type TagBucketPos = { name: string; weight: number; pos: PosIndex };
type TagBucketsByPos = { si: string[]; il: string[]; yeon: string[]; wol: string[] };

export type ShinsalBasis = {
  /** 공망 기준: 일 or 연 (기본: 일) */
  voidBasis?: "day" | "year";
  /** 삼재 기준: 일 or 연 (기본: 일) */
  samjaeBasis?: "day" | "year";
};

/** 우선순위: 월(1) > 일(2) > 연(0) > 시(3) */
const POS_PRIORITY: Record<PosIndex, number> = {
  1: 4, // 월지
  2: 3, // 일지
  0: 2, // 연지
  3: 1, // 시지
};

/* ───────── 한자→한글 보정 ───────── */
const STEM_H2K: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};
const BRANCH_H2K: Record<string, string> = {
  "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
  "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
};

const STEMS_KO = new Set(["갑","을","병","정","무","기","경","신","임","계"]);
const BRANCHES_KO = new Set(["자","축","인","묘","진","사","오","미","신","유","술","해"]);
const STEMS_HJ = new Set(Object.keys(STEM_H2K));
const BRANCHES_HJ = new Set(Object.keys(BRANCH_H2K));

/* 기본 문자 접근 */
const firstRaw = (s: string) => s.slice(0, 1);
const lastRaw  = (s: string) => s.slice(-1);

/* 정규화: 항상 한글로 반환 */
function normStemChar(ch: string): string {
  if (STEMS_KO.has(ch)) return ch;
  if (STEMS_HJ.has(ch)) return STEM_H2K[ch] ?? ch;
  return ch;
}
function normBranchChar(ch: string): string {
  if (BRANCHES_KO.has(ch)) return ch;
  if (BRANCHES_HJ.has(ch)) return BRANCH_H2K[ch] ?? ch;
  return ch;
}

/* 정규화된 간지 추출 */
function getStemAt(gz: string): string {
  return normStemChar(firstRaw(gz));
}
function getBranchAt(gz: string): string {
  return normBranchChar(lastRaw(gz));
}

const idx: Readonly<{ year: 0; month: 1; day: 2; hour: 3 }> = {
  year: 0,
  month: 1,
  day: 2,
  hour: 3,
} as const;

function findBestPosForBranch(branch: string, natal: Pillars4): { pos: PosIndex; weight: number } | null {
  const want = normBranchChar(branch);
  const positions: PosIndex[] = [idx.day, idx.month, idx.hour, idx.year]; // 가중치 순
  for (const p of positions) {
    if (getBranchAt(natal[p]) === want) return { pos: p, weight: POS_WEIGHT[p] ?? 0 };
  }
  return null;
}
function findExactPosForBranch(branch: string, natal: Pillars4, pos: PosIndex): { pos: PosIndex; weight: number } | null {
  return getBranchAt(natal[pos]) === normBranchChar(branch) ? { pos, weight: POS_WEIGHT[pos] } : null;
}
function findBestPosForStem(stem: string, natal: Pillars4): { pos: PosIndex; weight: number } | null {
  const want = normStemChar(stem);
  const positions: PosIndex[] = [idx.day, idx.month, idx.hour, idx.year];
  for (const p of positions) {
    if (getStemAt(natal[p]) === want) return { pos: p, weight: POS_WEIGHT[p] ?? 0 };
  }
  return null;
}

const DUP_POS_RE = /^#(연지|월지|일지|시지)X\1_/;
const isSamePosProductLabel = (s: string) => DUP_POS_RE.test(s);

/** (name,pos) 단위로 중복 제거하면서, 동일 (name,pos)일 때 weight 최대값 유지 */
function uniqKeepMaxPerPos(items: TagBucketPos[]): TagBucketPos[] {
  const map = new Map<string, TagBucketPos>(); // key = `${name}@${pos}`
  for (const it of items) {
    if (isSamePosProductLabel(it.name)) continue; // 같은 자리끼리 곱셈은 버림
    const key = `${it.name}@${it.pos}`;
    const ex = map.get(key);
    if (!ex || it.weight > ex.weight) map.set(key, it);
  }
  return Array.from(map.values()).sort((a, b) =>
    b.weight !== a.weight ? b.weight - a.weight : a.name.localeCompare(b.name, "ko")
  );
}

/** pos 인덱스를 시/일/연/월 그룹 키로 변환 */
function posToKey(pos: PosIndex): keyof TagBucketsByPos {
  if (pos === 3) return "si";
  if (pos === 2) return "il";
  if (pos === 1) return "wol";
  return "yeon";
}

/* ────────────────────────────────────────────────────────────────────────────
 * 표기 헬퍼: #좌측X우측_신살
 * ──────────────────────────────────────────────────────────────────────────── */
const posKo = (p: PosIndex): "연지" | "월지" | "일지" | "시지" =>
  (p === 0 ? "연지" : p === 1 ? "월지" : p === 2 ? "일지" : "시지");
const srcKo = (s: Source): "대운" | "세운" | "월운" =>
  (s === "dae" ? "대운" : s === "se" ? "세운" : "월운");

// (원국) 일간 × (지지 위치)
const labelSB_at = (tag: string, atPos: PosIndex) => `#일간X${posKo(atPos)}_${tag}`;
// (원국) 월지 × (다른 위치)
const labelMonth_withPos = (tag: string, otherPos: PosIndex) =>
  otherPos === idx.month ? `#월지_${tag}` : `#월지X${posKo(otherPos)}_${tag}`;
// (원국) 위치 × 위치 (쌍)
const labelPair_at = (tag: string, p1: PosIndex, p2: PosIndex) => `#${posKo(p1)}X${posKo(p2)}_${tag}`;
// (원국) 공망 라벨
const labelVoid_at = (basis: "day" | "year", atPos: PosIndex) =>
  `#${basis === "day" ? "일간" : "연간"}X${posKo(atPos)}_공망`;
// (원국) 일주 단독
const labelIlju = (tag: string) => `#일주_${tag}`;
// (원국) 단일 위치 라벨
const labelPos_at = (tag: string, atPos: PosIndex) => `#${posKo(atPos)}_${tag}`;

// (운) 일간 × 운
const labelLuck_SB = (tag: string, src: Source) => `#일간X${srcKo(src)}_${tag}`;
// (운) 월지 × 운
const labelLuck_Month = (tag: string, src: Source) => `#월지X${srcKo(src)}_${tag}`;
// (운) 운 × 원국 위치
const labelLuck_SrcWithPos = (tag: string, src: Source, natPos: PosIndex) =>
  `#${srcKo(src)}X${posKo(natPos)}_${tag}`;
// (운) 공망
const labelLuck_Void = (src: Source, basis: "day" | "year") =>
  `#${basis === "day" ? "일간" : "연간"}X${srcKo(src)}_공망`;
// (운) 삼재
const labelLuck_Samjae = (src: Source, basis: "day" | "year") =>
  `#${basis === "day" ? "일지" : "연지"}X${srcKo(src)}_삼재`;
// (운) 상문/조객
const labelLuck_SangJoe = (src: Source, kind: "상문살" | "조객살") => `#연지X${srcKo(src)}_${kind}`;

/* ────────────────────────────────────────────────────────────────────────────
 * 파서/라벨 기타
 * ──────────────────────────────────────────────────────────────────────────── */
function parseGZ(raw?: string | null): { stem: string; branch: string } | null {
  if (!raw) return null;
  const chars = Array.from(String(raw));
  let stem: string | null = null;
  let branch: string | null = null;
  for (const ch of chars) {
    if (!stem && (STEMS_KO.has(ch) || STEMS_HJ.has(ch))) stem = normStemChar(ch);
    if (BRANCHES_KO.has(ch) || BRANCHES_HJ.has(ch)) branch = normBranchChar(ch); // 마지막 지지 유지
  }
  return stem && branch ? { stem, branch } : null;
}
function natalBranches(natal: Pillars4): string[] {
  return natal.map(getBranchAt); // ★ 정규화된 지지
}

/* ────────────────────────────────────────────────────────────────────────────
 * [사용자 제공표 정합] 매핑 데이터
 *  - 길/흉 분류와 “적용”을 그대로 반영
 *  - 도화(桃花) 관련 전부 제외
 * ──────────────────────────────────────────────────────────────────────────── */

/* ==== 연지(年支) 기준 — 흉살 (적용: 주석에 표기) ==== */
type YMap = Record<string, string[]>;
const Y = (o: Record<string, string | string[]>): YMap =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [normBranchChar(k), (Array.isArray(v) ? v : [v]).map(normBranchChar)]));

const MAP_Y_TAEBaek_month = Y({ 자:"사", 축:"축", 인:"유", 묘:"사", 진:"축", 사:"유", 오:"사", 미:"축", 신:"유", 유:"사", 술:"축", 해:"유" }); // 월지적용
const MAP_Y_OGWI_day   = Y({ 자:"진", 축:"사", 인:"오", 묘:"미", 진:"신", 사:"유", 오:"술", 미:"해", 신:"자", 유:"축", 술:"인", 해:"묘" }); // 일지적용
const MAP_Y_SANGMOON_se= Y({ 자:"인", 축:"묘", 인:"진", 묘:"사", 진:"오", 사:"미", 오:"신", 미:"유", 신:"술", 유:"해", 술:"자", 해:"축" });   // 세운적용
const MAP_Y_GOSHIN_month=Y({ 자:"인", 축:"인", 인:"사", 묘:"사", 진:"사", 사:"신", 오:"신", 미:"신", 신:"해", 유:"해", 술:"해", 해:"인" }); // 월지적용
const MAP_Y_GWASOOK_month=Y({ 자:"술", 축:"술", 인:"축", 묘:"축", 진:"축", 사:"진", 오:"진", 미:"진", 신:"미", 유:"미", 술:"미", 해:"술" }); // 월지적용
const MAP_Y_JOGAEK_se   = Y({ 자:"술", 축:"해", 인:"자", 묘:"축", 진:"인", 사:"묘", 오:"진", 미:"사", 신:"오", 유:"미", 술:"신", 해:"유" });   // 세운적용
const MAP_Y_SUOK_all    = Y({ 자:"오", 축:"묘", 인:"자", 묘:"유", 진:"오", 사:"묘", 오:"자", 미:"유", 신:"오", 유:"묘", 술:"자", 해:"유" });   // 전체지지적용
const MAP_Y_DANMYEONG_hour=Y({ 자:"사", 축:"인", 인:"진", 묘:"미", 진:"사", 사:"인", 오:"진", 미:"미", 신:"사", 유:"인", 술:"진", 해:"미" }); // 시지적용
const MAP_Y_CHUNMO_all  = Y({ 자:"신", 축:"술", 인:"자", 묘:"인", 진:"진", 사:"오", 오:"신", 미:"술", 신:"자", 유:"인", 술:"진", 해:"오" });   // 전체지지적용
const MAP_Y_JIMO_all    = Y({ 자:"사", 축:"미", 인:"유", 묘:"해", 진:"축", 사:"묘", 오:"사", 미:"미", 신:"유", 유:"해", 술:"축", 해:"묘" });   // 전체지지적용
const MAP_Y_DAEMO_all   = Y({ 자:"오", 축:"미", 인:"신", 묘:"유", 진:"술", 사:"해", 오:"자", 미:"축", 신:"인", 유:"묘", 술:"진", 해:"사" });   // 전체지지적용
const MAP_Y_SOMO_all    = Y({ 자:"사", 축:"오", 인:"미", 묘:"신", 진:"유", 사:"술", 오:"해", 미:"자", 신:"축", 유:"인", 술:"묘", 해:"진" });   // 전체지지적용
const MAP_Y_GYEOKGAK_all= Y({ 자:"인", 축:"묘", 인:"진", 묘:"사", 진:"오", 사:"미", 오:"신", 미:"유", 신:"술", 유:"해", 술:"자", 해:"축" });   // 전체지지적용
const MAP_Y_PAGUN_all   = Y({ 자:"신", 축:"사", 인:"인", 묘:"해", 진:"신", 사:"사", 오:"인", 미:"해", 신:"신", 유:"사", 술:"인", 해:"해" });   // 전체지지적용
const MAP_Y_GUSHIN_all  = Y({ 자:"묘", 축:"진", 인:"사", 묘:"오", 진:"미", 사:"신", 오:"유", 미:"술", 신:"해", 유:"자", 술:"축", 해:"인" });   // 전체지지적용
const MAP_Y_GYOSHIN_all = Y({ 자:"유", 축:"술", 인:"해", 묘:"자", 진:"축", 사:"인", 오:"묘", 미:"진", 신:"사", 유:"오", 술:"미", 해:"신" });   // 전체지지적용
const MAP_Y_BANEUM_all  = Y({ 자:"자", 축:"축", 인:"인", 묘:"묘", 진:"진", 사:"사", 오:"오", 미:"미", 신:"신", 유:"유", 술:"술", 해:"해" });   // 전체지지적용
const MAP_Y_BOGEUM_all  = Y({ 자:"오", 축:"미", 인:"신", 묘:"유", 진:"술", 사:"해", 오:"자", 미:"축", 신:"인", 유:"묘", 술:"진", 해:"사" });   // 전체지지적용
const MAP_Y_BYEONGBU_all= Y({ 자:"해", 축:"자", 인:"축", 묘:"인", 진:"묘", 사:"진", 오:"사", 미:"오", 신:"미", 유:"신", 술:"유", 해:"술" });   // 전체지지적용
const MAP_Y_SABU_all    = MAP_Y_SOMO_all; // 표 동일
const MAP_Y_GWANBU_all  = MAP_Y_OGWI_day; // 표 동일 매핑
const MAP_Y_TAEUM_all   = MAP_Y_BYEONGBU_all; // 표 동일
const MAP_Y_SEPA_all    = Y({ 자:"유", 축:"진", 인:"해", 묘:"오", 진:"축", 사:"신", 오:"묘", 미:"술", 신:"사", 유:"자", 술:"미", 해:"인" });
const MAP_Y_CHUNGU_all  = MAP_Y_JOGAEK_se; // 표 동일 매핑
const MAP_Y_BIYEOM_all  = Y({ 자:"신", 축:"유", 인:"술", 묘:"해", 진:"자", 사:"축", 오:"인", 미:"묘", 신:"진", 유:"사", 술:"오", 해:"미" });
const MAP_Y_MAEA_all    = Y({ 자:"축", 축:"묘", 인:"신", 묘:"축", 진:"묘", 사:"신", 오:"축", 미:"묘", 신:"신", 유:"축", 술:"묘", 해:"신" });
const MAP_Y_TANGHWA_all = Y({ 자:"오", 축:"미", 인:"인", 묘:"오", 진:"미", 사:"인", 오:"오", 미:"미", 신:"인", 유:"오", 술:"미", 해:"인" });

// (모두 “전체지지적용” 표시는 ALL, 특정 표시는 DAY/HOUR 로 강제)
type ApplyScope = "ALL" | "DAY" | "HOUR";
type DMap = Record<string, string[]>; // 일간→지지들
const toArr = (v: string | string[]) =>
  (Array.isArray(v) ? v : String(v).split("·")).map(s => normBranchChar(s.trim())).filter(Boolean);

/* ==== 월지(月支) 기준 — 길/흉 (적용: 주석) ==== */
type MMapB = Record<string, string[]>; // 월지→지지(1개 이상)
type MMapS = Record<string, string>;   // 월지→천간(1개)

const M_B = (o: Record<string, string | string[]>): MMapB =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [normBranchChar(k), (Array.isArray(v) ? v : [v]).map(s => normBranchChar(s))]));

// 천덕귀인/월덕귀인/천덕합/월덕합 — 전체 천간 적용
const MAP_M_CHEONDEOK_S: MMapS = { 인:"정", 묘:"신", 진:"임", 사:"신", 오:"해", 미:"갑", 신:"계", 유:"인", 술:"병", 해:"을", 자:"사", 축:"경" };
const MAP_M_WOLDEOK_S:  MMapS = { 인:"병", 묘:"갑", 진:"임", 사:"경", 오:"병", 미:"갑", 신:"임", 유:"경", 술:"병", 해:"갑", 자:"임", 축:"경" };
const MAP_M_CHEONDEOKHAP_S: MMapS = { 인:"임", 묘:"사", 진:"정", 사:"병", 오:"인", 미:"기", 신:"무", 유:"해", 술:"신", 해:"경", 자:"신", 축:"을" };
const MAP_M_WOLDEOKHAP_S:  MMapS = { 인:"신", 묘:"기", 진:"정", 사:"을", 오:"신", 미:"기", 신:"정", 유:"을", 술:"신", 해:"기", 자:"정", 축:"을" };

// 혈지 — 전체지지 / 금쇄 — 연지·일지
const MAP_M_HYULJI_B = M_B({ 인:"술", 묘:"해", 진:"자", 사:"축", 오:"인", 미:"묘", 신:"진", 유:"사", 술:"오", 해:"미", 자:"신", 축:"유" });
const MAP_M_GEUMSOE_B = M_B({ 인:"신", 묘:"유", 진:"술", 사:"해", 오:"자", 미:"축", 신:"신", 유:"유", 술:"술", 해:"해", 자:"자", 축:"축" });

// 천사/천전/지전/진신 — 일주(월지→일주 정확매칭)
type MMapIlju = Record<string, string[]>; // 월지→[일주들]
const M_ILJU = (o: Record<string, string | string[]>): MMapIlju =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [normBranchChar(k), toArr(v)]));

const MAP_M_CHUNSA_ILJU = M_ILJU({
  인:"무인", 묘:"무인", 진:"무인", 사:"갑오", 오:"갑오", 미:"갑오", 신:"무신", 유:"무신", 술:"무신", 해:"갑자", 자:"갑자", 축:"갑자",
});
const MAP_M_CHUNJEON_ILJU = M_ILJU({
  인:"을묘", 묘:"을묘", 진:"을묘", 사:"병오", 오:"병오", 미:"병오", 신:"신유", 유:"신유", 술:"신유", 해:"임자", 자:"임자", 축:"임자",
});
const MAP_M_JIJEON_ILJU = M_ILJU({
  인:"신묘", 묘:"신묘", 진:"신묘", 사:"무오", 오:"무오", 미:"무오", 신:"계유", 유:"계유", 술:"계유", 해:"병자", 자:"병자", 축:"병자",
});
const MAP_M_JINSIN_ILJU = M_ILJU({
  인:"갑자", 묘:"갑자", 진:"갑자", 사:"갑오", 오:"갑오", 미:"갑오", 신:"무신", 유:"무신", 술:"무신", 해:"갑자", 자:"갑자", 축:"갑자",
});

// 급각/단교관/부벽/욕분관/사주관/천의성/천희신/황은대사/홍란성/장수성
const MAP_M_GUPGAK_B = M_B({
  인:["해","자"], 묘:["해","자"], 진:["해","자"], 사:["묘","미"], 오:["묘","미"], 미:["묘","미"],
  신:["인","술"], 유:["인","술"], 술:["인","술"], 해:["축","진"], 자:["축","진"], 축:["축","진"],
});
const MAP_M_DANGYO_B = M_B({ 인:"인", 묘:"묘", 진:"신", 사:"축", 오:"술", 미:"유", 신:"진", 유:"사", 술:"오", 해:"미", 자:"해", 축:"자" });
const MAP_M_BUBYEOK_B = M_B({ 인:"유", 묘:"사", 진:"축", 사:"유", 오:"사", 미:"축", 신:"유", 유:"사", 술:"축", 해:"유", 자:"사", 축:"축" });
const MAP_M_YOKBUN_B  = M_B({ 인:"진", 묘:"진", 진:"진", 사:"미", 오:"미", 미:"미", 신:"술", 유:"술", 술:"술", 해:"축", 자:"축", 축:"축" });
const MAP_M_SAJUGWAN_B= M_B({
  인:["사","해"], 묘:["진","술"], 진:["묘","유"], 사:["인","신"], 오:["축","미"], 미:["자","오"],
  신:["사","해"], 유:["진","술"], 술:["묘","유"], 해:["인","신"], 자:["축","미"], 축:["자","오"],
});
const MAP_M_CHEONUI_B = M_B({ 인:"축", 묘:"인", 진:"묘", 사:"진", 오:"사", 미:"오", 신:"미", 유:"신", 술:"유", 해:"술", 자:"해", 축:"자" });
const MAP_M_CHEONHUI_DH = M_B({ 인:"미", 묘:"오", 진:"사", 사:"진", 오:"묘", 미:"인", 신:"축", 유:"자", 술:"해", 해:"술", 자:"유", 축:"신" });
const MAP_M_HWANGEUN_DH = M_B({ 인:"술", 묘:"축", 진:"인", 사:"사", 오:"유", 미:"묘", 신:"자", 유:"오", 술:"해", 해:"진", 자:"신", 축:"미" });
const MAP_M_HONGLAN_B = M_B({ 인:"축", 묘:"자", 진:"해", 사:"술", 오:"유", 미:"신", 신:"미", 유:"오", 술:"사", 해:"진", 자:"묘", 축:"인" });
const MAP_M_JANGSU_B = M_B({ 인:"해", 묘:"술", 진:"유", 사:"신", 오:"미", 미:"오", 신:"사", 유:"진", 술:"묘", 해:"인", 자:"축", 축:"자" });

/* ==== 일간(日干) 기준 — 길/흉 ==== */
const D = (o: Record<string, string | string[]>): DMap =>
  Object.fromEntries(Object.entries(o).map(([k, v]) => [normStemChar(k), toArr(v)]));

// 길신
const MAP_D_TAegeuk = D({ 갑:"자·오", 을:"자", 병:"묘", 정:"묘", 무:"진·술", 기:"축·미", 경:"인·해", 신:"인·해", 임:"사·신", 계:"사·신" });
const MAP_D_CHEONEUL = D({ 갑:"축·미", 을:"자·신", 병:"해·유", 정:"해·유", 무:"축·미", 기:"자·신", 경:"축·미", 신:"인·오", 임:"사·묘", 계:"사·묘" });
const MAP_D_CHEONJU  = D({ 갑:"사", 을:"오", 병:"사", 정:"오", 무:"신", 기:"유", 경:"해", 신:"자", 임:"인", 계:"묘" });
const MAP_D_CHEONGWAN= D({ 갑:"유", 을:"신", 병:"자", 정:"해", 무:"묘", 기:"인", 경:"오", 신:"사", 임:"축·미", 계:"진·술" });
const MAP_D_CHEONBOK = D({ 갑:"미", 을:"진", 병:"사", 정:"유", 무:"술", 기:"묘", 경:"해", 신:"신", 임:"인", 계:"오" });
const MAP_D_MUNCHANG = D({ 갑:"사", 을:"오", 병:"신", 정:"유", 무:"신", 기:"유", 경:"해", 신:"자", 임:"인", 계:"묘" });
const MAP_D_AMROK   = D({ 갑:"해", 을:"술", 병:"신", 정:"미", 무:"신", 기:"미", 경:"사", 신:"진", 임:"인", 계:"축" });
const MAP_D_GEUMYEO = D({ 갑:"진", 을:"사", 병:"미", 정:"신", 무:"미", 기:"신", 경:"술", 신:"해", 임:"축", 계:"인" });
const MAP_D_HYUPROK = D({ 갑:"축·묘", 을:"인·진", 병:"진·오", 정:"사·미", 무:"진·오", 기:"사·미", 경:"미·유", 신:"신·술", 임:"술·자", 계:"해·축" });
const MAP_D_GWANGUI  = D({ 갑:"사", 을:"사", 병:"사", 정:"신", 무:"해", 기:"해", 경:"인", 신:"인", 임:"신", 계:"신" });
const MAP_D_MUNGOK  = D({ 갑:"해", 을:"자", 병:"인", 정:"묘", 무:"인", 기:"묘", 경:"사", 신:"오", 임:"신", 계:"유" });
const MAP_D_HAKDANG = D({ 갑:"해", 을:"오", 병:"인", 정:"유", 무:"인", 기:"유", 경:"사", 신:"자", 임:"신", 계:"묘" });

// 흉신
const MAP_D_HONGYEOM = D({ 갑:"신", 을:"오", 병:"인", 정:"미", 무:"진", 기:"진", 경:"술", 신:"유", 임:"자", 계:"신" });
const MAP_D_YUHA    = D({ 갑:"유", 을:"술", 병:"미", 정:"신", 무:"사", 기:"오", 경:"진", 신:"묘", 임:"해", 계:"인" });
const MAP_D_NAKJEONG= D({ 갑:"사", 을:"자", 병:"신", 정:"술", 무:"묘", 기:"사", 경:"자", 신:"신", 임:"술", 계:"묘" });
const MAP_D_HYOSIN  = D({ 갑:"자", 을:"해", 병:"인", 정:"묘", 무:"오", 기:"사", 경:"진·술", 신:"축·미", 임:"신", 계:"유" }); // 일지·시지 적용(둘 다)
const MAP_D_GORAN   = D({ 갑:"인", 정:"사", 무:"신", 신:"해" }); // 일지 적용
const MAP_D_BIIN    = D({ 갑:"유", 을:"술", 병:"자", 정:"축", 무:"자", 기:"축", 경:"묘", 신:"진", 임:"오", 계:"미" });
const MAP_D_EUMCHAK = D({ 정:"축·미", 신:"묘·유", 계:"사·해" }); // 일지·시지 적용
const MAP_D_YANGCHAK= D({ 병:"자·오", 무:"인·신", 임:"진·술" }); // 일지·시지 적용
const MAP_D_JAEGO   = D({ 갑:"진", 을:"진", 병:"축", 정:"축", 무:"축", 기:"축", 경:"미", 신:"미", 임:"술", 계:"술" }); // 길신
const MAP_D_YANGIN  = D({ 갑:"묘", 을:"진", 병:"오", 정:"미", 무:"오", 기:"미", 경:"유", 신:"술", 임:"자", 계:"축" });
// 백호(같은 기둥 조건)
const MAP_D_BAEKHO  = D({ 갑:"진", 을:"미", 병:"술", 정:"축", 무:"진", 임:"술", 계:"축" });

/* ==== 공망/원진/귀문/천라지망/삼재 등 공통 ==== */
const 원진_pairs: ReadonlyArray<readonly [string, string]> = [
  ["자","미"], ["인","유"], ["축","오"], ["묘","신"], ["진","해"], ["사","술"],
] as const;
const 귀문_pairs: ReadonlyArray<readonly [string, string]> = [
  ["인","미"], ["묘","신"], ["진","해"], ["사","술"], ["자","유"], ["축","오"],
] as const;
const 귀문_strong_set = new Set(["인미","미인","묘신","신문"]);
const 천라지망_pairs: ReadonlyArray<readonly [string, string]> = [["술","해"],["진","사"]];

const 공망표: Array<{ set: Set<string>; voids: [string, string] }> = [
  { set: new Set(["갑자","을축","병인","정묘","무진","기사","경오","신미","임술","계유"]), voids: ["술","해"] },
  { set: new Set(["갑술","을해","병자","정축","무인","기묘","경진","신사","임오","계미"]), voids: ["신","유"] },
  { set: new Set(["갑신","을유","병술","정해","무자","기축","경인","신묘","임진","계사"]), voids: ["오","미"] },
  { set: new Set(["갑오","을미","병신","정유","무술","기해","경자","신축","임인","계묘"]), voids: ["진","사"] },
  { set: new Set(["갑진","을사","병오","정미","무신","기유","경술","신해","임자","계축"]), voids: ["인","묘"] },
  { set: new Set(["갑인","을묘","병진","정사","무오","기미","경신","신유","임진","계해"]), voids: ["자","축"] },
];

/* helper */
function isInPairList(list: ReadonlyArray<readonly [string, string]>, a: string, b: string): boolean {
  const A = normBranchChar(a), B = normBranchChar(b);
  for (const [x, y] of list) if ((x === A && y === B) || (x === B && y === A)) return true;
  return false;
}
function getVoidPair(pillar: string): [string, string] | null {
  for (const row of 공망표) if (row.set.has(pillar)) return row.voids;
  return null;
}
function getSamjaeYears(branch: string): string[] | null {
  const b = normBranchChar(branch);
  const groups: Array<{ group: Set<string>; years: Set<string> }> = [
    { group: new Set(["해","묘","미"]), years: new Set(["사","오","미"]) },
    { group: new Set(["인","오","술"]), years: new Set(["신","유","술"]) },
    { group: new Set(["사","유","축"]), years: new Set(["해","자","축"]) },
    { group: new Set(["신","자","진"]), years: new Set(["인","묘","진"]) },
  ];
  for (const g of groups) if (g.group.has(b)) return Array.from(g.years);
  return null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 규칙 적용 유틸
 * ──────────────────────────────────────────────────────────────────────────── */
function push(arr: TagBucketPos[], v: TagBucketPos) { arr.push(v); }

/** 페어(쌍) 조건 신살 — 우선순위(월>일>연>시) 높은 자리 하나만 라벨링 */
function pushPairTag(
  arr: TagBucketPos[],
  tag: string,
  p1: PosIndex,
  p2: PosIndex,
  extraWeight = 0
) {
  const higher = POS_PRIORITY[p1] >= POS_PRIORITY[p2] ? p1 : p2;
  const label = labelPair_at(tag, p1, p2);
  arr.push({ name: label, weight: POS_WEIGHT[higher] + extraWeight, pos: higher });
}

/** 연지기준 매핑 → 원국 적용 */
function applyYearToNatal(
  natal: Pillars4,
  map: YMap,
  apply: "MONTH"|"DAY"|"HOUR"|"ALL",
  tag: string,
  bucket: TagBucketPos[],
) {
  const yB = getBranchAt(natal[idx.year]);
  const target = map[yB];
  if (!target) return;
  const positions: PosIndex[] =
    apply === "MONTH" ? [idx.month] : apply === "DAY" ? [idx.day] : apply === "HOUR" ? [idx.hour] : [idx.year, idx.month, idx.day, idx.hour];
  for (const t of target) {
    for (const p of positions) {
      const m = findExactPosForBranch(t, natal, p);
      if (m) push(bucket, { name: labelPair_at(tag, idx.year, p), weight: m.weight, pos: p });
    }
  }
}

/** 월지(지지→천간) 규칙: 월지 키에 맞는 ‘요구 천간’이 원국 아무 자리에 있으면 라벨 */
function applyMonthStemToNatal(
  natal: Pillars4,
  map: MMapS,
  tag: string,
  bucket: TagBucketPos[],
) {
  const mB = getBranchAt(natal[idx.month]);
  const needRaw = map[mB];
  if (!needRaw) return;
  const need = normStemChar(needRaw);
  const st = findBestPosForStem(need, natal);
  if (st) push(bucket, { name: labelMonth_withPos(tag, st.pos), weight: st.weight, pos: st.pos });
}

/** 월지(지지→지지) 규칙: 적용 범위 선택 */
function applyMonthBranchToNatal(
  natal: Pillars4,
  map: MMapB,
  tag: string,
  bucket: TagBucketPos[],
  where: "ALL"|"YEAR"|"DAY"|"HOUR"|"DAY_HOUR" = "ALL",
) {
  const mB = getBranchAt(natal[idx.month]);
  const needList = map[mB];
  if (!needList) return;

  const positions: PosIndex[] =
    where === "YEAR" ? [idx.year]
    : where === "DAY" ? [idx.day]
    : where === "HOUR" ? [idx.hour]
    : where === "DAY_HOUR" ? [idx.day, idx.hour]
    : [idx.year, idx.month, idx.day, idx.hour];

  for (const need of needList) {
    for (const p of positions) {
      const m = findExactPosForBranch(need, natal, p);
      if (!m) continue;
      const label = p === idx.month ? `#월지_${tag}` : labelMonth_withPos(tag, p);
      push(bucket, { name: label, weight: m.weight, pos: p });
    }
  }
}

/** 월지→일주 정확 매칭 */
function applyMonthIljuToNatal(
  natal: Pillars4,
  map: MMapIlju,
  tag: string,
  bucket: TagBucketPos[],
) {
  const mB = getBranchAt(natal[idx.month]);
  const needs = map[mB];
  if (!needs) return;
  const ilju = natal[idx.day]; // 문자열 전체 비교(이미 표도 한글 일주로 제공)
  if (needs.includes(ilju)) {
    push(bucket, { name: labelPair_at(tag, idx.month, idx.day), weight: POS_WEIGHT[idx.day], pos: idx.day });
  }
}

/** 일간→지지 규칙 */
function applyDayStemRules(
  natal: Pillars4,
  map: DMap,
  tag: string,
  bucket: TagBucketPos[],
  scope: ApplyScope,
) {
  const dS = getStemAt(natal[idx.day]);
  const targets = map[dS];
  if (!targets) return;
  const positions: PosIndex[] =
    scope === "DAY" ? [idx.day] : scope === "HOUR" ? [idx.hour] : [idx.year, idx.month, idx.day, idx.hour];
  for (const t of targets) {
    for (const p of positions) {
      const m = findExactPosForBranch(t, natal, p);
      if (m) push(bucket, { name: labelSB_at(tag, p), weight: m.weight, pos: p });
    }
  }
}

/* ────────────────────────────────────────────────────────────────────────────
 * 메인
 * ──────────────────────────────────────────────────────────────────────────── */
export function buildShinsalTags({
  natal,
  daewoon,
  sewoon,
  wolwoon,
  basis,
}: {
  natal: Pillars4;
  daewoon?: string | null;
  sewoon?: string | null;
  wolwoon?: string | null;
  basis?: ShinsalBasis;
}): {
  title: string;
  good: TagBucketsByPos & { dae: string[]; se: string[]; wolun: string[] };
  bad: TagBucketsByPos & { dae: string[]; se: string[]; wolun: string[] };
  meta: {
    voidPair: { day?: [string, string]; year?: [string, string] };
    samjaeYears: { day?: string[]; year?: string[] };
    currentBasis: { voidBasis: "day" | "year"; samjaeBasis: "day" | "year" };
  };
} {
  const title = `원국 ${natal.join(" · ")}`;
  const dStem = getStemAt(natal[idx.day]);
  const dBranch = getBranchAt(natal[idx.day]);
  const mBranch = getBranchAt(natal[idx.month]);
  const yBranch = getBranchAt(natal[idx.year]);
  const branches = natalBranches(natal);

  const natalGoodPos: TagBucketPos[] = [];
  const natalBadPos: TagBucketPos[] = [];
  const 괴강_일주세트 = new Set(["경진","임진","경술","무술"]);

  /* ── [연지 기준] 흉살 ── */
  applyYearToNatal(natal, MAP_Y_TAEBaek_month, "MONTH", "태백", natalBadPos);
  applyYearToNatal(natal, MAP_Y_OGWI_day,      "DAY",   "오귀", natalBadPos);
  applyYearToNatal(natal, MAP_Y_GOSHIN_month,  "MONTH", "고신", natalBadPos);
  applyYearToNatal(natal, MAP_Y_GWASOOK_month, "MONTH", "과숙", natalBadPos);
  applyYearToNatal(natal, MAP_Y_SUOK_all,      "ALL",   "수옥", natalBadPos);
  applyYearToNatal(natal, MAP_Y_DANMYEONG_hour,"HOUR",  "단명", natalBadPos);
  applyYearToNatal(natal, MAP_Y_CHUNMO_all,    "ALL",   "천모", natalBadPos);
  applyYearToNatal(natal, MAP_Y_JIMO_all,      "ALL",   "지모", natalBadPos);
  applyYearToNatal(natal, MAP_Y_DAEMO_all,     "ALL",   "대모", natalBadPos);
  applyYearToNatal(natal, MAP_Y_SOMO_all,      "ALL",   "소모", natalBadPos);
  applyYearToNatal(natal, MAP_Y_GYEOKGAK_all,  "ALL",   "격각", natalBadPos);
  applyYearToNatal(natal, MAP_Y_PAGUN_all,     "ALL",   "파군", natalBadPos);
  applyYearToNatal(natal, MAP_Y_GUSHIN_all,    "ALL",   "구신", natalBadPos);
  applyYearToNatal(natal, MAP_Y_GYOSHIN_all,   "ALL",   "교신", natalBadPos);
  applyYearToNatal(natal, MAP_Y_BANEUM_all,    "ALL",   "반음", natalBadPos);
  applyYearToNatal(natal, MAP_Y_BOGEUM_all,    "ALL",   "복음", natalBadPos);
  applyYearToNatal(natal, MAP_Y_BYEONGBU_all,  "ALL",   "병부", natalBadPos);
  applyYearToNatal(natal, MAP_Y_SABU_all,      "ALL",   "사부", natalBadPos);
  applyYearToNatal(natal, MAP_Y_GWANBU_all,    "ALL",   "관부", natalBadPos);
  applyYearToNatal(natal, MAP_Y_TAEUM_all,     "ALL",   "태음", natalBadPos);
  applyYearToNatal(natal, MAP_Y_SEPA_all,      "ALL",   "세파", natalBadPos);
  applyYearToNatal(natal, MAP_Y_CHUNGU_all,    "ALL",   "천구", natalBadPos);
  applyYearToNatal(natal, MAP_Y_BIYEOM_all,    "ALL",   "비염", natalBadPos);
  applyYearToNatal(natal, MAP_Y_MAEA_all,      "ALL",   "매아", natalBadPos);
  applyYearToNatal(natal, MAP_Y_TANGHWA_all,   "ALL",   "탕화", natalBadPos);

  /* ── [월지 기준] 길/흉 ── */
  // 천간 요구형(길)
  applyMonthStemToNatal(natal, MAP_M_CHEONDEOK_S,   "천덕귀인", natalGoodPos);
  applyMonthStemToNatal(natal, MAP_M_WOLDEOK_S,     "월덕귀인", natalGoodPos);
  applyMonthStemToNatal(natal, MAP_M_CHEONDEOKHAP_S,"천덕합",   natalGoodPos);
  applyMonthStemToNatal(natal, MAP_M_WOLDEOKHAP_S,  "월덕합",   natalGoodPos);

  // 지지 요구형
  applyMonthBranchToNatal(natal, MAP_M_HYULJI_B, "혈지", natalBadPos, "ALL");
  applyMonthBranchToNatal(natal, MAP_M_GEUMSOE_B,"금쇄", natalBadPos, "YEAR");
  applyMonthBranchToNatal(natal, MAP_M_GEUMSOE_B,"금쇄", natalBadPos, "DAY");

  // 일주 정확 매칭
  applyMonthIljuToNatal(natal, MAP_M_CHUNSA_ILJU,   "천사",    natalGoodPos);
  applyMonthIljuToNatal(natal, MAP_M_CHUNJEON_ILJU, "천전살",  natalBadPos);
  applyMonthIljuToNatal(natal, MAP_M_JIJEON_ILJU,   "지전살",  natalBadPos);
  applyMonthIljuToNatal(natal, MAP_M_JINSIN_ILJU,   "진신",    natalBadPos);

  // 기타 지지 매핑
  applyMonthBranchToNatal(natal, MAP_M_GUPGAK_B,  "급각살",   natalBadPos, "ALL");
  applyMonthBranchToNatal(natal, MAP_M_DANGYO_B,  "단교관살", natalBadPos, "ALL");
  applyMonthBranchToNatal(natal, MAP_M_BUBYEOK_B, "부벽살",   natalBadPos, "ALL");
  applyMonthBranchToNatal(natal, MAP_M_YOKBUN_B,  "욕분관살", natalBadPos, "ALL");
  applyMonthBranchToNatal(natal, MAP_M_SAJUGWAN_B,"사주관살", natalBadPos, "ALL");
  applyMonthBranchToNatal(natal, MAP_M_CHEONUI_B, "천의성",   natalGoodPos, "ALL");
  applyMonthBranchToNatal(natal, MAP_M_CHEONHUI_DH,"천희신",  natalGoodPos, "DAY_HOUR");
  applyMonthBranchToNatal(natal, MAP_M_HWANGEUN_DH,"황은대사", natalGoodPos, "DAY_HOUR");
  applyMonthBranchToNatal(natal, MAP_M_HONGLAN_B, "홍란성",   natalGoodPos, "ALL");
  applyMonthBranchToNatal(natal, MAP_M_JANGSU_B,  "장수성",   natalGoodPos, "ALL");

  /* ── [일간 기준] 길/흉 ── */
  // 길
  applyDayStemRules(natal, MAP_D_TAegeuk, "태극귀인", natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_CHEONEUL,"천을귀인", natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_CHEONJU, "천주귀인", natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_CHEONGWAN,"천관귀인", natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_CHEONBOK,"천복귀인", natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_MUNCHANG,"문창귀인", natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_AMROK,   "암록",     natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_GEUMYEO, "금여록",   natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_HYUPROK, "협록",     natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_GWANGUI, "관귀학관", natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_MUNGOK,  "문곡귀인", natalGoodPos, "ALL");
  applyDayStemRules(natal, MAP_D_HAKDANG, "학당귀인", natalGoodPos, "ALL");

  // 흉
  applyDayStemRules(natal, MAP_D_HONGYEOM, "홍염",       natalBadPos, "ALL");
  applyDayStemRules(natal, MAP_D_YUHA,     "유하",       natalBadPos, "ALL");
  applyDayStemRules(natal, MAP_D_NAKJEONG, "낙정관살",   natalBadPos, "ALL");
  // 효신/음착/양착/고란 — 적용 범위 지정
  applyDayStemRules(natal, MAP_D_HYOSIN,   "효신살",  natalBadPos, "DAY");
  applyDayStemRules(natal, MAP_D_HYOSIN,   "효신살",  natalBadPos, "HOUR");
  applyDayStemRules(natal, MAP_D_EUMCHAK,  "음착살",  natalBadPos, "DAY");
  applyDayStemRules(natal, MAP_D_EUMCHAK,  "음착살",  natalBadPos, "HOUR");
  applyDayStemRules(natal, MAP_D_YANGCHAK, "양착살",  natalBadPos, "DAY");
  applyDayStemRules(natal, MAP_D_YANGCHAK, "양착살",  natalBadPos, "HOUR");
  applyDayStemRules(natal, MAP_D_GORAN,    "고란살",  natalBadPos, "DAY");
  applyDayStemRules(natal, MAP_D_BIIN,     "비인살",  natalBadPos, "ALL");
  // 재고귀인은 길신
  applyDayStemRules(natal, MAP_D_JAEGO,    "재고귀인", natalGoodPos, "ALL");
  // 양인
  applyDayStemRules(natal, MAP_D_YANGIN,   "양인살",  natalBadPos, "ALL");

  /* ── 괴강/백호 — 같은 동림(같은 기둥) 조건 반영 ── */
  const isGwaegangIlju = 괴강_일주세트.has(natal[idx.day]);
  if (isGwaegangIlju) {
    // 일주 표기
    natalBadPos.push({ name: labelIlju("괴강살"), weight: POS_WEIGHT[idx.day], pos: idx.day });
    // 동일 간지(동림)인 다른 자리에도 단일 라벨
    for (const p of [idx.year, idx.month, idx.hour]) {
      if (natal[p] === natal[idx.day]) {
        natalBadPos.push({ name: labelPos_at("괴강살", p), weight: POS_WEIGHT[p], pos: p });
      }
    }
  }

  // 백호: 일간 기준 매핑 + 같은 기둥(해당 자리의 천간이 '일간'과 같고, 지지가 매핑값)에서만 성립
  const bhTargets = MAP_D_BAEKHO[dStem];
  if (bhTargets) {
    for (const p of [idx.year, idx.month, idx.day, idx.hour]) {
      const st = getStemAt(natal[p]);
      const br = getBranchAt(natal[p]);
      if (st === dStem && bhTargets.includes(br)) {
        natalBadPos.push({ name: labelPos_at("백호대살", p), weight: POS_WEIGHT[p], pos: p });
      }
    }
  }

  /* ── 공통 악살: 천라지망/현침/원진/귀문 ── */
  // 천라지망: 우선순위 높은 자리 하나만
  for (const [a, b] of 천라지망_pairs) {
    const pa = findBestPosForBranch(a, natal);
    const pb = findBestPosForBranch(b, natal);
    if (pa && pb) pushPairTag(natalBadPos, "천라지망", pa.pos, pb.pos);
  }
  // (NEW) 현침살
  {
    const badStems = new Set(["갑", "신"]);
    const badBranches = new Set(["묘", "오", "미", "신"]);

    for (let p = 0 as PosIndex; p <= 3; p++) {
      const st = getStemAt(natal[p]);
      const br = getBranchAt(natal[p]);
      if (badStems.has(st) || badBranches.has(br)) {
        natalBadPos.push({
          name: labelPos_at("현침살", p),
          weight: POS_WEIGHT[p],
          pos: p,
        });
      }
    }
  }

  // (NEW) 십악대패살: 특정 일주일 때 성립
  {
    const 십악대패세트 = new Set(["갑진","을사","임신","병신","정해","경진","무술","계해","신사","기축"]);
    if (십악대패세트.has(natal[idx.day])) {
      natalBadPos.push({ name: labelIlju("십악대패살"), weight: POS_WEIGHT[idx.day], pos: idx.day });
    }
  }

  // (NEW) 곡각살
  {
    const needStem = new Set(["을", "기"]);
    const needBranch = new Set(["축", "사"]);

    for (let p = 0 as PosIndex; p <= 3; p++) {
      const st = getStemAt(natal[p]);
      const br = getBranchAt(natal[p]);
      if (needStem.has(st) || needBranch.has(br)) {
        natalBadPos.push({
          name: labelPos_at("곡각살", p),
          weight: POS_WEIGHT[p],
          pos: p,
        });
      }
    }
  }
  // 원진 (연-시 제외) — 우선순위 높은 자리 하나만
  {
    const pairs: Array<[PosIndex, PosIndex]> = [
      [idx.year,  idx.month],
      [idx.year,  idx.day],
      [idx.month, idx.day],
      [idx.month, idx.hour],
      [idx.day,   idx.hour],
    ];
    for (const [p1, p2] of pairs) {
      const b1 = getBranchAt(natal[p1]), b2 = getBranchAt(natal[p2]);
      if (isInPairList(원진_pairs, b1, b2)) pushPairTag(natalBadPos, "원진", p1, p2);
    }
  }
  // 귀문 (연지 제외, 월-일/일-시 인접) — 우선순위 높은 자리 하나만
  {
    const pairs: Array<[PosIndex, PosIndex, "월일" | "일시"]> = [
      [idx.month, idx.day, "월일"],
      [idx.day,   idx.hour, "일시"],
    ];
    for (const [p1, p2, kind] of pairs) {
      const b1 = getBranchAt(natal[p1]), b2 = getBranchAt(natal[p2]);
      if (isInPairList(귀문_pairs, b1, b2)) {
        const bonus = (kind === "월일" ? 1 : 0) + (귀문_strong_set.has(b1 + b2) ? 1 : 0);
        pushPairTag(natalBadPos, "귀문", p1, p2, bonus);
      }
    }
  }

  function extractTagName(label: string): string {
    const idx = label.lastIndexOf("_");
    return idx >= 0 ? label.slice(idx + 1) : label;
  }

  const MULTI_POS_ALLOWED = new Set(["현침살", "곡각살"]);

  function uniqKeepMaxPerTag(items: TagBucketPos[]): TagBucketPos[] {
    const grouped = new Map<string, TagBucketPos[]>();
    for (const it of items) {
      const tagName = extractTagName(it.name);
      if (!grouped.has(tagName)) grouped.set(tagName, []);
      grouped.get(tagName)!.push(it);
    }

    const result: TagBucketPos[] = [];
    for (const [tagName, arr] of grouped) {
      if (MULTI_POS_ALLOWED.has(tagName)) {
        result.push(...arr);
      } else {
        const chosen = arr.sort((a, b) =>
          POS_PRIORITY[a.pos] !== POS_PRIORITY[b.pos]
            ? POS_PRIORITY[b.pos] - POS_PRIORITY[a.pos]
            : b.weight - a.weight
        )[0];
        result.push(chosen);
      }
    }
    return result;
  }

  /* ── 운(대운/세운/월운) 전 — 원국 공망 라벨링 먼저 수행 ── */
  const dayVoid  = getVoidPair(natal[idx.day]);
  const yearVoid = getVoidPair(natal[idx.year]);
  {
    const active = (basis?.voidBasis ?? "day") === "day" ? dayVoid : yearVoid;
    if (active) {
      const [v1, v2] = active.map(normBranchChar) as [string, string];
      const positions: PosIndex[] = [idx.year, idx.month, idx.day, idx.hour];
      for (const p of positions) {
        const b = getBranchAt(natal[p]);
        if (b === v1 || b === v2) {
          natalBadPos.push({ name: labelVoid_at(basis?.voidBasis ?? "day", p), weight: POS_WEIGHT[p], pos: p });
        }
      }
    }
  }

  /* ── 위치별 분류 ── */
  const goodPosDedup = uniqKeepMaxPerTag(uniqKeepMaxPerPos(natalGoodPos));
  const badPosDedup  = uniqKeepMaxPerTag(uniqKeepMaxPerPos(natalBadPos));

  const goodByPos: TagBucketsByPos = { si: [], il: [], yeon: [], wol: [] };
  const badByPos: TagBucketsByPos  = { si: [], il: [], yeon: [], wol: [] };
  for (const it of goodPosDedup) goodByPos[posToKey(it.pos)].push(it.name);
  for (const it of badPosDedup)  badByPos[posToKey(it.pos)].push(it.name);

  /* ── 운(대운/세운/월운) ── */
  const luckGoodDae: string[] = [];
  const luckGoodSe: string[]  = [];
  const luckGoodWol: string[] = [];
  const luckBadDae: string[]  = [];
  const luckBadSe: string[]   = [];
  const luckBadWol: string[]  = [];

  function pushLuck(arr: string[], v: string) { if (!arr.includes(v)) arr.push(v); }

  function matchLuckOne(src: Source, luck: string | null) {
    const gz = parseGZ(luck);
    if (!gz) return;
    const Lb = gz.branch;
    const Ls = gz.stem;

    const good = src === "dae" ? luckGoodDae : src === "se" ? luckGoodSe : luckGoodWol;
    const bad  = src === "dae" ? luckBadDae  : src === "se" ? luckBadSe  : luckBadWol;

    // 월지×운 (길)
    if (normStemChar(MAP_M_CHEONDEOK_S[mBranch]) === Ls) pushLuck(good, labelLuck_Month("천덕귀인", src));
    if (normStemChar(MAP_M_WOLDEOK_S[mBranch])  === Ls) pushLuck(good, labelLuck_Month("월덕귀인", src));
    if (normStemChar(MAP_M_CHEONDEOKHAP_S[mBranch]) === Ls) pushLuck(good, labelLuck_Month("천덕합", src));
    if (normStemChar(MAP_M_WOLDEOKHAP_S[mBranch])  === Ls) pushLuck(good, labelLuck_Month("월덕합", src));
    if (MAP_M_CHEONUI_B[mBranch]?.includes(Lb)) pushLuck(good, labelLuck_Month("천의성", src));

    // 일간×운 (대표 항목)
    if (MAP_D_CHEONEUL[dStem]?.includes(Lb)) pushLuck(good, labelLuck_SB("천을귀인", src));
    if (MAP_D_GEUMYEO[dStem]?.includes(Lb))  pushLuck(good, labelLuck_SB("금여록", src));
    if (MAP_D_HONGYEOM[dStem]?.includes(Lb)) pushLuck(bad,  labelLuck_SB("홍염", src));
    if (MAP_D_YANGIN[dStem]?.includes(Lb))   pushLuck(bad,  labelLuck_SB("양인살", src));
    if (MAP_D_BAEKHO[dStem]?.includes(Lb))   pushLuck(bad,  labelLuck_SB("백호대살", src)); // 운 표기는 대표로 유지

    // 연지 기준 세운 악살: 상문/조객 (라벨은 운 전용 단일)
    if (src === "se") {
      if (MAP_Y_SANGMOON_se[yBranch]?.includes(Lb)) pushLuck(bad, labelLuck_SangJoe(src, "상문살"));
      if (MAP_Y_JOGAEK_se[yBranch]?.includes(Lb))   pushLuck(bad, labelLuck_SangJoe(src, "조객살"));
    }

    // 천라지망(운지+원국 지지)
    for (const nb of branches) {
      if (isInPairList(천라지망_pairs, Lb, nb)) {
        const pos = findBestPosForBranch(nb, natal)?.pos;
        if (pos !== undefined) pushLuck(bad, labelLuck_SrcWithPos("천라지망", src, pos));
        break;
      }
    }

    // 현침(일간×운지)
    if (new Set(["갑","신"]).has(dStem) && new Set(["묘","오","미","신"]).has(Lb)) {
      pushLuck(bad, labelLuck_SB("현침살", src));
    }

    // 공망(운지)
    const pair = (basis?.voidBasis ?? "day") === "day" ? dayVoid : yearVoid;
    if (pair && (Lb === pair[0] || Lb === pair[1])) pushLuck(bad, labelLuck_Void(src, basis?.voidBasis ?? "day"));

    // 원진/귀문(운지+원국)
    for (let p = 0 as PosIndex; p <= 3; p++) {
      const nb = getBranchAt(natal[p]);
      if (isInPairList(원진_pairs, Lb, nb)) pushLuck(bad, labelLuck_SrcWithPos("원진", src, p));
      if (isInPairList(귀문_pairs, Lb, nb)) pushLuck(bad, labelLuck_SrcWithPos("귀문", src, p));
    }

    // 삼재(세운만)
    if (src === "se") {
      const baseBranch = (basis?.samjaeBasis ?? "day") === "day" ? dBranch : yBranch;
      const yrs = baseBranch ? getSamjaeYears(baseBranch) : null;
      if (yrs && yrs.includes(Lb)) pushLuck(bad, labelLuck_Samjae(src, basis?.samjaeBasis ?? "day"));
    }
  }

  matchLuckOne("dae", daewoon ?? null);
  matchLuckOne("se",  sewoon  ?? null);
  matchLuckOne("wol", wolwoon ?? null);

  return {
    title,
    good: { ...goodByPos, dae: luckGoodDae, se: luckGoodSe, wolun: luckGoodWol },
    bad:  { ...badByPos,  dae: luckBadDae,  se: luckBadSe,  wolun: luckBadWol },
    meta: {
      voidPair: { day: getVoidPair(natal[idx.day]) ?? undefined, year: getVoidPair(natal[idx.year]) ?? undefined },
      samjaeYears: {
        day: getSamjaeYears(dBranch) ?? undefined,
        year: getSamjaeYears(yBranch) ?? undefined,
      },
      currentBasis: { voidBasis: basis?.voidBasis ?? "day", samjaeBasis: basis?.samjaeBasis ?? "day" },
    },
  };
}