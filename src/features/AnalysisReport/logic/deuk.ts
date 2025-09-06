// features/AnalysisReport/logic/deuk.ts
import type { Element, TenGod } from "../utils/types";
import { BRANCH_MAIN_ELEMENT, BRANCH_HIDDEN_STEMS_HGC, BRANCH_HIDDEN_STEMS_CLASSIC, STEM_TO_ELEMENT } from "../utils/hiddenStem";
import { SHENG_NEXT, SHENG_PREV, KE, KE_INV } from "./relations";
import { toKoStem, toKoBranch } from "./normalize";

export type CriteriaMode = "classic" | "modern";

export type DeukFlag = { 령: boolean; 지: boolean; 세: boolean };
export type DeukFlags = Record<TenGod, DeukFlag>;

export function getCategoryElementMap(dayEl: Element): Record<TenGod, Element> {
  return {
    비겁: dayEl,
    식상: SHENG_NEXT[dayEl],
    인성: SHENG_PREV[dayEl],
    재성: KE[dayEl],
    관성: KE_INV[dayEl],
  };
}
function elementToCategory(el: Element, dayEl: Element): TenGod {
  if (el === dayEl) return "비겁";
  if (SHENG_NEXT[dayEl] === el) return "식상";
  if (SHENG_PREV[dayEl] === el) return "인성";
  if (KE[dayEl] === el) return "재성";
  if (KE[el] === dayEl) return "관성";
  return "비겁";
}
function extractStems(u: unknown): string[] {
  if (typeof u === "string") return [toKoStem(u)];
  if (Array.isArray(u)) {
    const out: string[] = [];
    for (const item of u) {
      if (typeof item === "string") out.push(toKoStem(item));
      else if (item && typeof item === "object" && "stem" in item) {
        const s = (item as { stem?: unknown }).stem;
        if (typeof s === "string") out.push(toKoStem(s));
      }
    }
    return out;
  }
  if (u && typeof u === "object") {
    const out: string[] = [];
    for (const v of Object.values(u)) out.push(...extractStems(v));
    return out;
  }
  return [];
}
function hiddenElementsOfBranch(branch: string): Element[] {
  const m1 = BRANCH_HIDDEN_STEMS_HGC as Record<string, unknown>;
  const m2 = BRANCH_HIDDEN_STEMS_CLASSIC as Record<string, unknown>;
  const raw = (m1 && m1[branch] !== undefined) ? m1[branch] : (m2 ? m2[branch] : undefined);
  const stems = extractStems(raw);
  const els: Element[] = [];
  for (const s of stems) {
    const el = STEM_TO_ELEMENT[s as keyof typeof STEM_TO_ELEMENT];
    if (el && !els.includes(el)) els.push(el);
  }
  return els;
}
const gzStem = (gz: string) => (gz && gz.length >= 1 ? toKoStem(gz[0]!) : "");
const gzBranch = (gz: string) => (gz && gz.length >= 2 ? toKoBranch(gz[1]!) : "");

export function computeDeukFlags(
  pillars: string[],
  elementScoreRaw: Record<Element, number>,
  mode: CriteriaMode = "classic"
): { flags: DeukFlags; monthBranch: string; dayEl: Element } {
  const ko = (pillars ?? []).slice(0, 4).map(gz => (gz.length>=2 ? `${toKoStem(gz[0]!)}${toKoBranch(gz[1]!)}` : ""));
  if (ko.length !== 4 || ko.some((gz) => gz.length < 2)) {
    return {
      flags: {
        비겁:{령:false,지:false,세:false},
        식상:{령:false,지:false,세:false},
        재성:{령:false,지:false,세:false},
        관성:{령:false,지:false,세:false},
        인성:{령:false,지:false,세:false},
      },
      monthBranch: "",
      dayEl: "토",
    };
  }

  const dayS = gzStem(ko[2]!);
  const dayEl: Element =
    dayS === "갑" || dayS === "을" ? "목" :
    dayS === "병" || dayS === "정" ? "화" :
    dayS === "무" || dayS === "기" ? "토" :
    dayS === "경" || dayS === "신" ? "금" : "수";

  const brs = ko.map(gzBranch);
  const flags: DeukFlags = {
    비겁:{령:false,지:false,세:false},
    식상:{령:false,지:false,세:false},
    재성:{령:false,지:false,세:false},
    관성:{령:false,지:false,세:false},
    인성:{령:false,지:false,세:false},
  };

  // 득령 (월지)
  const monthB = brs[1]!;
  if (mode === "classic") {
    const el = BRANCH_MAIN_ELEMENT[monthB];
    if (el) flags[elementToCategory(el, dayEl)].령 = true;
  } else {
    const els = hiddenElementsOfBranch(monthB);
    if (els.length === 0) {
      const el = BRANCH_MAIN_ELEMENT[monthB];
      if (el) flags[elementToCategory(el, dayEl)].령 = true;
    } else {
      for (const el of els) flags[elementToCategory(el, dayEl)].령 = true;
    }
  }

  // 득지 (연/일/시지)
  for (const i of [0,2,3] as const) {
    const b = brs[i]!;
    if (mode === "classic") {
      const el = BRANCH_MAIN_ELEMENT[b];
      if (el) flags[elementToCategory(el, dayEl)].지 = true;
    } else {
      const els = hiddenElementsOfBranch(b);
      if (els.length === 0) {
        const el = BRANCH_MAIN_ELEMENT[b];
        if (el) flags[elementToCategory(el, dayEl)].지 = true;
      } else {
        for (const el of els) flags[elementToCategory(el, dayEl)].지 = true;
      }
    }
  }

  // 득세: 대표 오행 점수 > 25
  const catMap = getCategoryElementMap(dayEl);
  (Object.entries(catMap) as [TenGod, Element][]).forEach(([cat, el]) => {
    flags[cat].세 = (elementScoreRaw[el] ?? 0) > 25;
  });

  return { flags, monthBranch: monthB, dayEl };
}
