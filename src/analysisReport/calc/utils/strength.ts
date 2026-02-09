// features/AnalysisReport/strength.ts
import type { Element, TenGod } from "./types";
import { STEM_H2K, BRANCH_H2K } from "@/shared/domain/ganji/const";
import { BRANCH_MAIN_ELEMENT } from "./hiddenStem";

/**
 * Day Stem → Element
 */
export const STEM_TO_ELEMENT: Record<string, Element> = {
  갑: "목", 을: "목",
  병: "화", 정: "화",
  무: "토", 기: "토",
  경: "금", 신: "금",
  임: "수", 계: "수",
};

/** 생/극 관계 */
const SHENG_NEXT: Record<Element, Element> = {
  목: "화", 화: "토", 토: "금", 금: "수", 수: "목",
};
const SHENG_PREV: Record<Element, Element> = {
  화: "목", 토: "화", 금: "토", 수: "금", 목: "수",
};
const KE: Record<Element, Element> = {
  목: "토", 화: "금", 토: "수", 금: "목", 수: "화",
};
// 관성(= 나를 극하는 오행)
const KE_INV: Record<Element, Element> = {
  목: "금", 화: "수", 토: "목", 금: "화", 수: "토",
};

const ZERO_ELEM: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
const ZERO_TG: Record<TenGod, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };

/* ────────────── 한자→한글 보정 ────────────── */
const toKoStem = (ch: string) => STEM_H2K[ch] ?? ch;
const toKoBranch = (ch: string) => BRANCH_H2K[ch] ?? ch;
function toKoGZ(raw: string): string {
  if (!raw || raw.length < 2) return "";
  return `${toKoStem(raw[0]!)}` + `${toKoBranch(raw[1]!)}`;
}
const gzStem = (gz: string) => (gz && gz.length >= 1 ? gz[0]! : "");
const gzBranch = (gz: string) => (gz && gz.length >= 2 ? gz[1]! : "");

/* =========================
 * 기존: 간단한 오행 강약(임시 규칙)
 * ========================= */
export function computeElementStrength(pillars: string[]): Record<Element, number> {
  const base: Record<Element, number> = { ...ZERO_ELEM };
  for (const gz of pillars) {
    if (!gz || gz.length < 1) continue;
    const stem = gz.charAt(0);
    const el = STEM_TO_ELEMENT[stem as keyof typeof STEM_TO_ELEMENT];
    if (el) base[el] += 10; // 임시 가중치
  }
  return base;
}

export function computeTenGodStrength(pillars: string[]): Record<TenGod, number> {
  if (!pillars || pillars.length < 3 || !pillars[2] || pillars[2].length < 1) {
    return { ...ZERO_TG };
  }
  const dayStem = pillars[2].charAt(0);
  const dayEl = STEM_TO_ELEMENT[dayStem as keyof typeof STEM_TO_ELEMENT];
  if (!dayEl) return { ...ZERO_TG };

  const elemScore = computeElementStrength(pillars);
  const acc: Record<TenGod, number> = { ...ZERO_TG };

  (Object.entries(elemScore) as Array<[Element, number]>).forEach(([el, v]) => {
    if (v === 0) return;
    if (el === dayEl) {
      acc.비겁 += v;
    } else if (SHENG_NEXT[dayEl] === el) {
      acc.식상 += v;
    } else if (SHENG_PREV[dayEl] === el) {
      acc.인성 += v;
    } else if (KE[dayEl] === el) {
      acc.재성 += v;
    } else if (KE[el] === dayEl) {
      acc.관성 += v;
    } else {
      acc.비겁 += v;
    }
  });

  return acc;
}

export function computeStrengths(pillars: string[]): {
  elements: Record<Element, number>;
  tenGods: Record<TenGod, number>;
} {
  const elements = computeElementStrength(pillars);
  const tenGods = computeTenGodStrength(pillars);
  return { elements, tenGods };
}

/* =========================
 * 득령/득지/득세 계산 (모드 분리)
 * ========================= */

export type CriteriaMode = "classic" | "modern";
export type DeukFlag = { 령: boolean; 지: boolean; 세: boolean };
export type DeukFlags = Record<TenGod, DeukFlag>;

/** 분류별 대표 오행(일간 기준) */
export function getCategoryElementMap(dayEl: Element): Record<TenGod, Element> {
  return {
    비겁: dayEl,
    식상: SHENG_NEXT[dayEl],
    인성: SHENG_PREV[dayEl],
    재성: KE[dayEl],
    관성: KE_INV[dayEl],
  };
}


// ▼ 여기부터 함수 본문만 교체
function isDeukJiByDayBranch(dayBranch: string | undefined, el: Element): boolean {
  if (!dayBranch) return false;
  const dayEl = BRANCH_MAIN_ELEMENT[dayBranch];
  return !!dayEl && dayEl === el;
}

