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

export function mapStemToTenGodSub(dayStemKo: string, targetStemKo: string): TenGodSubtype {
  const dayEl = STEM_TO_ELEMENT[dayStemKo as keyof typeof STEM_TO_ELEMENT];
  const targetEl = STEM_TO_ELEMENT[targetStemKo as keyof typeof STEM_TO_ELEMENT];
  if (!dayEl || !targetEl) return "비견";

  let main: TenGodSubtype;
  if (targetEl === dayEl) main = "비견";
  else if (targetEl === SHENG_NEXT[dayEl]) main = "식신";
  else if (targetEl === KE[dayEl]) main = "정재";
  else if (targetEl === KE_REV[dayEl]) main = "정관";
  else if (targetEl === SHENG_PREV[dayEl]) main = "정인";
  else main = "비견";

  const same = isYang(dayStemKo) === isYang(targetStemKo);
  switch (main) {
    case "비견":
      return same ? "비견" : "겁재";
    case "식신":
      return same ? "식신" : "상관";
    case "정재":
      return same ? "정재" : "편재";
    case "정관":
      return same ? "정관" : "편관";
    case "정인":
      return same ? "정인" : "편인";
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
