// shared/domain/간지/normalize.ts
import type { Stem10sin, Branch10sin } from "./utils";

const STEM_MAP: Record<string, Stem10sin> = {
  // 한자 → 한글
  "甲":"갑","乙":"을","丙":"병","丁":"정","戊":"무",
  "己":"기","庚":"경","辛":"신","壬":"임","癸":"계",
  // 이미 한글인 경우도 그대로
  "갑":"갑","을":"을","병":"병","정":"정","무":"무",
  "기":"기","경":"경","신":"신","임":"임","계":"계",
};

const BRANCH_MAP: Record<string, Branch10sin> = {
  "子":"자","丑":"축","寅":"인","卯":"묘","辰":"진","巳":"사",
  "午":"오","未":"미","申":"신","酉":"유","戌":"술","亥":"해",
  "자":"자","축":"축","인":"인","묘":"묘","진":"진","사":"사",
  "오":"오","미":"미","신":"신","유":"유","술":"술","해":"해",
};

export function normalizeStem(x: string | undefined | null): Stem10sin | null {
  if (!x) return null;
  const c = x.charAt(0);
  return STEM_MAP[c] ?? null;
}

export function normalizeBranch(x: string | undefined | null): Branch10sin | null {
  if (!x) return null;
  const c = x.charAt(0);
  return BRANCH_MAP[c] ?? null;
}
