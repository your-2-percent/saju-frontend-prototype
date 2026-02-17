// hooks/useDaewoonList.ts
import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { computeNatalPillars, buildWolju, parseBirthLocal, findPrevJie, findNextJie } from "@/features/myoun";
import { stepGZ } from "@/features/myoun/calc/ganjiCycle";
import { ensureSolarBirthDay } from "@/myeongsik/calc/ensureSolarBirthDay";
import { useSettingsStore } from "@/settings/input/useSettingsStore";

export type Daewoon = { at: Date; gz: string; age: number; startYear?: number };

const TROPICAL_YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const getRawAgeYears = (birth: Date, at: Date) =>
  (at.getTime() - birth.getTime()) / TROPICAL_YEAR_MS;

const normalizeMyounBaseAge = (raw: number) => (raw < 1 ? 1 + raw : raw);

const daySerial = (d: Date) =>
  Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / DAY_MS);

const getGeneralBaseAge = (birth: Date, dir: "forward" | "backward") => {
  try {
    const term = dir === "forward" ? findNextJie(birth) : findPrevJie(birth);
    const diffDays = Math.abs(daySerial(term) - daySerial(birth));
    // 표준기준(일수/3): 순행은 후절기 포함으로 +1일 보정
    const adjustedDays = dir === "forward" ? diffDays + 1 : diffDays;
    return adjustedDays / 3;
  } catch {
    return 0;
  }
};

const buildGeneralEvents = (
  birth: Date,
  natalMonthGz: string,
  dir: "forward" | "backward",
  untilYears: number
) => {
  const rawBaseAge = getGeneralBaseAge(birth, dir);
  // 표준기준: 대운수(세는나이) 기준으로 연도 앵커를 맞춘다.
  // 예) 대운수 7 => 출생연 + 6년(해당 연도 시작)부터 첫 대운 적용.
  const daeNumber = Math.max(1, Math.floor(rawBaseAge + 1e-9));
  const firstChange = new Date(birth.getFullYear() + Math.max(0, daeNumber - 1), 0, 1, 12, 0, 0, 0);
  const eventsCount = Math.max(0, Math.floor(untilYears / 10));
  const events: Array<{ at: Date; gz: string }> = [];

  for (let i = 0; i < eventsCount; i += 1) {
    const at = new Date(firstChange);
    at.setFullYear(at.getFullYear() + i * 10);
    at.setSeconds(0, 0);
    const gz = stepGZ(natalMonthGz, dir, i + 1);
    events.push({ at, gz });
  }

  return { baseAge: daeNumber, events };
};

/** 대운리스트 생성 (첫 항목에 출생 월주 추가) */
export function useDaewoonList(
  ms: MyeongSik,
  hourTable: DayBoundaryRule = "조자시/야자시",
  untilYears = 100,
  dstOffsetMinutes = 0
): Daewoon[] {
  const daewoonDisplayBase = useSettingsStore((s) => s.settings.daewoonDisplayBase);
  const base = useMemo(() => ensureSolarBirthDay(ms), [ms]);
  const birth = useMemo(
    () => parseBirthLocal(base, { dstOffsetMinutes }),
    [base, dstOffsetMinutes]
  );
  const natal = useMemo(
    () => computeNatalPillars(base, hourTable, { dstOffsetMinutes }),
    [base, hourTable, dstOffsetMinutes]
  );
  const dir = (base.dir === "backward" ? "backward" : "forward") as "forward" | "backward";

  return useMemo(() => {
    const mapWithAge = (events: Array<{ at: Date; gz: string }>, baseAge: number) =>
      events.map((e, i) => {
        const age = i === 0 ? 1 : baseAge + (i - 1) * 10;
        const startYear = e.at.getFullYear();
        return {
          ...e,
          age,
          startYear,
        };
      });

    if (daewoonDisplayBase === "표준기준") {
      const general = buildGeneralEvents(birth, natal.month, dir, untilYears);
      const natalEvent = { at: birth, gz: natal.month };
      return mapWithAge([natalEvent, ...general.events], general.baseAge);
    }

    const wolju = buildWolju(birth, natal.month, dir, untilYears, base.birthPlace?.lon ?? 127.5);
    const natalEvent = { at: birth, gz: wolju.natalMonthPillar };
    const baseRawAge = wolju.events[0] ? getRawAgeYears(birth, wolju.events[0].at) : 0;
    const baseAge = normalizeMyounBaseAge(baseRawAge);
    return mapWithAge([natalEvent, ...wolju.events], baseAge);
  }, [birth, natal.month, dir, untilYears, base.birthPlace?.lon, daewoonDisplayBase]);
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
