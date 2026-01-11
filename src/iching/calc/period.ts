// src/features/iching/lib/period.ts

import {
  addDays,
  dayGanzhiKoByGregorianDate,
  formatYMD,
  monthGanzhiKoByGregorianMonth15,
  parseYMDStrict,
  startOfToday9,
  yearGanzhiKoByGregorianYear,
  type GanzhiKo,
} from "@/iching/calc/ganzhi";
import { getMonthGanZhi, getYearGanZhi } from "@/shared/domain/ganji/common";

export type PeriodTab = "seun" | "wolun" | "ilun";

export type DateRangeYMD = {
  startYMD: string; // yyyy-mm-dd
  endYMD: string; // yyyy-mm-dd
};

export type SeunPick = {
  year: number;
  refDateYMD: string; // y-06-15
  seun: GanzhiKo;
};

export type WolunPick = {
  year: number;
  month: number; // 1..12
  refDateYMD: string; // y-mm-15
  seun: GanzhiKo; // 연간지도 같이 넣어달라고 해서 포함
  wolun: GanzhiKo;
};

export type IlunPick = {
  dateYMD: string;
  seun: GanzhiKo;
  wolun: GanzhiKo;
  ilun: GanzhiKo;
};

export type PeriodPayload = {
  tab: PeriodTab;
  baseDateYMD: string; // seed 기준(보여주기용)
  seun: SeunPick[];
  wolun: WolunPick[];
  ilun: IlunPick[];
};

function clampRangeSorted(a: Date, b: Date): { start: Date; end: Date } {
  return a.getTime() <= b.getTime() ? { start: a, end: b } : { start: b, end: a };
}

function monthKey(y: number, m1: number): number {
  return y * 100 + m1;
}

function iterMonths(start: Date, end: Date): Array<{ y: number; m1: number }> {
  const res: Array<{ y: number; m1: number }> = [];
  let y = start.getFullYear();
  let m1 = start.getMonth() + 1;
  const endKey = monthKey(end.getFullYear(), end.getMonth() + 1);

  while (monthKey(y, m1) <= endKey) {
    res.push({ y, m1 });
    m1 += 1;
    if (m1 === 13) {
      m1 = 1;
      y += 1;
    }
  }
  return res;
}

/** ✅ 세운: 시작~끝 날짜 범위에서 “연도”를 뽑고, 각 연도는 6/15로 대표 */
export function buildSeunPicks(range: DateRangeYMD, maxYears = 10): SeunPick[] {
  const s = parseYMDStrict(range.startYMD) ?? startOfToday9();
  const e = parseYMDStrict(range.endYMD) ?? startOfToday9();
  const { start, end } = clampRangeSorted(s, e);

  const ys = start.getFullYear();
  const ye = end.getFullYear();
  const picks: SeunPick[] = [];

  for (let y = ys; y <= ye; y += 1) {
    if (picks.length >= maxYears) break;
    const ref = new Date(y, 5, 15, 9, 0, 0, 0); // 6/15
    picks.push({
      year: y,
      refDateYMD: formatYMD(ref),
      seun: yearGanzhiKoByGregorianYear(y),
    });
  }
  return picks;
}

/**
 * ✅ 월운: 시작~끝 날짜 범위에서 “월”을 뽑고, 각 월은 15일로 대표
 * - 너 요청대로: 1월(절입 전이 섞이는 구간)은 기본 제외
 */
export function buildWolunPicks(range: DateRangeYMD, maxMonths = 12, excludeJanuary = false): WolunPick[] {
  const s = parseYMDStrict(range.startYMD) ?? startOfToday9();
  const e = parseYMDStrict(range.endYMD) ?? startOfToday9();
  const { start, end } = clampRangeSorted(s, e);

  const months = iterMonths(start, end);
  const picks: WolunPick[] = [];

  for (const it of months) {
    if (picks.length >= maxMonths) break;
    if (excludeJanuary && it.m1 === 1) continue;

    const ref = new Date(it.y, it.m1 - 1, 15, 9, 0, 0, 0);
    const refMid = new Date(it.y, it.m1 - 1, 15, 12, 0, 0, 0);
    const seun = getYearGanZhi(refMid) || yearGanzhiKoByGregorianYear(it.y);
    const wolun = getMonthGanZhi(refMid) || monthGanzhiKoByGregorianMonth15(it.y, it.m1);
    picks.push({
      year: it.y,
      month: it.m1,
      refDateYMD: formatYMD(ref),
      seun: seun as GanzhiKo,
      wolun: wolun as GanzhiKo,
    });
  }

  return picks;
}

/** ✅ 일운: 시작~끝 날짜 범위(기본 7일) */
export function buildIlunPicks(range: DateRangeYMD, maxDays = 7): IlunPick[] {
  const s = parseYMDStrict(range.startYMD) ?? startOfToday9();
  const e = parseYMDStrict(range.endYMD) ?? startOfToday9();
  const { start, end } = clampRangeSorted(s, e);

  const picks: IlunPick[] = [];
  let cur = new Date(start);

  while (cur.getTime() <= end.getTime()) {
    if (picks.length >= maxDays) break;
    const y = cur.getFullYear();
    const m1 = cur.getMonth() + 1;
    const mid = new Date(y, m1 - 1, cur.getDate(), 12, 0, 0, 0);
    const seun = getYearGanZhi(mid) || yearGanzhiKoByGregorianYear(y);
    const wolun = getMonthGanZhi(mid) || monthGanzhiKoByGregorianMonth15(y, m1);
    picks.push({
      dateYMD: formatYMD(cur),
      seun: seun as GanzhiKo,
      wolun: wolun as GanzhiKo,
      ilun: dayGanzhiKoByGregorianDate(cur),
    });
    cur = addDays(cur, 1);
  }

  return picks;
}

/** ✅ UI에서 “현재 탭 기준 seed 기준일”을 안정적으로 뽑아줌 */
export function deriveBaseDateForTab(tab: PeriodTab, range: DateRangeYMD): Date {
  const s = parseYMDStrict(range.startYMD) ?? startOfToday9();

  if (tab === "seun") {
    return new Date(s.getFullYear(), 5, 15, 9, 0, 0, 0); // 6/15
  }
  if (tab === "wolun") {
    const y = s.getFullYear();
    const m1 = s.getMonth() + 1;
    // 1월은 제외 규칙이 있으니, 1월이면 2월로 밀어줌(깔끔)
    return new Date(y, m1 - 1, 15, 9, 0, 0, 0);
  }
  // ilun
  return new Date(s.getFullYear(), s.getMonth(), s.getDate(), 9, 0, 0, 0);
}

export function buildPeriodPayload(tab: PeriodTab, range: DateRangeYMD): PeriodPayload {
  const base = deriveBaseDateForTab(tab, range);
  const baseYMD = formatYMD(base);

  if (tab === "seun") {
    return {
      tab,
      baseDateYMD: baseYMD,
      seun: buildSeunPicks(range, 10),
      wolun: [],
      ilun: [],
    };
  }
  if (tab === "wolun") {
    return {
      tab,
      baseDateYMD: baseYMD,
      seun: [],
      wolun: buildWolunPicks(range, 12, false),
      ilun: [],
    };
  }
  return {
    tab,
    baseDateYMD: baseYMD,
    seun: [],
    wolun: [],
    ilun: buildIlunPicks(range, 7),
  };
}
