// hooks/useDaewoonList.ts
import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { computeNatalPillars, buildWolju, parseBirthLocal } from "@/features/myoun";
import { ensureSolarBirthDay } from "@/myeongsik/calc/ensureSolarBirthDay";

export type Daewoon = { at: Date; gz: string; age: number };

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

  const getAge = (b: Date, at: Date) => {
    const y = at.getFullYear() - b.getFullYear();
    const m = at.getMonth() - b.getMonth();
    const d = at.getDate() - b.getDate();
    const adjusted = m < 0 || (m === 0 && d < 0) ? y - 1 : y;
    return Math.max(0, adjusted);
  };

  return useMemo(() => {
    const wolju = buildWolju(birth, natal.month, base.dir, untilYears, base.birthPlace?.lon ?? 127.5);
    const natalEvent = { at: birth, gz: wolju.natalMonthPillar };

    return [natalEvent, ...wolju.events].map((e) => ({
      ...e,
      age: getAge(birth, e.at),
      // age: getAge(birth, e.at) + (wolju.ageOffset ?? 0),
    }));
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
  const y = at.getFullYear() - birth.getFullYear();
  const m = at.getMonth() - birth.getMonth();
  const d = at.getDate() - birth.getDate();
  const adjusted = m < 0 || (m === 0 && d < 0) ? y - 1 : y;
  return Math.max(0, adjusted);
}
