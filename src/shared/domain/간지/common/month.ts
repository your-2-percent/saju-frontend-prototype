import { findSolarTermUTC } from "@/shared/domain/solar-terms";
import { 간지_MAP } from "@/shared/domain/간지/const";
import { getYearStem } from "@/shared/domain/간지/천간";
import { getIpChunCached, resolveYearIndex } from "@/shared/domain/간지/common/ipchun";
import { isValidDate } from "@/shared/domain/간지/common/utils";

const FIRST_MONTH_STEM_BY_YEAR_STEM = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0] as const;

function getMonthBoundaries(useYear: number, lon = 127.5): Date[] {
  const raw: Date[] = new Array(12);
  raw[0] = getIpChunCached(useYear, lon);
  raw[1] = findSolarTermUTC(useYear, 345, lon);
  raw[2] = findSolarTermUTC(useYear, 15, lon);
  raw[3] = findSolarTermUTC(useYear, 45, lon);
  raw[4] = findSolarTermUTC(useYear, 75, lon);
  raw[5] = findSolarTermUTC(useYear, 105, lon);
  raw[6] = findSolarTermUTC(useYear, 135, lon);
  raw[7] = findSolarTermUTC(useYear, 165, lon);
  raw[8] = findSolarTermUTC(useYear, 195, lon);
  raw[9] = findSolarTermUTC(useYear, 225, lon);
  raw[10] = findSolarTermUTC(useYear, 255, lon);
  raw[11] = findSolarTermUTC(useYear + 1, 285, lon);

  return raw.map((d) => new Date(d.getTime() + 30 * 60 * 1000));
}

export function getMonthIndex(dateObj: Date, lon = 127.5) {
  const { useYear } = resolveYearIndex(dateObj, lon);
  const bounds = getMonthBoundaries(useYear, lon);
  let k = 0;
  for (let i = 0; i < 12; i += 1) {
    if (dateObj >= bounds[i]) k = i;
  }
  const monthIndex = k + 1;
  return { monthIndex, useYear, boundaries: bounds };
}

function resolveFirstMonthStemIdx(dateObj: Date, lon = 127.5): number {
  const yStem = getYearStem(dateObj, lon);
  const yStemIdx = 간지_MAP.천간.indexOf(yStem as typeof 간지_MAP.천간[number]);
  if (yStemIdx < 0) throw new Error(`resolveFirstMonthStemIdx: invalid year stem "${yStem}"`);
  return FIRST_MONTH_STEM_BY_YEAR_STEM[yStemIdx];
}

export function calcMonthStemIdx(dateObj: Date, monthIndex: number, lon = 127.5): number {
  const firstIdx = resolveFirstMonthStemIdx(dateObj, lon);
  return (firstIdx + (monthIndex - 1)) % 10;
}

export function getMonthGanZhi(dateObj: Date, lon = 127.5) {
  if (!isValidDate(dateObj)) return "";
  const { monthIndex } = getMonthIndex(dateObj, lon);

  const branchIdx = (2 + (monthIndex - 1)) % 12;
  const branch = 간지_MAP.지지[branchIdx];

  const stemIdx = calcMonthStemIdx(dateObj, monthIndex, lon);
  const stem = 간지_MAP.천간[stemIdx];

  return stem + branch;
}
