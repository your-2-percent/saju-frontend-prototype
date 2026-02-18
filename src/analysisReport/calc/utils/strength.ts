// features/AnalysisReport/strength.ts
import type { Element, TenGod } from "./types";
import { STEM_H2K, BRANCH_H2K } from "@/shared/domain/ganji/const";
import { BRANCH_HIDDEN_STEMS_HGC, BRANCH_MAIN_ELEMENT } from "./hiddenStem";

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

const DEUKSE_PCT_THRESHOLD = 30;
const DEUKSE_NEAR_PCT_THRESHOLD = 24;
const STEM_SUPPORT_WEIGHTS = [0.8, 1.35, 1.25, 0.8] as const;         // 년/월/일/시 천간
const BRANCH_MAIN_SUPPORT_WEIGHTS = [0.85, 1.6, 1.4, 1.05] as const;  // 년/월/일/시 지지 본기
const BRANCH_HIDDEN_SUPPORT_WEIGHTS = [0.55, 1.05, 0.95, 0.7] as const; // 년/월/일/시 지장간
const HIDDEN_ROOT_MIN_RATIO = 0.2;
const YANG_STEMS = new Set(["갑", "병", "무", "경", "임"]);

type TenGodSub =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

const ALLY_SUBS = new Set<TenGodSub>(["비견", "겁재", "정인", "편인"]);
const ENEMY_SUBS = new Set<TenGodSub>(["정재", "편재", "정관", "편관"]);

type StructuralSupport = {
  supportScore: number;
  stemHits: number;
  branchHits: number;
  coreHits: number;
};

type DayMasterDeukSeContext = {
  dayStem: string;
  dayEl: Element;
  dayPct: number;
  allyPct: number;           // 비겁+인성
  enemyPct: number;          // 재성+관성
  allyScore: number;         // 구조 가중치 합산
  enemyScore: number;        // 구조 가중치 합산
  allyRepeatCount: number;   // 비겁/인성 반복 출현량
  sameYinYangPeerCount: number; // 비견(동음양) 반복
  sameYinYangPeerScore: number;
  geobScore: number;         // 겁재 가중치
  monthSupport: boolean;     // 월령 보조(일간 또는 인성)
  deukJi: boolean;           // 일지 통근(엄격)
  monthTonggeun: boolean;    // 월지 통근
  rootCount: number;         // 4지지 중 통근 지지 수
  stableBody: boolean;       // 과다/허약 회피
  allyDominant: boolean;     // 아군 > 적군
};

function isYangStem(stem: string): boolean {
  return YANG_STEMS.has(stem);
}

