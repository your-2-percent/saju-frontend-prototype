// features/AnalysisReport/logic/gyeokguk/types.ts

export type Element = "목" | "화" | "토" | "금" | "수";

/** 십신(소분류 10) */
export type TenGodSubtype =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

export interface GyeokgukInner {
  월령: string;       // 월지 정기
  사령: string;       // 월률·절입·삼합 반영
  진신: string;       // = 사령
  가신: string;       // 진신을 극 + 음양 동일 천간
  내격: string;       // 십신격 (비견/겁재 제외)
  외격: string[];     // 특수/잡격들(다중)
  reason: string[];   // 판정 사유 로그
}

export type TwelveUnseong =
  | "장생" | "목욕" | "관대" | "건록" | "제왕"
  | "쇠" | "병" | "사" | "묘" | "절" | "태" | "양";

export type TenGodOrUnseong = TenGodSubtype | TwelveUnseong;
