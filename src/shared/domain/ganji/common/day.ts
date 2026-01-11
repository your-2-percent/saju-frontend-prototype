import type { DayBoundaryRule } from "@/shared/type";
import { 육십갑자_자시, timeRanges } from "@/shared/domain/ganji/const";
import { posMod } from "@/shared/domain/ganji/common/utils";

export const ANCHOR = {
  JDN: 2445731,
  idx: 0,
};

export function calendarGregorianToJD(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  const frac = (hour + minute / 60 + second / 3600) / 24;
  return (
    Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day +
    frac +
    B -
    1524.5
  );
}

export function getEffectiveDayOffset(dateObj: Date, rule: DayBoundaryRule): number {
  const h = dateObj.getHours();
  const min = dateObj.getMinutes();
  const totalMinutes = h * 60 + min;
  const hourBranch = getHourBranchUsingArray(dateObj);

  if (rule === "자시" && hourBranch === "자") {
    return totalMinutes >= 23 * 60 ? 1 : 0;
  }
  if (rule === "인시" && (hourBranch === "자" || hourBranch === "축")) {
    return totalMinutes < 3 * 60 ? -1 : 0;
  }

  return totalMinutes < 0 ? 0 : 0;
}

export function getDayOffsetForCalendar(dateObj: Date, rule: DayBoundaryRule): number {
  const h = dateObj.getHours();
  const totalMinutes = h * 60 + dateObj.getMinutes();

  if (rule === "자시") {
    return totalMinutes >= 23 * 60 ? 1 : 0;
  }

  if (rule === "인시") {
    return totalMinutes < 3 * 60 ? -1 : 0;
  }

  return 0;
}

export function getDayGanZhi(dateObj: Date, rule: DayBoundaryRule): string {
  const offset = getEffectiveDayOffset(dateObj, rule);

  const dt = new Date(dateObj.getTime());
  dt.setDate(dt.getDate() + offset);

  const jd = calendarGregorianToJD(
    dt.getFullYear(),
    dt.getMonth() + 1,
    dt.getDate(),
    dt.getHours(),
    dt.getMinutes()
  );
  const jdn = Math.floor(jd + 0.5);
  const idx = posMod(jdn - ANCHOR.JDN + ANCHOR.idx, 60);

  const gz = 육십갑자_자시[idx];
  if (!gz) {
    throw new Error(`getDayGanZhi: idx=${idx} out of range (jdn=${jdn}, jd=${jd})`);
  }
  return gz;
}

export function getDayGanZhiilun(date: Date, rule: DayBoundaryRule) {
  const d = new Date(date);
  const offset = getDayOffsetForCalendar(d, rule);

  const dt = new Date(date.getTime());
  dt.setDate(dt.getDate() + offset);

  const jd = calendarGregorianToJD(
    dt.getFullYear(),
    dt.getMonth() + 1,
    dt.getDate(),
    dt.getHours(),
    dt.getMinutes()
  );
  const jdn = Math.floor(jd + 0.5);
  const idx = posMod(jdn - ANCHOR.JDN + ANCHOR.idx, 60);

  const gz = 육십갑자_자시[idx];
  if (!gz) {
    throw new Error(`getDayGanZhi: idx=${idx} out of range (jdn=${jdn}, jd=${jd})`);
  }

  return gz;
}

function getHourBranchUsingArray(dateObj: Date) {
  if (!(dateObj instanceof Date)) dateObj = new Date(dateObj);

  const totalMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();

  for (let i = 0; i < timeRanges.length; i += 1) {
    const { branch, start, end } = timeRanges[i];
    if (start < end) {
      if (totalMinutes >= start && totalMinutes < end) return branch;
    } else {
      if (totalMinutes >= start || totalMinutes < end) return branch;
    }
  }
  return "자";
}