function clampRatio(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function getHiddenStems(branch: string): Array<{ stem: string; ratio: number; main?: boolean }> {
  const list = BRANCH_HIDDEN_STEMS_HGC[branch] ?? [];
  return Array.isArray(list) ? list : [];
}

function mapStemToTenGodSub(dayStem: string, targetStem: string): TenGodSub {
  const dEl = STEM_TO_ELEMENT[dayStem as keyof typeof STEM_TO_ELEMENT];
  const tEl = STEM_TO_ELEMENT[targetStem as keyof typeof STEM_TO_ELEMENT];
  if (!dEl || !tEl) return "비견";

  const sameYinYang = isYangStem(dayStem) === isYangStem(targetStem);

  if (tEl === dEl) return sameYinYang ? "비견" : "겁재";
  if (tEl === SHENG_NEXT[dEl]) return sameYinYang ? "식신" : "상관";
  if (tEl === SHENG_PREV[dEl]) return sameYinYang ? "편인" : "정인";
  if (tEl === KE[dEl]) return sameYinYang ? "편재" : "정재";
  if (tEl === KE_INV[dEl]) return sameYinYang ? "편관" : "정관";
  return sameYinYang ? "비견" : "겁재";
}

function toPctMap(elementScoreRaw: Record<Element, number>): Record<Element, number> {
  const total = Object.values(elementScoreRaw).reduce((a, b) => a + Math.max(0, b), 0);
  if (total <= 0) return { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  return {
    목: ((Math.max(0, elementScoreRaw.목 ?? 0) / total) * 100),
    화: ((Math.max(0, elementScoreRaw.화 ?? 0) / total) * 100),
    토: ((Math.max(0, elementScoreRaw.토 ?? 0) / total) * 100),
    금: ((Math.max(0, elementScoreRaw.금 ?? 0) / total) * 100),
    수: ((Math.max(0, elementScoreRaw.수 ?? 0) / total) * 100),
  };
}

function getStructuralSupportForDeukSe(
  pillarsKo: string[],
  el: Element
): StructuralSupport {
  let supportScore = 0;
  let stemHits = 0;
  let branchHits = 0;
  let coreHits = 0; // 월/일 기둥 점유

  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i];
    if (!gz || gz.length < 2) continue;

    const stem = gzStem(gz);
    const branch = gzBranch(gz);

    const stemEl = STEM_TO_ELEMENT[stem as keyof typeof STEM_TO_ELEMENT];
    if (stemEl === el) {
      stemHits += 1;
      supportScore += STEM_SUPPORT_WEIGHTS[i] ?? 0;
      if (i === 1 || i === 2) coreHits += 1;
    }

    let branchMatched = false;

    const branchMainEl = BRANCH_MAIN_ELEMENT[branch];
    if (branchMainEl === el) {
      branchMatched = true;
      supportScore += BRANCH_MAIN_SUPPORT_WEIGHTS[i] ?? 0;
    }

    const hidden = getHiddenStems(branch);
    for (const hs of hidden) {
      const hsEl = STEM_TO_ELEMENT[hs.stem as keyof typeof STEM_TO_ELEMENT];
      if (hsEl !== el) continue;
      const ratio = clampRatio(hs.ratio);
      if (ratio < HIDDEN_ROOT_MIN_RATIO) continue;
      branchMatched = true;
      supportScore += (BRANCH_HIDDEN_SUPPORT_WEIGHTS[i] ?? 0) * ratio;
    }

    if (branchMatched) {
      branchHits += 1;
      if (i === 1 || i === 2) coreHits += 1;
    }
  }

  return { supportScore, stemHits, branchHits, coreHits };
}

