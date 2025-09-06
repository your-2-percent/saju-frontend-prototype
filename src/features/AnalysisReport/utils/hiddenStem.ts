import type { Element } from "./types";

export type HiddenStem = { stem: string; ratio: number; main?: boolean };

/* ── 한글↔한자 매핑 ── */
const STEM_KO = ["갑","을","병","정","무","기","경","신","임","계"] as const;
const STEM_CN = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"] as const;
const BRANCH_KO = ["자","축","인","묘","진","사","오","미","신","유","술","해"] as const;
const BRANCH_CN = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"] as const;

const STEM_H2K: Record<string, string> = Object.fromEntries(STEM_CN.map((h,i)=>[h, STEM_KO[i]]));
const STEM_K2H: Record<string, string> = Object.fromEntries(STEM_KO.map((k,i)=>[k, STEM_CN[i]]));
const BRANCH_H2K: Record<string, string> = Object.fromEntries(BRANCH_CN.map((h,i)=>[h, BRANCH_KO[i]]));
const BRANCH_K2H: Record<string, string> = Object.fromEntries(BRANCH_KO.map((k,i)=>[k, BRANCH_CN[i]]));

const toKoStem   = (ch: string) => STEM_H2K[ch]   ?? ch;
const toKoBranch = (ch: string) => BRANCH_H2K[ch] ?? ch;
const toCnStem   = (ch: string) => STEM_K2H[ch]   ?? ch;
const toCnBranch = (ch: string) => BRANCH_K2H[ch] ?? ch;

/* ── 확장 유틸: 한글 키를 한자 키로도 복제 ── */
function expandStemKeys<T>(src: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = { ...src };
  for (const k of Object.keys(src)) {
    const alt = /[甲乙丙丁戊己庚辛壬癸]/.test(k) ? toKoStem(k) : toCnStem(k);
    if (alt && out[alt] === undefined) out[alt] = src[k] as T;
  }
  return out;
}
function expandBranchKeys<T>(src: Record<string, T>): Record<string, T> {
  const out: Record<string, T> = { ...src };
  for (const k of Object.keys(src)) {
    const alt = /[子丑寅卯辰巳午未申酉戌亥]/.test(k) ? toKoBranch(k) : toCnBranch(k);
    if (alt && out[alt] === undefined) out[alt] = src[k] as T;
  }
  return out;
}

/** ── 원본(한글) 테이블 ── */
/** 천간 → 오행 (원본: 한글) */
const STEM_TO_ELEMENT_KO: Record<string, Element> = {
  "갑": "목", "을": "목",
  "병": "화", "정": "화",
  "무": "토", "기": "토",
  "경": "금", "신": "금",
  "임": "수", "계": "수",
};
/** 지지 메인 오행 (원본: 한글) */
const BRANCH_MAIN_ELEMENT_KO: Record<string, Element> = {
  "자": "수","축": "토","인": "목","묘": "목","진": "토","사": "화",
  "오": "화","미": "토","신": "금","유": "금","술": "토","해": "수",
};
/** 하건충 (원본: 한글) */
const BRANCH_HIDDEN_STEMS_HGC_KO: Record<string, HiddenStem[]> = {
  "자": [{ stem: "계", ratio: 1.0, main: true }],
  "축": [{ stem: "계", ratio: 0.2 },{ stem: "신", ratio: 0.3 },{ stem: "기", ratio: 0.5, main: true }],
  "인": [{ stem: "병", ratio: 0.3 },{ stem: "갑", ratio: 0.7, main: true }],
  "묘": [{ stem: "을", ratio: 1.0, main: true }],
  "진": [{ stem: "을", ratio: 0.2 },{ stem: "계", ratio: 0.3 },{ stem: "무", ratio: 0.5, main: true }],
  "사": [{ stem: "경", ratio: 0.3 },{ stem: "병", ratio: 0.7, main: true }],
  "오": [{ stem: "정", ratio: 1.0, main: true }],
  "미": [{ stem: "정", ratio: 0.2 },{ stem: "을", ratio: 0.3 },{ stem: "기", ratio: 0.5, main: true }],
  "신": [{ stem: "임", ratio: 0.3 },{ stem: "경", ratio: 0.7, main: true }],
  "유": [{ stem: "신", ratio: 1.0, main: true }],
  "술": [{ stem: "신", ratio: 0.2 },{ stem: "정", ratio: 0.3 },{ stem: "무", ratio: 0.5, main: true }],
  "해": [{ stem: "갑", ratio: 0.3 },{ stem: "임", ratio: 0.7, main: true }],
};
/** 고전 (원본: 한글) */
const BRANCH_HIDDEN_STEMS_CLASSIC_KO: Record<string, HiddenStem[]> = {
  ...BRANCH_HIDDEN_STEMS_HGC_KO,
  "인": [{ stem: "무", ratio: 0.2 },{ stem: "병", ratio: 0.3 },{ stem: "갑", ratio: 0.5, main: true }],
  "오": [{ stem: "병", ratio: 0.2 },{ stem: "기", ratio: 0.2 },{ stem: "정", ratio: 1.0, main: true }],
  "사": [{ stem: "무", ratio: 0.2 },{ stem: "경", ratio: 0.3 },{ stem: "병", ratio: 0.7, main: true }],
  "신": [{ stem: "무", ratio: 0.2 },{ stem: "임", ratio: 0.3 },{ stem: "경", ratio: 0.7, main: true }],
};

/** ── export: 한글+한자 키 모두 지원 ── */
export const STEM_TO_ELEMENT: Record<string, Element> = expandStemKeys(STEM_TO_ELEMENT_KO);
export const BRANCH_MAIN_ELEMENT: Record<string, Element> = expandBranchKeys(BRANCH_MAIN_ELEMENT_KO);
export const BRANCH_HIDDEN_STEMS_HGC: Record<string, HiddenStem[]> = expandBranchKeys(BRANCH_HIDDEN_STEMS_HGC_KO);
export const BRANCH_HIDDEN_STEMS_CLASSIC: Record<string, HiddenStem[]> = expandBranchKeys(BRANCH_HIDDEN_STEMS_CLASSIC_KO);
