import { getYearGanZhi, getMonthGanZhi, getDayGanZhi } from "@/shared/domain/ganji/common";
import type { DayBoundaryRule } from "@/shared/type";
import type { HourRule, MatchRow, Pillars } from "../input/customSajuTypes";
import { TIME_WINDOWS, buildHourMap, GANJI_BRANCHES } from "./ganjiRules";

export function findMatchingDates(
  pillars: Pillars,
  hourRule: HourRule,
  dayRule: DayBoundaryRule,
  maxRows = 300
): MatchRow[] {
  if (!pillars.yearStem || !pillars.yearBranch) return [];
  if (!pillars.monthStem || !pillars.monthBranch) return [];
  if (!pillars.dayStem || !pillars.dayBranch) return [];
  if (!pillars.hourStem || !pillars.hourBranch) return [];

  const targetYear = `${pillars.yearStem}${pillars.yearBranch}`;
  const targetMonth = `${pillars.monthStem}${pillars.monthBranch}`;
  const targetDay = `${pillars.dayStem}${pillars.dayBranch}`;
  const targetHour = `${pillars.hourStem}${pillars.hourBranch}`;

  const out: MatchRow[] = [];
  const start = new Date(1900, 0, 1, 12, 0, 0);
  const end = new Date(2100, 11, 31, 12, 0, 0);

  for (let t = start.getTime(); t <= end.getTime(); t += 24 * 3600 * 1000) {
    const d = new Date(t);

    const yGZ = getYearGanZhi(d);
    if (yGZ !== targetYear) continue;

    const mGZ = getMonthGanZhi(d);
    if (mGZ !== targetMonth) continue;

    const ddGZ = getDayGanZhi(d, dayRule);
    if (ddGZ !== targetDay) continue;

    const hourMap = buildHourMap(pillars.dayStem, hourRule);
    const slots: { branch: typeof GANJI_BRANCHES[number]; time: string }[] = [];
    for (let i = 0; i < 12; i++) {
      const br = GANJI_BRANCHES[i]!;
      if (hourMap[br] === targetHour) {
        slots.push({ branch: br, time: TIME_WINDOWS[i]! });
      }
    }
    if (slots.length === 0) continue;

    out.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
      year: yGZ,
      month: mGZ,
      day: ddGZ,
      hour: targetHour,
      hourSlots: slots,
    });

    if (out.length >= maxRows) break;
  }

  return out;
}
