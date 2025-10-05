import { useMemo } from "react";

interface DateInputProps {
  date: Date;
  onChange: (next: Date) => void;
  min?: string;
  max?: string;
}

/** 단순 날짜 입력 (시간 유지) */
export default function DateInput({
  date,
  onChange,
  min = "1900-01-01",
  max = "2100-12-31",
}: DateInputProps) {
  const dateStr = useMemo(() => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [date]);

  const handleChange = (v: string) => {
    if (!v) return;
    const [ys, ms, ds] = v.split("-");
    const y = Number(ys);
    const m = Number(ms);
    const d = Number(ds);
    const hh = date.getHours();
    const mm = date.getMinutes();

    const lastDay = new Date(y, m, 0).getDate();
    const safeD = Math.min(d, lastDay);
    const next = new Date(y, m - 1, safeD, hh, mm);
    if (!Number.isNaN(next.getTime())) onChange(next);
  };

  return (
    <input
      type="date"
      value={dateStr}
      onChange={(e) => handleChange(e.target.value)}
      min={min}
      max={max}
      className="w rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
    />
  );
}
