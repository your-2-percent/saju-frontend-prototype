import type { Branch, HourRule, Stem } from "../input/customSajuTypes";

export const GANJI_STEMS: readonly Stem[] = ["갑","을","병","정","무","기","경","신","임","계"];
export const GANJI_BRANCHES: readonly Branch[] = ["자","축","인","묘","진","사","오","미","신","유","술","해"];

export const STEM_INDEX: Record<Stem, number> = {
  갑: 0, 을: 1, 병: 2, 정: 3, 무: 4,
  기: 5, 경: 6, 신: 7, 임: 8, 계: 9,
};

export const MONTH_SEQ_FROM_IN: readonly Branch[] = [
  "인","묘","진","사","오","미","신","유","술","해","자","축",
];

export const ORDER_JASI: readonly Branch[] = GANJI_BRANCHES;
export const ORDER_INSI: readonly Branch[] = MONTH_SEQ_FROM_IN;

export const TIME_WINDOWS: readonly string[] = [
  "23:00~0:59","01:00~2:59","03:00~4:59","05:00~6:59",
  "07:00~8:59","09:00~10:59","11:00~12:59","13:00~14:59",
  "15:00~16:59","17:00~18:59","19:00~20:59","21:00~22:59",
] as const;

export const STEM_YIN_YANG: Record<Stem, "양" | "음"> = {
  갑: "양", 을: "음", 병: "양", 정: "음", 무: "양",
  기: "음", 경: "양", 신: "음", 임: "양", 계: "음",
};
export const BRANCH_YIN_YANG: Record<Branch, "양" | "음"> = {
  자: "양", 축: "음", 인: "양", 묘: "음", 진: "양", 사: "음",
  오: "양", 미: "음", 신: "양", 유: "음", 술: "양", 해: "음",
};

export function monthStemOf(yearStem: Stem, monthBranch: Branch): Stem {
  let base: Stem;
  if (yearStem === "갑" || yearStem === "기") base = "병";
  else if (yearStem === "을" || yearStem === "경") base = "무";
  else if (yearStem === "병" || yearStem === "신") base = "경";
  else if (yearStem === "정" || yearStem === "임") base = "임";
  else base = "갑";

  const baseIdx = STEM_INDEX[base];
  const offset = MONTH_SEQ_FROM_IN.indexOf(monthBranch);
  const idx = (baseIdx + (offset >= 0 ? offset : 0)) % 10;
  return GANJI_STEMS[idx]!;
}

export function buildHourMap(dayStem: Stem, rule: HourRule): Record<Branch, string> {
  const order = rule === "자시" ? ORDER_JASI : ORDER_INSI;
  const baseIndex =
    dayStem === "갑" || dayStem === "기" ? 0 :
    dayStem === "을" || dayStem === "경" ? 2 :
    dayStem === "병" || dayStem === "신" ? 4 :
    dayStem === "정" || dayStem === "임" ? 6 : 8;

  const map: Record<Branch, string> = GANJI_BRANCHES.reduce((acc, b) => {
    acc[b] = "";
    return acc;
  }, {} as Record<Branch, string>);

  for (let i = 0; i < 12; i++) {
    const stem = GANJI_STEMS[(baseIndex + i) % 10]!;
    const branch = order[i]!;
    map[branch] = `${stem}${branch}`;
  }
  return map;
}

export const HOUR_BRANCH_TO_TIME: Record<Branch, { hh: number; mi: number }> = {
  자: { hh: 0,  mi: 0 },
  축: { hh: 2,  mi: 0 },
  인: { hh: 4,  mi: 0 },
  묘: { hh: 6,  mi: 0 },
  진: { hh: 8,  mi: 0 },
  사: { hh: 10, mi: 0 },
  오: { hh: 12, mi: 0 },
  미: { hh: 14, mi: 0 },
  신: { hh: 16, mi: 0 },
  유: { hh: 18, mi: 0 },
  술: { hh: 20, mi: 0 },
  해: { hh: 22, mi: 0 },
};
