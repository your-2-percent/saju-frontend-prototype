import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import { normalizeGZ } from "@/analysisReport/calc/logic/relations";

import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/ganji/common";
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import type { DayBoundaryRule } from "@/shared/type";

/**
 * 만세력과 동일한 경로로 4주를 재계산한다.
 * - lunar → solar 변환
 * - 경도보정 + (사용자 UI에서 켜는) DST 대응은 상위에서 처리 가능하나,
 *   여기서는 DST 미적용(표준시) 기준으로 맞춘다. (UI에서 ON 시 -1h 보정)
 * - 시간 미상: 04:30 가정 (SajuChart와 동일)
 * - 시주 계산은 ms.mingSikType(야자시/인시) 규칙 사용
 */
export function buildNatalPillarsFromMs(ms: MyeongSik | null): Pillars4 {
  if (!ms) return ["", "", "", ""];

  // 1) 양력 기준 날짜 계산
  let y = Number(ms.birthDay?.slice(0, 4) ?? 2000);
  let m = Number(ms.birthDay?.slice(4, 6) ?? 1);
  let d = Number(ms.birthDay?.slice(6, 8) ?? 1);

  if (ms.calendarType === "lunar") {
    const solar = lunarToSolarStrict(y, m, d);
    y = solar.getFullYear();
    m = solar.getMonth() + 1;
    d = solar.getDate();
  }

  // ✅ 시각 정보: 모르면 4시 30분 기준으로 “날짜 경계”만 유지
  const unknownTime = !ms.birthTime || ms.birthTime === "모름";
  const hh = unknownTime ? 4 : Number(ms.birthTime!.slice(0, 2));
  const mi = unknownTime ? 30 : Number(ms.birthTime!.slice(2, 4));

  // 2) 표준시 기준 시간
  const raw = new Date(y, m - 1, d, hh, mi, 0, 0);

  // 3) 경도 보정
  const lon =
    !ms.birthPlace || ms.birthPlace.name === "모름" || !ms.birthPlace.lon
      ? 127.5
      : ms.birthPlace.lon;

  const corrected = getCorrectedDate(raw, lon, unknownTime);

  // 4) 시주 계산 규칙
  const rule: DayBoundaryRule = (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  // 5) 만세력 간지 계산
  const yGZ = getYearGanZhi(corrected, lon);
  const mGZ = getMonthGanZhi(corrected, lon);
  const dGZ = getDayGanZhi(corrected, rule);

  // ✅ 시주: 모르면 null로 남김 (병오 강제 X)
  const hGZ = unknownTime ? null : getHourGanZhi(corrected, rule);

  // 6) 한글 간지 정규화
  const year = normalizeGZ(yGZ);
  const month = normalizeGZ(mGZ);
  const day = normalizeGZ(dGZ);
  const hour = hGZ ? normalizeGZ(hGZ) : "";

  // ✅ 항상 4자리 배열 반환하되, 시주 모를 땐 ""로
  return [year, month, day, hour];
}

