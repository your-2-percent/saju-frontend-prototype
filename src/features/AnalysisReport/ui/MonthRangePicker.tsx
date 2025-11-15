// features/AnalysisReport/ui/MonthRangePicker.tsx
import { useState, useMemo } from "react";

type MonthString = `${number}-${string}`; // 예: "2025-11"

export interface MonthRange {
  start: MonthString;
  end: MonthString;
}

interface MonthRangePickerProps {
  value?: MonthRange;
  onChange?: (next: MonthRange) => void;
  className?: string;
}

/** YYYY-MM → { year, month(1~12) } */
function parseMonth(str: string): { year: number; month: number } | null {
  if (!str) return null;
  const [y, m] = str.split("-").map(Number);
  if (!y || !m || m < 1 || m > 12) return null;
  return { year: y, month: m };
}

/** {year, month} → YYYY-MM */
function formatMonth(year: number, month: number): MonthString {
  const mm = month < 10 ? `0${month}` : String(month);
  return `${year}-${mm}` as MonthString;
}

/** 두 month 사이의 개월 수 차이(절대값) */
function diffInMonths(a: { year: number; month: number }, b: { year: number; month: number }): number {
  return Math.abs((a.year - b.year) * 12 + (a.month - b.month));
}

/** 시작/끝 월을 받아서 최대 12개월(=1년) 안으로 강제 보정 */
function clampToOneYear(start: { year: number; month: number }, end: { year: number; month: number }) {
  // start > end 이면 스왑
  const startIndex = start.year * 12 + (start.month - 1);
  const endIndex = end.year * 12 + (end.month - 1);
  if (startIndex > endIndex) {
    const tmp = { ...start };
    start = { ...end };
    end = tmp;
  }

  // 차이가 11개월(=12개월 구간) 초과면 end를 줄인다.
  const diff = diffInMonths(start, end);
  if (diff > 11) {
    // start 기준으로 +11개월까지만 허용
    const newIndex = start.year * 12 + (start.month - 1) + 11;
    const newYear = Math.floor(newIndex / 12);
    const newMonth = (newIndex % 12) + 1;
    end = { year: newYear, month: newMonth };
  }

  return { start, end };
}

function getMonthRangeList(range: MonthRange): { year: number; month: number; label: string }[] {
  const start = parseMonth(range.start);
  const end = parseMonth(range.end);
  if (!start || !end) return [];

  const { start: s, end: e } = clampToOneYear(start, end);
  const list: { year: number; month: number; label: string }[] = [];

  let cursorYear = s.year;
  let cursorMonth = s.month;

  while (true) {
    list.push({
      year: cursorYear,
      month: cursorMonth,
      label: `${cursorYear}년 ${cursorMonth}월`,
    });

    if (cursorYear === e.year && cursorMonth === e.month) break;

    cursorMonth += 1;
    if (cursorMonth > 12) {
      cursorMonth = 1;
      cursorYear += 1;
    }
  }

  return list;
}

/**
 * 월 단위 범위 선택용 픽커
 * - input type="month" 두 개
 * - 최대 12개월(1년) 범위로 자동 보정
 * - 피커 아래에 "최장 1년(12개월)까지만 선택할 수 있어요." 안내 문구
 */
export default function MonthRangePicker(props: MonthRangePickerProps) {
  const { value, onChange, className } = props;

  const [internal, setInternal] = useState<MonthRange>(() => {
    if (value) return value;

    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth() + 1;

    const start = formatMonth(y, m);
    const end = formatMonth(y, m);
    return { start, end };
  });

  const range = value ?? internal;

  const monthsInfo = useMemo(() => getMonthRangeList(range), [range]);

  const handleUpdate = (next: MonthRange) => {
    const s = parseMonth(next.start);
    const e = parseMonth(next.end);
    if (!s || !e) {
      setInternal(next);
      onChange?.(next);
      return;
    }

    const clamped = clampToOneYear(s, e);
    const normalized: MonthRange = {
      start: formatMonth(clamped.start.year, clamped.start.month),
      end: formatMonth(clamped.end.year, clamped.end.month),
    };

    setInternal(normalized);
    onChange?.(normalized);
  };

  return (
    <div className={className}>
      <div className="month-range-row">
        <label className="">
          <input
            type="month"
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
            value={range.start}
            onChange={(e) => handleUpdate({ ...range, start: e.target.value as MonthString })}
          />
        </label>
        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 mx-1">~</span>
        <label className="text-[11px] text-neutral-500 dark:text-neutral-400 mr-1">
          <input
            type="month"
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
            value={range.end}
            onChange={(e) => handleUpdate({ ...range, end: e.target.value as MonthString })}
          />
        </label>
      </div>

      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
        최장 1년(12개월)까지만 선택할 수 있어요. 선택한 범위는 {monthsInfo.length}개월이에요.
      </p>
    </div>
  );
}
