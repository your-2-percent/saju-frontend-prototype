// src/shared/ganzhi-utils.ts
import type { Stem10sin, Branch10sin } from "@/shared/domain/ganji/utils";

// 한자→한글, 한글 유지
const STEM_MAP: Record<string, Stem10sin> = {
  "甲":"갑","乙":"을","丙":"병","丁":"정","戊":"무","己":"기","庚":"경","辛":"신","壬":"임","癸":"계",
  "갑":"갑","을":"을","병":"병","정":"정","무":"무","기":"기","경":"경","신":"신","임":"임","계":"계",
};
const BRANCH_MAP: Record<string, Branch10sin> = {
  "子":"자","丑":"축","寅":"인","卯":"묘","辰":"진","巳":"사","午":"오","未":"미","申":"신","酉":"유","戌":"술","亥":"해",
  "자":"자","축":"축","인":"인","묘":"묘","진":"진","사":"사","오":"오","미":"미","신":"신","유":"유","술":"술","해":"해",
};

export function normalizeStem(x: string): Stem10sin {
  const k = x.trim().charAt(0);
  const v = STEM_MAP[k];
  if (!v) throw new Error(`알 수 없는 천간: ${x}`);
  return v;
}
export function normalizeBranch(x: string): Branch10sin {
  const k = x.trim().charAt(0);
  const v = BRANCH_MAP[k];
  if (!v) throw new Error(`알 수 없는 지지: ${x}`);
  return v;
}

/** "癸卯" / "계묘" → { stem:"계", branch:"묘" } */
export function splitGanzhi(gz: string): { stem: Stem10sin; branch: Branch10sin } {
  if (!gz || gz.length < 2) throw new Error(`간지 파싱 실패: ${gz}`);
  const s = normalizeStem(gz[0]);
  const b = normalizeBranch(gz[1]);
  return { stem: s, branch: b };
}