// hooks/useDaewoonList.ts
import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { computeNatalPillars, buildWolju, parseBirthLocal } from "@/features/myoun";
import { ensureSolarBirthDay } from "@/myeongsik/calc/ensureSolarBirthDay";

export type Daewoon = { at: Date; gz: string; age: number; startYear?: number };

/** 대운리스트 생성 (첫 항목에 출생 월주 추가) */
export function useDaewoonList(
  ms: MyeongSik,
  hourTable: DayBoundaryRule = "조자시/야자시",
  untilYears = 100,
  dstOffsetMinutes = 0
): Daewoon[] {
  const base = useMemo(() => ensureSolarBirthDay(ms), [ms]);
  const birth = useMemo(
    () => parseBirthLocal(base, { dstOffsetMinutes }),
    [base, dstOffsetMinutes]
  );
  const natal = useMemo(
    () => computeNatalPillars(base, hourTable, { dstOffsetMinutes }),
    [base, hourTable, dstOffsetMinutes]
  );

  const getRawAgeYears = (b: Date, at: Date) =>
    (at.getTime() - b.getTime()) / (365.2425 * 24 * 60 * 60 * 1000);
  const normalizeBaseAge = (raw: number) => (raw < 1 ? 1 + raw : raw);

  return useMemo(() => {
    const wolju = buildWolju(birth, natal.month, base.dir, untilYears, base.birthPlace?.lon ?? 127.5);
    const natalEvent = { at: birth, gz: wolju.natalMonthPillar };

    const baseRawAge = wolju.events[0] ? getRawAgeYears(birth, wolju.events[0].at) : 0;
    const baseAge = normalizeBaseAge(baseRawAge);

    return [natalEvent, ...wolju.events].map((e, i) => {
      const age = i === 0 ? 1 : baseAge + (i - 1) * 10;
      const startYear = e.at.getFullYear();
      return {
        ...e,
        age,
        startYear,
        // age: getAge(birth, e.at) + (wolju.ageOffset ?? 0),
      };
    });
  }, [birth, natal.month, base.dir, untilYears, base.birthPlace?.lon]);
}

export function activeIndexAtOrFirst(arr: Daewoon[], ref: Date): number {
  if (!arr.length) return -1;
  const t = ref.getTime();

  let lo = 0;
  let hi = arr.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const cur = arr[mid].at.getTime();
    if (cur <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (ans === -1) return 0;
  if (ans >= arr.length) return arr.length - 1;
  return ans;
}

export function useDaewoonActive(
  ms: MyeongSik,
  ref: Date,
  hourTable: DayBoundaryRule = "조자시/야자시",
  untilYears = 100
) {
  const list = useDaewoonList(ms, hourTable, untilYears);
  const activeIndex = useMemo(() => activeIndexAtOrFirst(list, ref), [list, ref]);
  const active = activeIndex >= 0 ? list[activeIndex] : null;
  return { list, activeIndex, active };
}

export function daewoonAge(birth: Date, at: Date): number {
  const raw =
    (at.getTime() - birth.getTime()) /
    (365.2425 * 24 * 60 * 60 * 1000);
  return raw < 1 ? 1 + raw : raw;
}
