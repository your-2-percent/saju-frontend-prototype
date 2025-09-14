// shared/domain/meongsik.ts
import { getDayGanZhi } from "@/shared/domain/간지/공통";
import { normalizeStem } from "@/shared/domain/간지/normalize";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Stem10sin } from "@/shared/domain/간지/utils";
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";

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

  return getCorrectedDate(raw, ms.birthPlace?.lon ?? 127.5);
}

export function toDayStem(ms: MyeongSik): Stem10sin {
  const d = toCorrected(ms);
  const gz = getDayGanZhi(d, ms.mingSikType ?? "야자시");
  if (!gz) throw new Error(`getDayGanZhi returned undefined for ${d.toISOString()}`);

  const stem = normalizeStem(gz);
  if (!stem) throw new Error(`Invalid day stem from ${gz}`);
  return stem;
}

