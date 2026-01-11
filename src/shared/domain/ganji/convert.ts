import type { Stem10sin, Branch10sin } from "@/shared/domain/ganji/utils";
import { BRANCH_H2K, BRANCHES_KO, STEM_H2K, STEMS_KO } from "@/shared/domain/ganji/const";

const STEM_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(STEM_H2K).map(([h, k]) => [k, h]));
const BRANCH_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(BRANCH_H2K).map(([h, k]) => [k, h]));

const STEMS_HANJA = new Set(Object.keys(STEM_H2K));
const BRANCHES_HANJA = new Set(Object.keys(BRANCH_H2K));

const YIN_STEMS_ALL = new Set<string>(["乙", "丁", "己", "辛", "癸", "을", "정", "기", "신", "계"]);
const YIN_BRANCHES_ALL = new Set<string>(["丑", "卯", "巳", "未", "酉", "亥", "축", "묘", "사", "미", "유", "해"]);

export function toDisplayChar(
  value: string,
  kind: "stem" | "branch",
  charType: "한자" | "한글"
) {
  if (charType === "한글") {
    return kind === "stem" ? (STEM_H2K[value] ?? value) : (BRANCH_H2K[value] ?? value);
  }
  return kind === "stem" ? (STEM_K2H[value] ?? value) : (BRANCH_K2H[value] ?? value);
}

export function toHanjaStem(ch: string): Stem10sin {
  const h = STEM_K2H[ch] ?? ch;
  return STEMS_HANJA.has(h) ? (h as Stem10sin) : "갑";
}

export function toHanjaBranch(ch: string): Branch10sin {
  const h = BRANCH_K2H[ch] ?? ch;
  return BRANCHES_HANJA.has(h) ? (h as Branch10sin) : "자";
}

export function toKoStem(ch: string): Stem10sin {
  if (STEMS_KO.has(ch as Stem10sin)) return ch as Stem10sin;
  const k = STEM_H2K[ch] ?? ch;
  return STEMS_KO.has(k as Stem10sin) ? (k as Stem10sin) : "갑";
}

export function toKoBranch(ch: string): Branch10sin {
  if (BRANCHES_KO.has(ch as Branch10sin)) return ch as Branch10sin;
  const k = BRANCH_H2K[ch] ?? ch;
  return BRANCHES_KO.has(k as Branch10sin) ? (k as Branch10sin) : "자";
}

export function isYinUnified(value: string, kind: "stem" | "branch") {
  return kind === "stem" ? YIN_STEMS_ALL.has(value) : YIN_BRANCHES_ALL.has(value);
}
