// features/AnalysisReport/logic/gyeokguk/resolver.ts
import type { Element, GyeokgukInner, TenGodSubtype } from "./types";
import { getSolarTermBoundaries } from "@/features/myoun/calc/solarTerms";
import {
  DIST_MAP,
  KE,
  STEM_TO_ELEMENT,
  YANGIN_MAP,
  WOLGEOP_MAP,
  GEONLOK_SET,
  BRANCH_TO_TERM,
} from "./rules";
import { detectOuterGyeok } from "./evaluator";
import {
  normStemKo,
  hasSamHapWithMonth,
  isYangStem,
  mapStemToTenGodSub,
} from "./utils";
import { formatNaegyeokLabel, formatReasons, type ReasonToken } from "./formatter";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type SolarTermBoundary = { name: string; date: Date };

function toUtcDayStampByLocalYMD(d: Date): number {
  // "로컬 날짜 기준"으로만 일수 차이를 보게 강제(시간/타임존 흔들림 방지)
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

// getSolarTermBoundaries가 “입춘~다음입춘” 사이만 주기 때문에
// 생일이 입춘 이전이면 전년도 주기로 다시 구해 커버
function getBoundariesCovering(date: Date): SolarTermBoundary[] {
  let bounds = getSolarTermBoundaries(date) as SolarTermBoundary[];
  const start = bounds[0]?.date; // 보통 입춘
  if (start && date.getTime() < start.getTime()) {
    const prev = new Date(date);
    prev.setFullYear(date.getFullYear() - 1);
    bounds = getSolarTermBoundaries(prev) as SolarTermBoundary[];
  }
  return bounds;
}

function getMonthStartTermName(monthBranch: string): string | null {
  const arr = BRANCH_TO_TERM[monthBranch];
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null; // 첫 번째를 “절입(시작 절기)”로
}

// 절입 기준 “몇 일째” (절입 당일=1)
function getJeolipDayIndex(monthBranch: string, date: Date): number | null {
  const termName = getMonthStartTermName(monthBranch);
  if (!termName) return null;

  const bounds = getBoundariesCovering(date);
  const start = bounds.find((t) => t.name === termName)?.date;
  if (!start) return null;

  const diffDays =
    Math.floor(
      (toUtcDayStampByLocalYMD(date) - toUtcDayStampByLocalYMD(start)) / MS_PER_DAY
    ) + 1;

  return diffDays < 1 ? 1 : diffDays;
}

function pickByBunil(
  dist: {
    초기?: { stem: string; w: number };
    중기?: { stem: string; w: number };
    정기: { stem: string; w: number };
  },
  dayIdx: number
): { stem: string; from: "초기" | "중기" | "정기" } {
  const earlyLen = dist.초기?.w ?? 0;
  const midLen = dist.중기?.w ?? 0;

  if (dist.초기 && dayIdx <= earlyLen) {
    return { stem: dist.초기.stem, from: "초기" };
  }
  if (dist.중기 && dayIdx <= earlyLen + midLen) {
    return { stem: dist.중기.stem, from: "중기" };
  }
  return { stem: dist.정기.stem, from: "정기" };
}

export function computeNaegyeok(params: {
  dayStem: string;
  monthBranch: string;
  date: Date;
  pillars: [string, string, string, string]; // 원국 전체 (연월일시)
  emittedStems?: string[]; // 연/월/일/시 천간
  otherBranches?: string[]; // 월 제외 연/일/시 지지
  isNeutralized?: (stemKo: string) => boolean;
  mapping?: string;
  jie?: { date: string } | null; // (호환용) 지금 로직에선 미사용
}): GyeokgukInner {
  const {
    dayStem,
    monthBranch,
    date,
    pillars,
    emittedStems = [],
    otherBranches = [],
    isNeutralized,
    mapping,
  } = params;

  const tokens: ReasonToken[] = [];

  const dist0 = DIST_MAP[monthBranch];
  if (!dist0) {
    return {
      월령: "-",
      사령: "-",
      당령: "-",
      진신: "-",
      가신: "-",
      내격: "-",
      외격: [],
      reason: ["월지 분포표 없음"],
      reasonTokens: [],
    };
  }

  const dist = {
    초기: dist0.초기
      ? { stem: normStemKo(dist0.초기.stem), w: dist0.초기.w }
      : undefined,
    중기: dist0.중기
      ? { stem: normStemKo(dist0.중기.stem), w: dist0.중기.w }
      : undefined,
    정기: { stem: normStemKo(dist0.정기.stem), w: dist0.정기.w },
  };

  // ✅ 월령 = 정기 고정
  const wolryeong = dist.정기.stem;

  // ✅ 사령 = 절입 기준 분일 픽 (고지 삼합이면 중기 우선)
  let saryeong = wolryeong;
  const dayIdx = getJeolipDayIndex(monthBranch, date);

  if (
    ["진", "술", "축", "미"].includes(monthBranch) &&
    hasSamHapWithMonth(monthBranch, otherBranches) &&
    dist.중기
  ) {
    saryeong = dist.중기.stem;
    tokens.push({ kind: "GOJI_SAMHAP_USE_JUNGI" });
  } else if (dayIdx != null) {
    const picked = pickByBunil(dist, dayIdx);
    saryeong = picked.stem;
    tokens.push({ kind: "BUNIL_PICK", from: picked.from });
  } else {
    // 절입일을 못 구하면(극히 예외) 월령(정기)로 폴백
    saryeong = wolryeong;
    tokens.push({ kind: "BUNIL_FALLBACK_USE_WOLRYEONG" });
  }

  function isEmittedByStemOrElement(targetStem: string, emittedStems: string[]): boolean {
    if (!targetStem) return false;
    if (emittedStems.includes(targetStem)) return true; // 정확 투출

    const el = STEM_TO_ELEMENT[targetStem];
    if (!el) return false;

    // 같은 오행 투출 인정 (갑/을, 병/정, 무/기, 경/신, 임/계)
    return emittedStems.some((s) => STEM_TO_ELEMENT[s] === el);
  }

  // ✅ 당령 = “사령이 투출 + 무력화 아님”일 때만 인정
  let dangryeong = "";
  if (saryeong && isEmittedByStemOrElement(saryeong, emittedStems) && !isNeutralized?.(saryeong)) {
    dangryeong = saryeong;
    tokens.push({ kind: "DANRYEONG_CONFIRMED_BY_EMIT" });
  } else if (saryeong && isNeutralized?.(saryeong)) {
    tokens.push({ kind: "NEUTRALIZED" });
  }

  // ✅ 진신 = 당령 있으면 당령, 없으면 사령(표시용)
  const jinshin = dangryeong || wolryeong;

  // 가신: 진신을 극하면서 음양 동일
  let gasin = "";
  const jinEl = STEM_TO_ELEMENT[jinshin];
  if (jinEl) {
    // KE[x] = y (x가 y를 극함) → y(=jinEl)를 극하는 x를 찾기
    const needEl = (Object.entries(KE).find(([, v]) => v === jinEl)?.[0] ??
      null) as Element | null;
    if (needEl) {
      const pick = Object.entries(STEM_TO_ELEMENT).find(
        ([s, e]) => e === needEl && isYangStem(s) === isYangStem(jinshin)
      );
      gasin = pick?.[0] ?? "";
    }
  }

  // 내격: 비견/겁재 제외(단, 예외는 별도 허용)
  let naegyeok = "-";
  const sub = mapStemToTenGodSub(dayStem, jinshin) as TenGodSubtype;

  const isGeonlok = GEONLOK_SET.some(([s, b]) => s === dayStem && b === monthBranch);
  const isYangin = isYangStem(dayStem) && YANGIN_MAP[dayStem] === monthBranch;
  const isWolgeop = !isYangStem(dayStem) && WOLGEOP_MAP[dayStem] === monthBranch;

  if (sub === "비견" || sub === "겁재") {
    if (isGeonlok) {
      naegyeok = "건록격";
      tokens.push({ kind: "EX_GEONLOK" });
    } else if (isYangin) {
      naegyeok = "양인격";
      tokens.push({ kind: "EX_YANGIN" });
    } else if (isWolgeop) {
      naegyeok = "월지겁재격";
      tokens.push({ kind: "EX_WOLGEOP" });
    } else {
      tokens.push({ kind: "EX_EXCLUDED_BIGEOP" });
    }
  } else {
    naegyeok = formatNaegyeokLabel(sub);
  }

  // 외격(특수격) 수집
  const outer = detectOuterGyeok({ pillars, dayStem, monthBranch, emittedStems, mapping });

  return {
    월령: wolryeong,
    사령: saryeong,
    당령: dangryeong || "-",
    진신: jinshin || "-",
    가신: gasin || "-",
    내격: naegyeok,
    외격: outer,
    reason: formatReasons(tokens),
    reasonTokens: tokens,
  };
}
