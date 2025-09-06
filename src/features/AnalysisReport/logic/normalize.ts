// features/AnalysisReport/logic/normalize.ts
import type { Element } from "../utils/types";

/* 한자→한글 */
export const STEM_H2K: Record<string, string> = {
  甲:"갑", 乙:"을", 丙:"병", 丁:"정", 戊:"무",
  己:"기", 庚:"경", 辛:"신", 壬:"임", 癸:"계",
};
export const BRANCH_H2K: Record<string, string> = {
  子:"자", 丑:"축", 寅:"인", 卯:"묘", 辰:"진", 巳:"사",
  午:"오", 未:"미", 申:"신", 酉:"유", 戌:"술", 亥:"해",
};

export const toKoStem = (ch: string) => STEM_H2K[ch] ?? ch;
export const toKoBranch = (ch: string) => BRANCH_H2K[ch] ?? ch;

export function normalizeGZ(raw: string): string {
  if (!raw) return "";
  const s = raw.replace(/[()[\]{}]/g, "").replace(/\s+/g, "").replace(/[년월일시年月日時干支柱:\-_.]/g, "");
  const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
  if (mKo) return `${mKo[1]}${mKo[2]}`;
  const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
  if (mHa) return `${STEM_H2K[mHa[1] as keyof typeof STEM_H2K]}${BRANCH_H2K[mHa[2] as keyof typeof BRANCH_H2K]}`;
  return "";
}

export function normalizePillars(input?: string[] | null): string[] {
  const arr = Array.isArray(input) ? input.slice(0, 4) : [];
  while (arr.length < 4) arr.push("");
  return arr.map(normalizeGZ);
}
export function isValidPillars(p: string[]): p is [string,string,string,string] {
  return p.length === 4 && p.every((x) => x.length === 2);
}

/* 라벨 정규화 */
export function normElLabel(raw?: unknown): Element | null {
  if (typeof raw !== "string") return null;
  if (/목|木|wood/i.test(raw)) return "목";
  if (/화|火|fire/i.test(raw)) return "화";
  if (/토|土|earth/i.test(raw)) return "토";
  if (/금|金|metal/i.test(raw)) return "금";
  if (/수|水|water/i.test(raw)) return "수";
  return null;
}
