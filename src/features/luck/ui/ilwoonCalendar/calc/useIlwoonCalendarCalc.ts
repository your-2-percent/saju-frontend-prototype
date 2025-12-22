import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { getDayGanZhi, getYearGanZhi } from "@/shared/domain/간지/공통";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import type { DayBoundaryRule } from "@/shared/type";
import { toCorrected } from "@/shared/domain/meongsik";
import { withSafeClockForUnknownTime } from "@/features/luck/utils/withSafeClockForUnknownTime";
import { ensureSolarBirthDay } from "@/features/luck/utils/luckUiUtils";
import { fromPropMonth, toNoon } from "@/features/luck/ui/ilwoonCalendar/calc/dateUtils";
import { collectTermsAround, getJieRangeByDateStrict } from "@/features/luck/ui/ilwoonCalendar/calc/termUtils";

type UseIlwoonCalendarCalcArgs = {
  data: MyeongSik;
  year: number;
  month: number;
  selectedMonth: Date | null;
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
  settings,
  pickedDate,
}: UseIlwoonCalendarCalcArgs): IlwoonCalendarCalc {
  const rule: DayBoundaryRule = (settings.ilunRule as DayBoundaryRule) || "조자시/야자시";

  const solarBirth = useMemo<Date>(() => {
    const ensured = ensureSolarBirthDay(data);
    return toCorrected(ensured);
  }, [data]);

  const dayStem: Stem10sin | undefined = useMemo(() => {
    if (!solarBirth) return undefined;
    const gz = getDayGanZhi(solarBirth, rule);
    return gz.charAt(0) as Stem10sin;
  }, [solarBirth, rule]);

  const birthRaw = useMemo(() => (data ? toCorrected(data) : null), [data]);
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
          ? getDayGanZhi(birthSafe, rule).charAt(1)
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
