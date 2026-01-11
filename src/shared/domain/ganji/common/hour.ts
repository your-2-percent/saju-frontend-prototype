import type { DayBoundaryRule } from "@/shared/type";
import { 천간, 지지, timeRanges } from "@/shared/domain/ganji/const";
import { getDayGanZhi } from "@/shared/domain/ganji/common/day";

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

function getHourStemByRule(
  dateObj: Date,
  dayStemChar: string,
  hourBranchIndex: number,
  rule: DayBoundaryRule
): string {
  const dayStemIndex = 천간.indexOf(dayStemChar);
  if (dayStemIndex < 0) return "";

  let idx = ((dayStemIndex % 5) * 2 + hourBranchIndex) % 10;

  const dateObjTime = dateObj.getHours();

  if (
    (rule === "인시" || (rule === "조자시/야자시" && dateObjTime >= 3)) &&
    (hourBranchIndex === 0 || hourBranchIndex === 1)
  ) {
    idx = (idx + 2) % 10;
  }

  return 천간[idx];
}

export function getHourGanZhi(
  dateObj: Date,
  rule: DayBoundaryRule,
  dayPillarOverride?: string
): string {
  if (!(dateObj instanceof Date)) dateObj = new Date(dateObj);

  const hourBranch = getHourBranchUsingArray(dateObj);
  const hourBranchIndex = 지지.indexOf(hourBranch);

  const dayPillar = dayPillarOverride ?? getDayGanZhi(dateObj, rule);
  const dayStem = dayPillar.charAt(0);

  const hourStemChar = getHourStemByRule(dateObj, dayStem, hourBranchIndex, rule);

  return hourStemChar + hourBranch;
}
