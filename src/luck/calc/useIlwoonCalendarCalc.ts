import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { getDayGanZhi, getYearGanZhi, shiftDayGZ } from "@/shared/domain/ganji/common";
import type { Stem10sin, Branch10sin } from "@/shared/domain/ganji/utils";
import type { DayBoundaryRule } from "@/shared/type";
import { toCorrected } from "@/myeongsik/calc";
import { withSafeClockForUnknownTime } from "@/luck/calc/withSafeClockForUnknownTime";
import { ensureSolarBirthDay } from "@/luck/calc/luckUiUtils";
import { fromPropMonth, toNoon } from "@/luck/calc/dateUtils";
import { collectTermsAround, getJieRangeByDateStrict } from "@/luck/calc/termUtils";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";

type UseIlwoonCalendarCalcArgs = {
  data: MyeongSik;
  year: number;
  month: number;
  selectedMonth: Date | null;
  dstOffsetMinutes?: number;
  settings: {
    ilunRule?: string;
    sinsalBase: string;
  };
  pickedDate: Date | null;
};

type IlwoonCalendarCalc = {
  rule: DayBoundaryRule;
  dayStem: Stem10sin | undefined;
  baseBranch: Branch10sin | null;
  pickerNoon: Date | null;
  termMarks: { name: string; date: Date }[];
  weeks: (Date | null)[][];
  cur: { name: string; date: Date } | null;
  next: { name: string; date: Date } | null;
};

export function useIlwoonCalendarCalc({
  data,
  year,
  month,
  selectedMonth,
  dstOffsetMinutes = 0,
  settings,
  pickedDate,
}: UseIlwoonCalendarCalcArgs): IlwoonCalendarCalc {
  const usePrevDay = useHourPredictionStore((s) => s.usePrevDay);
  const rule: DayBoundaryRule = (settings.ilunRule as DayBoundaryRule) || "조자시/야자시";
  const natalRule: DayBoundaryRule =
    (data.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  const solarBirth = useMemo<Date>(() => {
    const ensured = ensureSolarBirthDay(data);
    return toCorrected(ensured, dstOffsetMinutes);
  }, [data, dstOffsetMinutes]);
  const solarBirthSafe = useMemo(
    () => withSafeClockForUnknownTime(data, solarBirth),
    [data, solarBirth]
  );

  const dayStem: Stem10sin | undefined = useMemo(() => {
    if (!solarBirthSafe) return undefined;
    const gz = getDayGanZhi(solarBirthSafe, natalRule);
    const shifted = usePrevDay ? shiftDayGZ(gz, -1) : gz;
    return shifted.charAt(0) as Stem10sin;
  }, [solarBirthSafe, natalRule, usePrevDay]);

  const birthRaw = useMemo(
    () => (data ? toCorrected(data, dstOffsetMinutes) : null),
    [data, dstOffsetMinutes]
  );
  const birthSafe = useMemo(
    () => (data && birthRaw ? withSafeClockForUnknownTime(data, birthRaw) : null),
    [data, birthRaw]
  );

  const lon =
    data && data.birthPlace && data.birthPlace.name !== "모름" && data.birthPlace.lon !== 0
      ? data.birthPlace.lon
      : 127.5;

  const baseBranch: Branch10sin | null =
    data && birthSafe
      ? ((settings.sinsalBase === "일지"
          ? (usePrevDay
              ? shiftDayGZ(getDayGanZhi(birthSafe, natalRule), -1)
              : getDayGanZhi(birthSafe, natalRule)
            ).charAt(1)
          : getYearGanZhi(birthSafe, lon).charAt(1)) as Branch10sin)
      : null;

  const propBase = useMemo(() => fromPropMonth(year, month), [year, month]);
  const pickerNoon = useMemo(() => (pickedDate ? toNoon(new Date(pickedDate)) : null), [pickedDate]);
  const selectedNoon = useMemo(() => (selectedMonth ? toNoon(selectedMonth) : null), [selectedMonth]);
  const baseDate = useMemo(() => pickerNoon ?? selectedNoon ?? propBase, [pickerNoon, selectedNoon, propBase]);

  const { start: monthStart, end: monthEnd, cur, next } = useMemo(
    () => getJieRangeByDateStrict(baseDate),
    [baseDate]
  );

  const days = useMemo(() => {
    const arr: Date[] = [];
    const curD = new Date(monthStart);
    while (curD < monthEnd) {
      arr.push(new Date(curD));
      curD.setDate(curD.getDate() + 1);
    }
    return arr;
  }, [monthStart, monthEnd]);

  const termMarks = useMemo(() => {
    const table = collectTermsAround(baseDate.getFullYear());
    const inRange = table.filter((t) => t.date >= monthStart && t.date < monthEnd);
    const nextTerm = table.find((t) => t.date >= monthEnd);
    return nextTerm ? [...inRange, nextTerm] : inRange;
  }, [baseDate, monthStart, monthEnd]);

  const weeks = useMemo(() => {
    const rows: (Date | null)[][] = [];
    let row: (Date | null)[] = [];
    const firstWeekDay = new Date(monthStart).getDay();
    for (let i = 0; i < firstWeekDay; i += 1) row.push(null);
    for (const d of days) {
      if (row.length === 7) {
        rows.push(row);
        row = [];
      }
      row.push(d);
    }
    while (row.length < 7) row.push(null);
    rows.push(row);
    return rows;
  }, [days, monthStart]);

  return {
    rule,
    dayStem,
    baseBranch,
    pickerNoon,
    termMarks,
    weeks,
    cur: cur ?? null,
    next: next ?? null,
  };
}
