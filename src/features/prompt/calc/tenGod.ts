import type { Element } from "@/analysisReport/calc/utils/types";
import { isYang, KE, KE_REV, SHENG_NEXT, SHENG_PREV, STEM_TO_ELEMENT } from "@/features/prompt/calc/ganjiMaps";

export type TenGodSubtype =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "정재"
  | "편재"
  | "정관"
  | "편관"
  | "정인"
  | "편인";

type TenGodMain = "비겁" | "식상" | "재성" | "관성" | "인성";

export function mapStemToTenGodSub(dayStemKo: string, targetStemKo: string): TenGodSubtype {
  const dayEl = STEM_TO_ELEMENT[dayStemKo as keyof typeof STEM_TO_ELEMENT];
  const targetEl = STEM_TO_ELEMENT[targetStemKo as keyof typeof STEM_TO_ELEMENT];
  if (!dayEl || !targetEl) return "비견";

  let main: TenGodMain;
  if (targetEl === dayEl) main = "비겁";
  else if (targetEl === SHENG_NEXT[dayEl]) main = "식상";
  else if (targetEl === KE[dayEl]) main = "재성";
  else if (targetEl === KE_REV[dayEl]) main = "관성";
  else if (targetEl === SHENG_PREV[dayEl]) main = "인성";
  else main = "비겁";

  const same = isYang(dayStemKo) === isYang(targetStemKo);
  switch (main) {
    case "비겁":
      return same ? "비견" : "겁재";
    case "식상":
      return same ? "식신" : "상관";
    case "재성":
      // 재성은 동음양이 편재, 이음양이 정재
      return same ? "편재" : "정재";
    case "관성":
      // 관성은 동음양이 편관, 이음양이 정관
      return same ? "편관" : "정관";
    case "인성":
      // 인성은 동음양이 편인, 이음양이 정인
      return same ? "편인" : "정인";
  }
}

export function elementToTenGod(dayEl: Element, targetEl: Element): string {
  if (targetEl === dayEl) return "비겁";
  if (targetEl === SHENG_NEXT[dayEl]) return "식상";
  if (targetEl === KE[dayEl]) return "재성";
  if (targetEl === KE_REV[dayEl]) return "관성";
  if (targetEl === SHENG_PREV[dayEl]) return "인성";
  return "";
}

