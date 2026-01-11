import type { Element } from "@/analysisReport/calc/utils/types";

export const STEM_H2K: Record<string, string> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

export const BRANCH_H2K: Record<string, string> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

export const STEM_TO_ELEMENT: Record<string, Element> = {
  갑: "목",
  을: "목",
  병: "화",
  정: "화",
  무: "토",
  기: "토",
  경: "금",
  신: "금",
  임: "수",
  계: "수",
};

export const BRANCH_MAIN_STEM: Record<string, string> = {
  자: "계",
  축: "기",
  인: "갑",
  묘: "을",
  진: "무",
  사: "병",
  오: "정",
  미: "기",
  신: "경",
  유: "신",
  술: "무",
  해: "임",
  子: "계",
  丑: "기",
  寅: "갑",
  卯: "을",
  辰: "무",
  巳: "병",
  午: "정",
  未: "기",
  申: "경",
  酉: "신",
  戌: "무",
  亥: "임",
};

export const YANG_STEMS = ["갑", "병", "무", "경", "임"] as const;

export function isYang(stemKo: string): boolean {
  return (YANG_STEMS as readonly string[]).includes(stemKo);
}

export const SHENG_NEXT: Record<Element, Element> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

export const KE: Record<Element, Element> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

export const KE_REV: Record<Element, Element> = {
  토: "목",
  금: "화",
  수: "토",
  목: "금",
  화: "수",
};

export const SHENG_PREV: Record<Element, Element> = {
  화: "목",
  토: "화",
  금: "토",
  수: "금",
  목: "수",
};