function isDeukSe(elementScoreRaw: Record<Element, number>, el: Element): boolean {
  const total = Object.values(elementScoreRaw).reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return false;
  const v = Math.max(0, elementScoreRaw[el] ?? 0);
  const pct = (v / total) * 100;
  return pct >= 30;
}

/**
 * 득령/득지/득세 계산
 */
export function computeDeukFlags(
  pillars: string[],
  elementScoreRaw: Record<Element, number>
): { flags: DeukFlags; monthBranch: string; dayEl: Element } {
  const ko = (pillars ?? []).slice(0, 4).map(toKoGZ);
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
      dayEl: "목",
    };
  }

  const dayS = gzStem(ko[2]!);
  const dayEl: Element =
    dayS === "갑" || dayS === "을" ? "목" :
    dayS === "병" || dayS === "정" ? "화" :
    dayS === "무" || dayS === "기" ? "토" :
    dayS === "경" || dayS === "신" ? "금" : "수";

  const brs = ko.map(gz => gzBranch(gz));
  const flags: DeukFlags = {
    비겁:{령:false,지:false,세:false},
    식상:{령:false,지:false,세:false},
    재성:{령:false,지:false,세:false},
    관성:{령:false,지:false,세:false},
    인성:{령:false,지:false,세:false},
  };

  const monthB = brs[1]!;
  const monthEl = BRANCH_MAIN_ELEMENT[monthB];

  // ── 득령/득지/득세: 분류별 오행 기준으로 판단
  const catEl = getCategoryElementMap(dayEl);
  const dayBranch = brs[2];
  (Object.keys(flags) as TenGod[]).forEach((k) => {
    const el = catEl[k];
    if (monthEl && monthEl === el) flags[k].령 = true;
    if (isDeukJiByDayBranch(dayBranch, el)) flags[k].지 = true;
    flags[k].세 = isDeukSe(elementScoreRaw, el);
  });

  return { flags, monthBranch: monthB, dayEl };
}

export type DeukFlagsSub = {
  령: boolean;
  지: boolean;
  세: boolean;
};

export type DeukFlags10 = {
  비견: DeukFlagsSub;
  겁재: DeukFlagsSub;
  식신: DeukFlagsSub;
  상관: DeukFlagsSub;
  정재: DeukFlagsSub;
  편재: DeukFlagsSub;
  정관: DeukFlagsSub;
  편관: DeukFlagsSub;
  정인: DeukFlagsSub;
  편인: DeukFlagsSub;
};

export function computeDeukFlags10(
  pillars: string[],
  elementScoreRaw: Record<Element, number>
): { flags: DeukFlags10; monthBranch: string; dayEl: Element } {
  const ko = (pillars ?? []).slice(0, 4).map(toKoGZ);
  if (ko.length < 3 || ko[0].length < 2 || ko[1].length < 2 || ko[2].length < 2) {
    const empty: DeukFlagsSub = { 령: false, 지: false, 세: false };
    return {
      flags: {
        비견: { ...empty }, 겁재: { ...empty },
        식신: { ...empty }, 상관: { ...empty },
        정재: { ...empty }, 편재: { ...empty },
        정관: { ...empty }, 편관: { ...empty },
        정인: { ...empty }, 편인: { ...empty },
      },
      monthBranch: "",
      dayEl: "목",
    };
  }

  const dayS = gzStem(ko[2]!);
  const dayEl: Element =
    dayS === "갑" || dayS === "을" ? "목" :
    dayS === "병" || dayS === "정" ? "화" :
    dayS === "무" || dayS === "기" ? "토" :
    dayS === "경" || dayS === "신" ? "금" : "수";

  const brs = ko.map(gz => gzBranch(gz));

  // 기본 틀
  const empty: DeukFlagsSub = { 령: false, 지: false, 세: false };
  const flags: DeukFlags10 = {
    비견:{...empty}, 겁재:{...empty},
    식신:{...empty}, 상관:{...empty},
    정재:{...empty}, 편재:{...empty},
    정관:{...empty}, 편관:{...empty},
    정인:{...empty}, 편인:{...empty},
  };

  const monthB = brs[1]!;
  const monthEl = BRANCH_MAIN_ELEMENT[monthB];
  const dayBranch = brs[2];
  const subElementMap: Record<keyof DeukFlags10, Element> = {
    비견: dayEl,
    겁재: dayEl,
    식신: SHENG_NEXT[dayEl],
    상관: SHENG_NEXT[dayEl],
    정재: KE[dayEl],
    편재: KE[dayEl],
    정관: KE_INV[dayEl],
    편관: KE_INV[dayEl],
    정인: SHENG_PREV[dayEl],
    편인: SHENG_PREV[dayEl],
  };

  (Object.keys(flags) as Array<keyof DeukFlags10>).forEach((k) => {
    const el = subElementMap[k];
    if (monthEl && monthEl === el) flags[k].령 = true;
    if (isDeukJiByDayBranch(dayBranch, el)) flags[k].지 = true;
    flags[k].세 = isDeukSe(elementScoreRaw, el);
  });

  return { flags, monthBranch: monthB, dayEl };
}

