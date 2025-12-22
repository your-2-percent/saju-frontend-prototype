// shared/domain/meongsik/index.ts

import { getDayGanZhi } from "@/shared/domain/간지/공통";
import { normalizeStem } from "@/shared/domain/간지/normalize";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Stem10sin } from "@/shared/domain/간지/utils";
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import { parseBirthDayLoose, parseBirthTimeLoose } from "@/shared/lib/core/birthFields";
import { ensureSolarBirthDay } from "@/shared/domain/meongsik/ensureSolarBirthDay";

// ✅ barrel export ("@/shared/domain/meongsik"에서 re-export)
export { ensureSolarBirthDay };

export { reviveAndRecalc, computeDaewoonDir, normalizeGender } from "@/shared/domain/meongsik/derive";
export {
  buildMyeongSik,
  validateBirthDayInput,
  validateBirthTimeInput,
  validateName,
  normalizeBirthPlace,
  normalizeCalendarType,
  normalizeMingSikType,
} from "@/shared/domain/meongsik/input";

/**
 * MyeongSik → 보정된 Date
 * - birthDay: YYYYMMDD / YYYY-MM-DD
 * - birthTime: HHmm / HH:MM / '모름'
 * - lunar일 경우 양력으로 변환 후 계산
 */
export function toCorrected(ms: MyeongSik): Date {
  const solarized = ensureSolarBirthDay(ms);

  const parsedDay = parseBirthDayLoose(solarized.birthDay ?? "");
  if (!parsedDay) throw new Error(`Invalid date: ${ms.birthDay}`);

  const parsedTime = parseBirthTimeLoose(solarized.birthTime ?? "");
  const hh = !parsedTime ? 0 : parsedTime.hh;
  const mi = !parsedTime ? 0 : parsedTime.mm;

  const raw = new Date(parsedDay.y, parsedDay.m - 1, parsedDay.d, hh, mi, 0, 0);
  if (Number.isNaN(raw.getTime())) throw new Error(`Invalid date: ${ms.birthDay} ${ms.birthTime}`);

  const isUnknownPlace = !solarized.birthPlace || (typeof solarized.birthPlace === "object" && solarized.birthPlace.name === "모름");
  const lon = solarized.birthPlace?.lon ?? 127.5;
  return getCorrectedDate(raw, lon, isUnknownPlace);
}

/**
 * 일간(Stem10sin)
 * - 현재 코드베이스에서 직접 사용되는 곳은 거의 없지만, 도메인 레이어에 유지.
 */
export function toDayStem(ms: MyeongSik): Stem10sin {
  const corrected = toCorrected(ms);
  const gz = getDayGanZhi(corrected, ms.mingSikType ?? "인시");
  if (!gz) throw new Error(`getDayGanZhi returned undefined for ${corrected.toISOString()}`);

  const stem = normalizeStem(gz);
  if (!stem) throw new Error(`Invalid day stem from ${gz}`);
  return stem;
}
