// features/prompt/multi/luckLookup.ts
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import { getYearGanZhi } from "@/shared/domain/간지/공통";
import type { DaewoonInfo } from "./types";
import { findSolarTermUTC } from "@/shared/domain/solar-terms";

function getDaeStartDate(d: DaewoonInfo): Date {
  return new Date(d.startYear, (d.startMonth ?? 1) - 1, d.startDay ?? 1);
}

function getDaeEndDate(list: DaewoonInfo[], idx: number): Date {
  const cur = list[idx];
  const next = list[idx + 1];

  // 다음 대운 시작 시점까지 현재 대운 유효
  if (next) return getDaeStartDate(next);

  // 마지막 대운: endYear 끝까지라고 보고 +1년 지점까지
  return new Date(cur.endYear + 1, 0, 1);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  // 반열린 구간
  return aStart < bEnd && aEnd > bStart;
}

/**
 * 주어진 "연도 구간"과 겹치는 모든 대운 반환
 * 예: 2019~2026을 넣으면, 이 구간에 걸친 대운이 2개면 2개 다 나옴
 */
export function findDaeForYearRangeMulti(
  daeList: DaewoonInfo[],
  startYear: number,
  endYear: number,
): DaewoonInfo[] {
  const rangeStart = new Date(startYear, 0, 1);
  const rangeEnd = new Date(endYear + 1, 0, 1);

  const results: DaewoonInfo[] = [];

  for (let i = 0; i < daeList.length; i++) {
    const d = daeList[i];
    const ds = getDaeStartDate(d);
    const de = getDaeEndDate(daeList, i);

    if (overlaps(ds, de, rangeStart, rangeEnd)) {
      if (!results.some((r) => r.gz === d.gz && r.startYear === d.startYear)) {
        results.push(d);
      }
    }
  }

  return results;
}

/** "특정 연도 하나"에 걸치는 대운들 (연단위 세운용) */
export function findDaeForYearMulti(daeList: DaewoonInfo[], year: number): DaewoonInfo[] {
  return findDaeForYearRangeMulti(daeList, year, year);
}

export function findDaeForMonthMulti(
  daeList: DaewoonInfo[],
  year: number,
  month: number,
): DaewoonInfo[] {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

  const results: DaewoonInfo[] = [];

  for (let i = 0; i < daeList.length; i++) {
    const d = daeList[i];
    const ds = getDaeStartDate(d);
    const de = getDaeEndDate(daeList, i);

    if (overlaps(ds, de, monthStart, monthEnd)) {
      if (!results.some((r) => r.gz === d.gz && r.startYear === d.startYear)) {
        results.push(d);
      }
    }
  }

  return results;
}

// ------------------------------
// ✅ 세운(연도+간지) 페어
// ------------------------------
export type SePair = { useYear: number; gz: string };

/**
 * 월운용 세운 찾기 (입춘 기준): 이 달이 입춘을 걸치면 2개(전년도/당해년도) 반환
 * 반환을 "연도+간지"로 묶어서 매칭 사고 방지
 */
export function findSeForMonthPairs(year: number, month: number): SePair[] {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`findSeForMonthPairs: month must be 1..12, got ${month}`);
  }

  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 1, 0, 0, 0, 0);

  const ipchun = findSolarTermUTC(year, 315);

  const out: SePair[] = [];

  const pushYear = (useYear: number) => {
    // 입춘 경계/일자 경계 흔들림 피하려고 6/15 정오 기준 고정
    const gz = getYearGanZhi(new Date(useYear, 5, 15, 12, 0, 0, 0));
    const norm = normalizeGZ(gz || "");
    if (!norm) return;

    if (!out.some((x) => x.useYear === useYear && x.gz === norm)) {
      out.push({ useYear, gz: norm });
    }
  };

  const hasIpchunInThisMonth = start < ipchun && ipchun < end;

  if (!hasIpchunInThisMonth) {
    if (end <= ipchun) pushYear(year - 1);
    else pushYear(year);
  } else {
    pushYear(year - 1);
    pushYear(year);
  }

  return out;
}

/**
 * 월운용 세운 찾기 - (기존 시그니처 유지) 간지만 반환
 * ⚠️ 연도 라벨도 같이 써야 하면 findSeForMonthPairs를 써라.
 */
export function findSeForMonthMulti(year: number, month: number): string[] {
  return findSeForMonthPairs(year, month).map((x) => x.gz);
}

/**
 * (기존) 월운에서 세운 "연도 인덱스"만 필요할 때
 */
export function resolveSeYear(year: number, month: number): number[] {
  return findSeForMonthPairs(year, month).map((x) => x.useYear);
}
