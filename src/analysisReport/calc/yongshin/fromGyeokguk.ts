// features/AnalysisReport/calc/yongshin/fromGyeokguk.ts
import type { GyeokgukInner } from "@/analysisReport/calc/logic/gyeokguk/types";
import { PRODUCES, PRODUCED_BY, CONTROLS, CONTROLLED_BY } from "@/analysisReport/calc/logic/gyeokguk/gyeokgukYongshin";
import type { Element } from "@/analysisReport/calc/utils/types";
import type { YongshinItem } from "./multi";

function stemToElement(stem: string): Element | null {
  switch (stem) {
    case "갑":
    case "을":
    case "甲":
    case "乙":
      return "목";
    case "병":
    case "정":
    case "丙":
    case "丁":
      return "화";
    case "무":
    case "기":
    case "戊":
    case "己":
      return "토";
    case "경":
    case "신":
    case "庚":
    case "辛":
      return "금";
    case "임":
    case "계":
    case "壬":
    case "癸":
      return "수";
    default:
      return null;
  }
}

type TenGroup = "비겁" | "식상" | "재성" | "관성" | "인성";

function naegyeokLabelToGroup(label: string): TenGroup | null {
  const s = (label ?? "").trim();
  if (!s || s === "-") return null;

  if (s.includes("식신격")) return "식상";
  if (s.includes("상관격")) return "식상";
  if (s.includes("정재격")) return "재성";
  if (s.includes("편재격")) return "재성";
  if (s.includes("정관격")) return "관성";
  if (s.includes("편관격") || s.includes("칠살")) return "관성";
  if (s.includes("정인격")) return "인성";
  if (s.includes("편인격")) return "인성";

  // 예외 내격(건록/양인/월지겁재)은 일단 비겁으로 취급(보조)
  if (s.includes("건록격")) return "비겁";
  if (s.includes("양인격")) return "비겁";
  if (s.includes("월지겁재격")) return "비겁";

  return null;
}

function groupToElement(dayEl: Element, g: TenGroup): Element {
  switch (g) {
    case "비겁":
      return dayEl;
    case "식상":
      return PRODUCES[dayEl];
    case "재성":
      return CONTROLS[dayEl];
    case "관성":
      return CONTROLLED_BY[dayEl];
    case "인성":
      return PRODUCED_BY[dayEl];
  }
}

function upsert(
  map: Map<Element, YongshinItem>,
  el: Element,
  score: number,
  reason: string
) {
  const ex = map.get(el);
  if (!ex) {
    map.set(el, { element: el, elNorm: el, score, reasons: [reason] });
    return;
  }
  ex.score = Math.max(ex.score, score);
  if (!ex.reasons.includes(reason)) ex.reasons = [...ex.reasons, reason];
}

export function buildGyeokgukYongshinList(inner: GyeokgukInner, dayStem: string): YongshinItem[] {
  const map = new Map<Element, YongshinItem>();

  const dayEl = stemToElement(dayStem);

  // 1) 내격(십신격) → 오행
  const g = dayEl ? naegyeokLabelToGroup(inner.내격) : null;
  if (dayEl && g) {
    const el = groupToElement(dayEl, g);
    upsert(map, el, 92, `내격 ${inner.내격} → ${g} 오행(${el})`);
  }

  // 2) 진신(표시상 당령이 없으면 월령이 들어가도록 resolver에서 처리됨)
  const jinEl = stemToElement(inner.진신);
  if (jinEl) {
    const boost = inner.당령 && inner.당령 !== "-" ? 6 : 0;
    upsert(map, jinEl, 86 + boost, `진신 ${inner.진신} → 오행(${jinEl})`);
  }

  // 3) 가신(보조)
  const gaEl = stemToElement(inner.가신);
  if (gaEl) {
    upsert(map, gaEl, 70, `가신 ${inner.가신} → 오행(${gaEl})`);
  }

  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}
