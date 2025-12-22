import type { MyeongSik } from "@/shared/lib/storage";
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import { roundToMinute } from "@/features/myoun/calc/time";

export const rawBirthLocal = (ms: MyeongSik): Date => {
  const y = Number(ms.birthDay.slice(0, 4));
  const m = Number(ms.birthDay.slice(4, 6));
  const d = Number(ms.birthDay.slice(6, 8));
  let hh = 12;
  let mm = 0;
  if (ms.birthTime && ms.birthTime !== "모름" && /^\d{4}$/.test(ms.birthTime)) {
    hh = Number(ms.birthTime.slice(0, 2));
    mm = Number(ms.birthTime.slice(2, 4));
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0);
};

export const parseBirthLocal = (ms: MyeongSik): Date => {
  const raw = rawBirthLocal(ms);
  const isUnknownPlace =
    !ms.birthPlace ||
    (typeof ms.birthPlace === "object" && ms.birthPlace.name === "모름");
  const corrected = getCorrectedDate(raw, ms.birthPlace?.lon ?? null, isUnknownPlace);
  return roundToMinute(corrected);
};