function buildDayMasterDeukSeContext(
  pillarsKo: string[],
  elementScoreRaw: Record<Element, number>,
  dayStem: string,
  dayEl: Element
): DayMasterDeukSeContext {
  const pct = toPctMap(elementScoreRaw);
  const resourceEl = SHENG_PREV[dayEl];
  const wealthEl = KE[dayEl];
  const officerEl = KE_INV[dayEl];

  const monthBranch = gzBranch(pillarsKo[1] ?? "");
  const monthEl = BRANCH_MAIN_ELEMENT[monthBranch] ?? null;
  const monthHidden = getHiddenStems(monthBranch);

  const dayBranch = gzBranch(pillarsKo[2] ?? "");
  const dayMainEl = BRANCH_MAIN_ELEMENT[dayBranch];
  const dayHidden = getHiddenStems(dayBranch);

  const monthSupport = monthEl === dayEl || monthEl === resourceEl;
  const deukJi =
    dayMainEl === dayEl ||
    dayHidden.some((hs) => {
      const hsEl = STEM_TO_ELEMENT[hs.stem as keyof typeof STEM_TO_ELEMENT];
      return hsEl === dayEl && clampRatio(hs.ratio) >= HIDDEN_ROOT_MIN_RATIO;
    });
  const monthTonggeun = monthHidden.some((hs) => {
    const hsEl = STEM_TO_ELEMENT[hs.stem as keyof typeof STEM_TO_ELEMENT];
    return hsEl === dayEl && clampRatio(hs.ratio) >= HIDDEN_ROOT_MIN_RATIO;
  });

  let allyScore = 0;
  let enemyScore = 0;
  let allyRepeatCount = 0;
  let sameYinYangPeerCount = 0;
  let sameYinYangPeerScore = 0;
  let geobScore = 0;
  let rootScore = 0;
  const rootedBranches = new Set<number>();

  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i];
    if (!gz || gz.length < 2) continue;

    const stem = gzStem(gz);
    const branch = gzBranch(gz);
    const stemWeight = STEM_SUPPORT_WEIGHTS[i] ?? 0;
    const branchMainWeight = BRANCH_MAIN_SUPPORT_WEIGHTS[i] ?? 0;
    const hiddenWeightBase = BRANCH_HIDDEN_SUPPORT_WEIGHTS[i] ?? 0;

    if (STEM_TO_ELEMENT[stem as keyof typeof STEM_TO_ELEMENT]) {
      const sub = mapStemToTenGodSub(dayStem, stem);
      if (ALLY_SUBS.has(sub)) {
        allyScore += stemWeight;
        allyRepeatCount += 1;
      }
      if (ENEMY_SUBS.has(sub)) enemyScore += stemWeight;
      if (sub === "비견") {
        sameYinYangPeerCount += 1;
        sameYinYangPeerScore += stemWeight;
      }
      if (sub === "겁재") geobScore += stemWeight;
    }

    const hidden = getHiddenStems(branch);
    const mainHidden = hidden.find((hs) => hs.main) ?? hidden[0];
    if (mainHidden?.stem && STEM_TO_ELEMENT[mainHidden.stem as keyof typeof STEM_TO_ELEMENT]) {
      const mainSub = mapStemToTenGodSub(dayStem, mainHidden.stem);
      if (ALLY_SUBS.has(mainSub)) {
        allyScore += branchMainWeight;
        allyRepeatCount += 1;
      }
      if (ENEMY_SUBS.has(mainSub)) enemyScore += branchMainWeight;
      if (mainSub === "비견") {
        sameYinYangPeerCount += 1;
        sameYinYangPeerScore += branchMainWeight;
      }
      if (mainSub === "겁재") geobScore += branchMainWeight;
    }

    let rootedHere = BRANCH_MAIN_ELEMENT[branch] === dayEl;
    if (rootedHere) rootScore += branchMainWeight;

    for (const hs of hidden) {
      if (!hs?.stem) continue;
      const hsEl = STEM_TO_ELEMENT[hs.stem as keyof typeof STEM_TO_ELEMENT];
      if (!hsEl) continue;
      const ratio = clampRatio(hs.ratio);
      if (ratio <= 0) continue;

      if (hsEl === dayEl && ratio >= HIDDEN_ROOT_MIN_RATIO) {
        rootedHere = true;
        rootScore += hiddenWeightBase * ratio;
      }

      const hiddenSub = mapStemToTenGodSub(dayStem, hs.stem);
      const weighted = hiddenWeightBase * ratio * 0.85;
      if (weighted <= 0) continue;

      if (ALLY_SUBS.has(hiddenSub)) {
        allyScore += weighted;
        if (ratio >= 0.35) allyRepeatCount += 1;
      }
      if (ENEMY_SUBS.has(hiddenSub)) enemyScore += weighted;

      if (hiddenSub === "비견") {
        sameYinYangPeerScore += weighted;
        if (ratio >= 0.55) sameYinYangPeerCount += 1;
      }
      if (hiddenSub === "겁재") geobScore += weighted;
    }

    if (rootedHere) rootedBranches.add(i);
  }

  const dayPct = pct[dayEl];
  const allyPct = dayPct + pct[resourceEl];
  const enemyPct = pct[wealthEl] + pct[officerEl];
  const stableBody = dayPct >= 14 && dayPct <= 58 && allyPct >= 32 && allyPct <= 78;
  const allyDominant = allyScore >= enemyScore + 0.8 || allyPct >= enemyPct + 6;

  return {
    dayStem,
    dayEl,
    dayPct,
    allyPct,
    enemyPct,
    allyScore,
    enemyScore,
    allyRepeatCount,
    sameYinYangPeerCount,
    sameYinYangPeerScore,
    geobScore,
    monthSupport,
    deukJi,
    monthTonggeun,
    rootCount: rootedBranches.size,
    stableBody,
    allyDominant,
  };
}

