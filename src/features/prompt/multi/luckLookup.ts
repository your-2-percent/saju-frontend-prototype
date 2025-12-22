// features/prompt/multi/luckLookup.ts
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import { getYearGanZhi } from "@/shared/domain/간지/공통";
import type { DaewoonInfo } from "./types";

function getDaeStartDate(d: DaewoonInfo): Date {
  return new Date(d.startYear, (d.startMonth ?? 1) - 1, d.startDay ?? 1);
}

function getDaeEndDate(list: DaewoonInfo[], idx: number): Date {
  const cur = list[idx];
  const next = list[idx + 1];

  // 다음 대운 시작 시점까지 현재 대운 유효
  if (next) {
    return getDaeStartDate(next);
  }

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

/**
 * 입춘 날짜 (간단 절기 계산)
 * 정확한 절기 함수가 있으면 그걸로 대체 가능
 */
function getIpchunDate(year: number): Date {
  const solarYearMs = 31556925974.7; // 평균 태양년 ms
  const base = Date.UTC(1900, 1, 4, 7, 15, 0); // 1900-02-04 07:15(UTC) 기준
  const termIndex = 3; // 입춘

  const ms = base + (year - 1900) * solarYearMs + (termIndex * solarYearMs) / 24;
  const utc = new Date(ms);
  return new Date(utc.getTime() + 9 * 60 * 60 * 1000); // KST(+9)
}

/**
 * 월운용 세운 찾기 - 입춘/12월 교운기까지 포함
 */
export function findSeForMonthMulti(year: number, month: number): string[] {
  const results: string[] = [];

  const monthStart = new Date(year, month - 1, 15, 0, 0, 0);
  const monthEnd = new Date(year, month, 1, 15, 0, 0);

  const ipchun = getIpchunDate(year);

  const prevGZ = getYearGanZhi(new Date(year - 1, 5, 15));
  const curGZ = getYearGanZhi(new Date(year, 5, 15));
  const nextGZ = getYearGanZhi(new Date(year + 1, 5, 15));

  // 1) 입춘 기준 세운
  if (monthEnd <= ipchun) {
    // 월 전체가 입춘 이전 (보통 1월)
    if (prevGZ) {
      results.push(normalizeGZ(prevGZ));
    }
  } else if (monthStart >= ipchun) {
    // 월 전체가 입춘 이후 (3~11월, 입춘 지난 2월 일부 포함)
    if (curGZ) {
      results.push(normalizeGZ(curGZ));
    }
  } else {
    // 이 월 안에 입춘이 끼어 있음 (보통 2월)
    if (prevGZ) {
      results.push(normalizeGZ(prevGZ));
    }
    if (curGZ) {
      const norm = normalizeGZ(curGZ);
      if (!results.includes(norm)) {
        results.push(norm);
      }
    }
  }

  // 2) 12월 → 다음 해 세운까지 미리 포함
  if (month === 12 && nextGZ) {
    const norm = normalizeGZ(nextGZ);
    if (!results.includes(norm)) {
      results.push(norm);
    }
  }

  return results;
}

export function resolveSeYear(year: number, month: number): number[] {
  const ipchun = getIpchunDate(year);
  const monthStart = new Date(year, month - 1, 1);

  const years: number[] = [];

  // 1) 입춘 이전 → 전년도 세운
  if (monthStart < ipchun) {
    years.push(year - 1);
  }

  // 2) 입춘 이후 → 당해년도 세운
  if (monthStart >= ipchun) {
    years.push(year);
  }

  // 3) 12월은 다음년도 세운 포함
  if (month === 12) {
    years.push(year + 1);
  }

  return years;
}
