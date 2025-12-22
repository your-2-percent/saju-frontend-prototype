type StemHJ = "甲" | "乙" | "丙" | "丁" | "戊" | "己" | "庚" | "辛" | "壬" | "癸";
type BranchHJ = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";

const KO_TO_HJ_STEM: Record<string, StemHJ> = {
  갑: "甲",
  을: "乙",
  병: "丙",
  정: "丁",
  무: "戊",
  기: "己",
  경: "庚",
  신: "辛",
  임: "壬",
  계: "癸",
} as const;

const KO_TO_HJ_BRANCH: Record<string, BranchHJ> = {
  자: "子",
  축: "丑",
  인: "寅",
  묘: "卯",
  진: "辰",
  사: "巳",
  오: "午",
  미: "未",
  신: "申",
  유: "酉",
  술: "戌",
  해: "亥",
} as const;

const toHJStem = (ch: string): StemHJ | null =>
  (KO_TO_HJ_STEM[ch] ?? ("甲乙丙丁戊己庚辛壬癸".includes(ch) ? ch : null)) as StemHJ | null;

const toHJBranch = (ch: string): BranchHJ | null =>
  (KO_TO_HJ_BRANCH[ch] ?? ("子丑寅卯辰巳午未申酉戌亥".includes(ch) ? ch : null)) as BranchHJ | null;

export const normalizeGZtoHJ = (gz: string): `${StemHJ}${BranchHJ}` => {
  const s = toHJStem(gz[0]);
  const b = toHJBranch(gz[1]);
  if (!s || !b) throw new Error(`Invalid GZ: ${gz}`);
  return `${s}${b}`;
};

export const eqGZ = (a: string, b: string) => normalizeGZtoHJ(a) === normalizeGZtoHJ(b);