function isDayMasterDeukSe(ctx: DayMasterDeukSeContext): boolean {
  if (ctx.dayPct >= DEUKSE_PCT_THRESHOLD) return true;

  const peerStacked = ctx.sameYinYangPeerCount >= 2 || ctx.sameYinYangPeerScore >= 2.8;
  const alliesRepeated = ctx.allyRepeatCount >= 3 || ctx.allyScore >= 4.0;
  const seasonRootArmy = ctx.monthSupport && ctx.deukJi && alliesRepeated;
  const tonggeunStable = (ctx.monthSupport || ctx.monthTonggeun) && ctx.rootCount >= 1 && ctx.stableBody;
  const midBand = ctx.dayPct >= 18 && ctx.dayPct <= 60;

  if (seasonRootArmy && ctx.allyDominant && tonggeunStable) return true;
  if (peerStacked && ctx.allyDominant && midBand && ctx.rootCount >= 1) return true;
  if (peerStacked && ctx.allyDominant && alliesRepeated && ctx.dayPct >= 20) return true;
  if (ctx.rootCount >= 2 && ctx.allyDominant && tonggeunStable && ctx.allyPct >= 35) return true;

  return false;
}

function isDeukSe(
  pillarsKo: string[],
  elementScoreRaw: Record<Element, number>,
  el: Element,
  dayCtx?: DayMasterDeukSeContext | null
): boolean {
  const pctMap = toPctMap(elementScoreRaw);
  const pct = pctMap[el] ?? 0;
  if (pct >= DEUKSE_PCT_THRESHOLD) return true;

  if (dayCtx && el === dayCtx.dayEl && isDayMasterDeukSe(dayCtx)) {
    return true;
  }

  // 퍼센트 단독 판정을 보완: 월/일 중심의 구조적 세력(천간/지지 점유)도 함께 반영
  const support = getStructuralSupportForDeukSe(pillarsKo, el);

  // 퍼센트가 근접(24%+)하면서 구조 점유가 강하면 득세 인정
  if (pct >= DEUKSE_NEAR_PCT_THRESHOLD && support.supportScore >= 3.2) return true;

  // 퍼센트가 낮아도 핵심 자리 점유가 명확하면 득세 인정
  if (support.coreHits >= 2 && support.stemHits >= 2 && support.branchHits >= 1) return true;

  // 지지/천간 쏠림이 매우 강한 경우
  if (support.supportScore >= 3.6 && (support.stemHits >= 2 || support.branchHits >= 3)) return true;

  return false;
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
  const dayCtx = buildDayMasterDeukSeContext(ko, elementScoreRaw, dayS, dayEl);

  // ── 득령/득지/득세: 분류별 오행 기준으로 판단
  const catEl = getCategoryElementMap(dayEl);
  const dayBranch = brs[2];
  (Object.keys(flags) as TenGod[]).forEach((k) => {
    const el = catEl[k];
    if (monthEl && monthEl === el) flags[k].령 = true;
    if (isDeukJiByDayBranch(dayBranch, el)) flags[k].지 = true;
    flags[k].세 = isDeukSe(ko, elementScoreRaw, el, dayCtx);
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
  const dayCtx = buildDayMasterDeukSeContext(ko, elementScoreRaw, dayS, dayEl);
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

    // 비견·겁재는 “중중/반복” 조건을 분리해 실세를 더 엄격히 반영
    if (k === "비견") {
      const baseDeukSe = isDeukSe(ko, elementScoreRaw, el, dayCtx);
      const peerStacked =
        dayCtx.sameYinYangPeerCount >= 2 || dayCtx.sameYinYangPeerScore >= 2.2;
      flags[k].세 = baseDeukSe && peerStacked;
      return;
    }
    if (k === "겁재") {
      const baseDeukSe = isDeukSe(ko, elementScoreRaw, el, dayCtx);
      const geobStacked = dayCtx.geobScore >= 1.2;
      flags[k].세 = baseDeukSe && geobStacked;
      return;
    }

    flags[k].세 = isDeukSe(ko, elementScoreRaw, el, dayCtx);
  });

  return { flags, monthBranch: monthB, dayEl };
}

