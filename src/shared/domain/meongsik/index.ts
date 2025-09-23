// shared/domain/meongsik.ts
import { getDayGanZhi } from "@/shared/domain/간지/공통";
import { normalizeStem } from "@/shared/domain/간지/normalize";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Stem10sin } from "@/shared/domain/간지/utils";
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";

export function toCorrected(ms: MyeongSik): Date {
  // birthDay: "19961229"
  // birthTime: "1630" or "모름"
  const y = Number(ms.birthDay?.slice(0, 4));
  const m = Number(ms.birthDay?.slice(4, 6)) - 1;
  const d = Number(ms.birthDay?.slice(6, 8));
  const hh = !ms.birthTime || ms.birthTime === "모름"
    ? 0
    : Number(ms.birthTime?.slice(0, 2));
  const mi = !ms.birthTime || ms.birthTime === "모름"
    ? 0
    : Number(ms.birthTime?.slice(2, 4));

  const raw = new Date(y, m, d, hh, mi, 0, 0);
  if (isNaN(raw.getTime())) throw new Error(`Invalid date: ${ms.birthDay} ${ms.birthTime}`);
  //const isUnknownTime = !ms.birthTime || ms.birthTime === "모름";
  const isUnknownPlace = !ms.birthPlace || (typeof ms.birthPlace === "object" && ms.birthPlace.name === "모름");
  return getCorrectedDate(raw, ms.birthPlace?.lon ?? 127.5, isUnknownPlace);
}

export function toDayStem(ms: MyeongSik): Stem10sin {
  let baseDate: Date;

  if (ms.calendarType === "lunar") {
    const y = parseInt(ms.birthDay.slice(0, 4), 10);
    const m = parseInt(ms.birthDay.slice(4, 6), 10);
    const d = parseInt(ms.birthDay.slice(6, 8), 10);

    // 음력 → 양력 변환
    baseDate = lunarToSolarStrict(y, m, d);
    console.log(baseDate);
  } else {
    // solar 그대로
    baseDate = toCorrected(ms);
  }

  const gz = getDayGanZhi(baseDate, ms.mingSikType ?? "인시");
  if (!gz) throw new Error(`getDayGanZhi returned undefined for ${baseDate.toISOString()}`);

  const stem = normalizeStem(gz);
  if (!stem) throw new Error(`Invalid day stem from ${gz}`);
  return stem;
}

