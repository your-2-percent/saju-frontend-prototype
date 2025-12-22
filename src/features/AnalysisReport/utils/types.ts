// features/AnalysisReport/utils/types.ts
export type Element = "목" | "화" | "토" | "금" | "수";

export type TenGod = "비겁" | "식상" | "재성" | "관성" | "인성";

type TenGodSubtype =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

export interface PowerData {
  name: TenGod | TenGodSubtype;
  value: number;
  color: string;
}

// 천간 오행
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

// 지지 오행
export const BRANCH_TO_ELEMENT: Record<string, Element> = {
  자: "수",
  축: "토",
  인: "목",
  묘: "목",
  진: "토",
  사: "화",
  오: "화",
  미: "토",
  신: "금",
  유: "금",
  술: "토",
  해: "수",
};
