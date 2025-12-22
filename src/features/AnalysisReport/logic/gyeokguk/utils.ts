// features/AnalysisReport/logic/gyeokguk/utils.ts
import { getSolarTermBoundaries } from "@/features/myoun";
import type { Element, TenGodSubtype } from "./types";
import {
  BRANCH_TO_TERM,
  SAMHAP_SETS,
  STEM_TO_ELEMENT,
  BRANCH_MAIN_ELEMENT,
  SHENG_NEXT,
  SHENG_PREV,
  KE,
  KE_REV,
} from "./rules";

/** 천간 → 양/음 여부(간단 규칙) */
export function isYangStem(stem: string): boolean {
  return ["갑", "병", "무", "경", "임"].includes(stem);
}

export function BRANCH_IS_YANG(branch: string): boolean {
  return ["자", "인", "진", "오", "신", "술"].includes(branch);
}

export const normStemKo = (s: string) => {
  const m: Record<string, string> = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
  return m[s] ?? s;
};

export const stemOf = (gz?: string) => (gz && gz.length >= 1 ? gz.charAt(0) : "");
export const branchOf = (gz?: string) => (gz && gz.length >= 2 ? gz.charAt(1) : "");
export const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

/** 절입 +12일 이내 여부(월지 기준) */
export function isWithinEarlyPhase(monthBranch: string, date: Date): boolean {
  const termOrTerms = BRANCH_TO_TERM[monthBranch];
  if (!termOrTerms) return false;

  // term이 string[]이든 string이든 다 받게 정규화
  const termNames = Array.isArray(termOrTerms) ? termOrTerms : [termOrTerms];

  const boundaries = getSolarTermBoundaries(date);
  const entry = boundaries.find((x) => termNames.includes(x.name));
  if (!entry) return false;

  const diffMs = date.getTime() - entry.date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);

  return diffDays >= 0 && diffDays <= 12;
}

/** 월지 포함 삼합 성립 여부 */
export function hasSamHapWithMonth(monthBranch: string, others: string[]): boolean {
  const set = SAMHAP_SETS[monthBranch];
  if (!set) return false;
  const uniqs = new Set(others.filter(Boolean));
  const need = set.filter((b) => b !== monthBranch);
  return need.every((b) => uniqs.has(b));
}

/** 천간 → 오행 */
export function mapStemToElement(stem: string): Element {
  return (STEM_TO_ELEMENT[stem] ?? "토") as Element;
}

/** 천간 2개 관계(일간 기준) → 십신(소분류) */
export function mapStemToTenGodSub(dayStem: string, targetStem: string): TenGodSubtype {
  const d = STEM_TO_ELEMENT[dayStem], t = STEM_TO_ELEMENT[targetStem];
  if (!d || !t) return "비견";

  let kind: "비견" | "식신" | "편재" | "편관" | "편인";
  if (t === d) kind = "비견";
  else if (t === SHENG_NEXT[d]) kind = "식신";
  else if (t === KE[d]) kind = "편재";
  else if (t === KE_REV[d]) kind = "편관";
  else if (t === SHENG_PREV[d]) kind = "편인";
  else kind = "비견";

  const same = isYangStem(dayStem) === isYangStem(targetStem);
  switch (kind) {
    case "비견": return same ? "비견" : "겁재";
    case "식신": return same ? "식신" : "상관";
    case "편재": return same ? "편재" : "정재";
    case "편관": return same ? "편관" : "정관";
    case "편인": return same ? "편인" : "정인";
  }
}

/** 지지(본기 오행) → 십신(소분류) */
export function mapBranchToTenGodSub(dayStem: string, branch: string): TenGodSubtype {
  const d = STEM_TO_ELEMENT[dayStem];
  const t = BRANCH_MAIN_ELEMENT[branch];
  if (!d || !t) return "비견";

  let kind: "비견" | "식신" | "편재" | "편관" | "편인";
  if (t === d) kind = "비견";
  else if (t === SHENG_NEXT[d]) kind = "식신";
  else if (t === KE[d]) kind = "편재";
  else if (t === KE_REV[d]) kind = "편관";
  else if (t === SHENG_PREV[d]) kind = "편인";
  else kind = "비견";

  const same = BRANCH_IS_YANG(branch) === isYangStem(dayStem);
  switch (kind) {
    case "비견": return same ? "비견" : "겁재";
    case "식신": return same ? "식신" : "상관";
    case "편재": return same ? "편재" : "정재";
    case "편관": return same ? "편관" : "정관";
    case "편인": return same ? "편인" : "정인";
  }
}

/** 오행 → 대표 천간(양 기준) */
export function elementToStem(el: Element): string {
  const stemElementMap: Record<Element, string> = { 목: "갑", 화: "병", 토: "무", 금: "경", 수: "임" };
  return stemElementMap[el] ?? "무";
}

/** 일간 기준으로 오행을 십신으로 변환 */
export function elementToTenGod(dayStem: string, targetEl: Element): TenGodSubtype {
  const dayEl = mapStemToElement(dayStem);
  const dayYang = isYangStem(dayStem);

  let relation: "비겁" | "식상" | "재성" | "관성" | "인성";
  if (targetEl === dayEl) relation = "비겁";
  else if (SHENG_NEXT[dayEl] === targetEl) relation = "식상";
  else if (SHENG_NEXT[targetEl] === dayEl) relation = "인성";
  else if (KE[dayEl] === targetEl) relation = "재성";
  else if (KE[targetEl] === dayEl) relation = "관성";
  else relation = "비겁";

  const sameYang = dayYang === isYangStem(elementToStem(targetEl));
  switch (relation) {
    case "비겁": return sameYang ? "비견" : "겁재";
    case "식상": return sameYang ? "식신" : "상관";
    case "재성": return sameYang ? "정재" : "편재";
    case "관성": return sameYang ? "정관" : "편관";
    case "인성": return sameYang ? "정인" : "편인";
  }
}

export type StemKo = "갑"|"을"|"병"|"정"|"무"|"기"|"경"|"신"|"임"|"계";

const STEM_H2K: Record<string, StemKo> = {
  "甲": "갑",
  "乙": "을",
  "丙": "병",
  "丁": "정",
  "戊": "무",
  "己": "기",
  "庚": "경",
  "辛": "신",
  "壬": "임",
  "癸": "계",
};

const isStemKo = (s: string): s is StemKo =>
  /^(갑|을|병|정|무|기|경|신|임|계)$/.test(s);

/** 천간 1글자를 한글 StemKo로 정규화(한자/한글 모두 지원) */
export function normalizeStemKo(s: string): StemKo | "" {
  if (!s) return "";
  if (isStemKo(s)) return s;
  const mapped = STEM_H2K[s];
  return mapped ?? "";
}

/** 간지 문자열에서 StemKo를 바로 뽑아줌 */
export function stemKoOf(gz: string): StemKo | "" {
  return normalizeStemKo(stemOf(gz));
}
