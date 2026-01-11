// shared/domain/ganji/recalcGanjiSnapshot.ts
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import { parseBirthDayLoose, parseBirthTimeLoose } from "@/shared/lib/core/birthFields";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/ganji/common";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";

/**
 * 간지/보정시 스냅샷 재계산 (원국 기준)
 * - birthDay: YYYYMMDD / YYYY-MM-DD 허용
 * - birthTime: HHmm / HH:MM 허용
 * - 음력 → 양력 변환은 현재 프로젝트 기준(lunarToSolarStrict: 윤달 미적용) 유지
 */
export function recalcGanjiSnapshot(
  ms: MyeongSik,
): Pick<MyeongSik, "corrected" | "correctedLocal" | "ganji" | "ganjiText" | "dayStem"> {
  const hourRule: DayBoundaryRule = (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  // ✅ 날짜 파싱(YYYYMMDD / YYYY-MM-DD 모두 허용)
  const parsedDay = parseBirthDayLoose(ms.birthDay ?? "");
  if (!parsedDay) {
    // 포맷이 완전히 깨진 데이터면 여기서 터지지 말고, 기존 값 유지(최대한 안전).
    const corrected = ms.corrected instanceof Date ? ms.corrected : new Date(NaN);
    const ganji = typeof ms.ganji === "string" ? ms.ganji : "";
    const ganjiText = typeof ms.ganjiText === "string" ? ms.ganjiText : ganji;
    const dayStem = typeof ms.dayStem === "string" ? ms.dayStem : "";
    return {
      corrected,
      correctedLocal: typeof ms.correctedLocal === "string" ? ms.correctedLocal : "",
      ganji,
      ganjiText,
      dayStem,
    };
  }

  let y = parsedDay.y;
  let mo = parsedDay.m;
  let d = parsedDay.d;

  // 음력 → 양력
  if (ms.calendarType === "lunar") {
    try {
      const solar = lunarToSolarStrict(y, mo, d, 0, 0);
      y = solar.getFullYear();
      mo = solar.getMonth() + 1;
      d = solar.getDate();
    } catch {
      // 변환 실패 시: 원본 유지(터지지 않게)
    }
  }

  // ✅ 시간 파싱(HHmm / HH:MM 모두 허용)
  const parsedTime = parseBirthTimeLoose(ms.birthTime ?? "");
  const unknownTime = !ms.birthTime || ms.birthTime === "모름" || !parsedTime;
  const hh = unknownTime ? 4 : parsedTime.hh;
  const mi = unknownTime ? 30 : parsedTime.mm;

  // 경도 (모름이면 127.5)
  const lon =
    !ms.birthPlace || ms.birthPlace.name === "모름" || ms.birthPlace.lon === 0 ? 127.5 : ms.birthPlace.lon;

  // 보정
  const raw = new Date(y, mo - 1, d, hh, mi, 0, 0);
  const isUnknownPlace = !ms.birthPlace || (typeof ms.birthPlace === "object" && ms.birthPlace.name === "모름");
  const corr = getCorrectedDate(raw, lon, isUnknownPlace);
  const correctedLocal = unknownTime
    ? ""
    : corr.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

  // 간지
  const yGZ = getYearGanZhi(corr, lon);
  const mGZ = getMonthGanZhi(corr, lon);
  const dGZ = getDayGanZhi(corr, hourRule);
  const hGZ = unknownTime ? null : getHourGanZhi(corr, hourRule);

  const ganjiText = [`원국 : ${yGZ}년 ${mGZ}월 ${dGZ}일`, hGZ ? `${hGZ}시` : null]
    .filter(Boolean)
    .join(" ");

  return {
    corrected: corr,
    correctedLocal,
    ganji: ganjiText,
    ganjiText,
    dayStem: dGZ.charAt(0),
  };
}
