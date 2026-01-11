// features/AnalysisReport/logic/gyeokguk/resolver.ts
import { KoBranch } from '@/analysisReport/calc/logic/relations/groups';
import type { Element, GyeokgukInner, TenGodSubtype } from "@/analysisReport/calc/logic/gyeokguk/types";
import { getSolarTermBoundaries } from "@/features/myoun/calc/solarTerms";
import {
  KE,
  STEM_TO_ELEMENT,
  YANGIN_MAP,
  WOLGEOP_MAP,
  GEONLOK_SET,
  BRANCH_TO_TERM,
  coerceHiddenStemMode,
  getBranchDistMap,
  isBranchKey,
  type BranchDist
} from "./rules";
import { detectOuterGyeok } from "./outerEvaluator";
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
  return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
}

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
  return Array.isArray(arr) && arr.length > 0 ? arr[0] : null;
}

/**
 * 절입 기준 “몇 일째”(당일=1) + 이번 절기 구간 길이(일수)
 * - HGC처럼 가중치 합계가 100인 케이스를 위해 spanDays를 같이 구함
 */
function getJeolipInfo(monthBranch: string, date: Date): { dayIdx: number; spanDays: number } | null {
  const termName = getMonthStartTermName(monthBranch);
  if (!termName) return null;

  const bounds = getBoundariesCovering(date);
  const startIdx = bounds.findIndex((t) => t.name === termName);
  if (startIdx < 0) return null;

  const start = bounds[startIdx]?.date;
  const end = bounds[startIdx + 1]?.date; // 다음 절기(대부분 존재)
  if (!start) return null;

  const dayIdx =
    Math.floor((toUtcDayStampByLocalYMD(date) - toUtcDayStampByLocalYMD(start)) / MS_PER_DAY) + 1;

  // end가 없으면(극히 예외) 30일로 폴백
  const spanDays =
    end
      ? Math.max(
          1,
          Math.floor((toUtcDayStampByLocalYMD(end) - toUtcDayStampByLocalYMD(start)) / MS_PER_DAY)
        )
      : 30;

  return { dayIdx: dayIdx < 1 ? 1 : dayIdx, spanDays };
}

function sumW(dist: BranchDist): number {
  return (dist.초기?.w ?? 0) + (dist.중기?.w ?? 0) + dist.정기.w;
}

/**
 * ✅ dayIdx(1..spanDays)를 dist의 "가중치 스케일"(1..sumW)로 변환해서 픽
 * - classic(합계≈30)은 거의 동일하게 동작
 * - HGC(합계=100)는 일수 기반을 가중치 기반으로 매핑해서 자연스럽게 동작
 */
function pickByBunilScaled(
  dist: BranchDist,
  dayIdx: number,
  spanDays: number
): { stem: string; from: "초기" | "중기" | "정기" } {
  const total = Math.max(1, sumW(dist));
  const clampedDay = Math.max(1, Math.min(spanDays, dayIdx));

  // 1..total 범위로 매핑
  const pos = Math.max(1, Math.min(total, Math.ceil((clampedDay * total) / spanDays)));

  const earlyLen = dist.초기?.w ?? 0;
  const midLen = dist.중기?.w ?? 0;

  if (dist.초기 && pos <= earlyLen) return { stem: dist.초기.stem, from: "초기" };
  if (dist.중기 && pos <= earlyLen + midLen) return { stem: dist.중기.stem, from: "중기" };
  return { stem: dist.정기.stem, from: "정기" };
}

export function computeNaegyeok(params: {
  dayStem: string;
  monthBranch: string;
  date: Date;
  pillars: [string, string, string, string];
  emittedStems?: string[];
  otherBranches?: string[];
  isNeutralized?: (stemKo: string) => boolean;
  mapping?: string;
  jie?: { date: string } | null;
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

  // ✅ 여기서 모드 결정
  const mode = coerceHiddenStemMode(mapping);
  const distMap = getBranchDistMap(mode);

  if (!isBranchKey(monthBranch)) {
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

  const dist0 = distMap[monthBranch as KoBranch];
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

  // stem normalize
  const dist: BranchDist = {
    초기: dist0.초기 ? { stem: normStemKo(dist0.초기.stem), w: dist0.초기.w } : undefined,
    중기: dist0.중기 ? { stem: normStemKo(dist0.중기.stem), w: dist0.중기.w } : undefined,
    정기: { stem: normStemKo(dist0.정기.stem), w: dist0.정기.w },
  };

  // ✅ 월령 = 정기 고정
  const wolryeong = dist.정기.stem;

  // ✅ 사령 = 절입 기준 분일 픽 (고지 삼합이면 중기 우선)
  let saryeong = wolryeong;
  const jeolip = getJeolipInfo(monthBranch, date);

  if (
    ["진", "술", "축", "미"].includes(monthBranch) &&
    hasSamHapWithMonth(monthBranch, otherBranches) &&
    dist.중기
  ) {
    saryeong = dist.중기.stem;
    tokens.push({ kind: "GOJI_SAMHAP_USE_JUNGI" });
  } else if (jeolip) {
    const picked = pickByBunilScaled(dist, jeolip.dayIdx, jeolip.spanDays);
    saryeong = picked.stem;
    tokens.push({ kind: "BUNIL_PICK", from: picked.from });
  } else {
    saryeong = wolryeong;
    tokens.push({ kind: "BUNIL_FALLBACK_USE_WOLRYEONG" });
  }

  function isEmittedByStemOrElement(targetStem: string, emitted: string[]): boolean {
    if (!targetStem) return false;
    if (emitted.includes(targetStem)) return true;

    const el = STEM_TO_ELEMENT[targetStem];
    if (!el) return false;
    return emitted.some((s) => STEM_TO_ELEMENT[s] === el);
  }

  // ✅ 당령 = “사령이 투출 + 무력화 아님”일 때만 인정
  let dangryeong = "";
  if (saryeong && isEmittedByStemOrElement(saryeong, emittedStems) && !isNeutralized?.(saryeong)) {
    dangryeong = saryeong;
    tokens.push({ kind: "DANRYEONG_CONFIRMED_BY_EMIT" });
  } else if (saryeong && isNeutralized?.(saryeong)) {
    tokens.push({ kind: "NEUTRALIZED" });
  }

  // ✅ 진신 = 당령 있으면 당령, 없으면 월령(표시용)
  const jinshin = dangryeong || wolryeong;

  // 가신: 진신을 극하면서 음양 동일
  let gasin = "";
  const jinEl = STEM_TO_ELEMENT[jinshin];
  if (jinEl) {
    const needEl = (Object.entries(KE).find(([, v]) => v === jinEl)?.[0] ?? null) as Element | null;
    if (needEl) {
      const pick = Object.entries(STEM_TO_ELEMENT).find(
        ([s, e]) => e === needEl && isYangStem(s) === isYangStem(jinshin)
      );
      gasin = pick?.[0] ?? "";
    }
  }

  // 내격: 비견/겁재 제외(단, 예외 허용)
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

  // 외격(특수격) 수집 (mapping 전달 유지)
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
