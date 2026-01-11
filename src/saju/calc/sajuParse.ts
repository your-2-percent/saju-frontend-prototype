import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/ganji/common";
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import { isUnknownTime } from "./sajuFormat";
import { normalizeDayBoundaryRule } from "./sajuRules";
import type { Parsed } from "./sajuTypes";

const isValidDate = (d: unknown): d is Date => d instanceof Date && !Number.isNaN(d.getTime());

export function parseMyeongSik(data: MyeongSik, useDST: boolean): Parsed {
  const unknown = isUnknownTime(data.birthTime);

  let y = Number(data.birthDay?.slice(0, 4) ?? 2000);
  let m = Number(data.birthDay?.slice(4, 6) ?? 1);
  let d = Number(data.birthDay?.slice(6, 8) ?? 1);

  if (data.calendarType === "lunar") {
    const solar = lunarToSolarStrict(y, m, d);
    y = solar.getFullYear();
    m = solar.getMonth() + 1;
    d = solar.getDate();
  }

  const hh = unknown ? 4 : Number(data.birthTime?.slice(0, 2) ?? 4);
  const mi = unknown ? 30 : Number(data.birthTime?.slice(2, 4) ?? 30);
  const rawBirth = new Date(y, m - 1, d, hh, mi, 0, 0);

  const isUnknownPlace =
    !data.birthPlace || data.birthPlace.name === "모름" || !data.birthPlace.lon;
  const lonVal = isUnknownPlace ? 127.5 : data.birthPlace!.lon!;

  const hasCorrected = isValidDate(data.corrected);
  let corrected0: Date;
  if (hasCorrected) {
    corrected0 = data.corrected;
  } else if (isUnknownPlace) {
    corrected0 = rawBirth;
  } else {
    corrected0 = getCorrectedDate(rawBirth, lonVal, unknown);
  }

  const corrected = useDST
    ? new Date(corrected0.getTime() - 60 * 60 * 1000)
    : corrected0;

  const hourRule: DayBoundaryRule = normalizeDayBoundaryRule(data.mingSikType);

  const yGZ = getYearGanZhi(corrected, lonVal);
  const mGZ = getMonthGanZhi(corrected, lonVal);
  const dGZ = getDayGanZhi(corrected, hourRule);
  const hGZ = unknown ? null : getHourGanZhi(corrected, hourRule);

  return {
    corrected,
    year: { stem: yGZ.charAt(0), branch: yGZ.charAt(1) },
    month: { stem: mGZ.charAt(0), branch: mGZ.charAt(1) },
    day: { stem: dGZ.charAt(0), branch: dGZ.charAt(1) },
    hour: hGZ ? { stem: hGZ.charAt(0), branch: hGZ.charAt(1) } : null,
  };
}
