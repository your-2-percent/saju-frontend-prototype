// features/AnalysisReport/logic/gyeokguk/gyeokgukYongshin.ts
import type { Element, GyeokgukInner, TenGodSubtype } from "./types";

export type GyeokgukYongshinCandidate = {
  element: Element;
  score: number;
  reasons: string[];
};

// --- 오행 상생/상극 ---
const PRODUCES: Record<Element, Element> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

const PRODUCED_BY: Record<Element, Element> = {
  목: "수",
  화: "목",
  토: "화",
  금: "토",
  수: "금",
};

const CONTROLS: Record<Element, Element> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

const CONTROLLED_BY: Record<Element, Element> = {
  목: "금",
  화: "수",
  토: "목",
  금: "화",
  수: "토",
};

// --- 천간 -> 오행 (한글/한자 둘 다 커버) ---
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

function parseNaegyeokToTenGodSub(naegyeokLabel: string): TenGodSubtype | null {
  const s = (naegyeokLabel || "").trim();
  if (!s || s === "-") return null;

  if (s.includes("식신격")) return "식신";
  if (s.includes("상관격")) return "상관";
  if (s.includes("정재격")) return "정재";
  if (s.includes("편재격")) return "편재";
  if (s.includes("정관격")) return "정관";
  if (s.includes("편관격") || s.includes("칠살")) return "편관";
  if (s.includes("정인격")) return "정인";
  if (s.includes("편인격")) return "편인";

  // 예외 내격(건록/양인/월지겁재)도 “격국”으로 취급은 하되
  // 엄밀한 고전 격국용신은 규칙 더 필요함. 일단 비겁으로 매핑(보조 후보).
  if (s.includes("건록격")) return "비견";
  if (s.includes("양인격")) return "비견";
  if (s.includes("월지겁재격")) return "겁재";

  return null;
}

function tenGodSubToGroup(sub: TenGodSubtype):
  | "비겁"
  | "식상"
  | "재성"
  | "관성"
  | "인성" {
  if (sub === "비견" || sub === "겁재") return "비겁";
  if (sub === "식신" || sub === "상관") return "식상";
  if (sub === "정재" || sub === "편재") return "재성";
  if (sub === "정관" || sub === "편관") return "관성";
  return "인성"; // 정인/편인
}

function groupToElement(dayEl: Element, group: "비겁" | "식상" | "재성" | "관성" | "인성"): Element {
  switch (group) {
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

export function buildGyeokgukYongshinCandidates(inner: GyeokgukInner, dayStem: string): GyeokgukYongshinCandidate[] {
  const map = new Map<Element, GyeokgukYongshinCandidate>();

  const push = (el: Element | null, score: number, reason: string) => {
    if (!el) return;
    const ex = map.get(el);
    if (!ex) {
      map.set(el, { element: el, score, reasons: [reason] });
      return;
    }
    ex.score = Math.max(ex.score, score);
    ex.reasons = ex.reasons.includes(reason) ? ex.reasons : [...ex.reasons, reason];
  };

  const dayEl = stemToElement(dayStem);

  // 1) 내격(십신격) 기반 후보
  const sub = parseNaegyeokToTenGodSub(inner.내격);
  if (dayEl && sub) {
    const group = tenGodSubToGroup(sub);
    const el = groupToElement(dayEl, group);
    push(el, 92, `내격 ${inner.내격} → ${group} 오행(${el})`);
  }

  // 2) 진신(=당령 있으면 당령, 없으면 월령) 오행 후보
  const jinEl = stemToElement(inner.진신);
  if (jinEl) {
    push(jinEl, 86, `진신 ${inner.진신} → 오행(${jinEl})`);
  }

  // 3) 가신 오행 후보(보조)
  const gaEl = stemToElement(inner.가신);
  if (gaEl) {
    push(gaEl, 70, `가신 ${inner.가신} → 오행(${gaEl})`);
  }

  // 아무것도 못 뽑으면 빈 배열
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}
