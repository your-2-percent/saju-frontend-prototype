// features/AnalysisReport/ui/LuckDatePicker.tsx
import { useMemo } from "react";
import type { DayBoundaryRule } from "@/shared/type";
import { getYearGanZhi, getDayGanZhi, getMonthGanZhi } from "@/shared/domain/간지/공통";
import { normalizeGZ } from "../logic/relations";

export default function LuckDatePicker({
  value,
  onChange,
  rule = "자시",
  lon = 127.5,
}: {
  value: Date;
  onChange: (next: { date: Date; yearGZ: string; monthGZ: string; dayGZ: string }) => void;
  rule?: DayBoundaryRule;
  lon?: number;
}) {
  const dateStr = useMemo(() => {
    const y = value.getFullYear();
    const m = String(value.getMonth()+1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [value]);

  const handle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = new Date(e.target.value + "T12:00:00");
    const yearGZ  = normalizeGZ(getYearGanZhi(d, lon));
    const monthGZ = normalizeGZ(getMonthGanZhi(d));
    const dayGZ   = normalizeGZ(getDayGanZhi(d, rule));
    onChange({ date: d, yearGZ, monthGZ, dayGZ });
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 w-full rounded-xl bg-neutral-100 dark:bg-neutral-900">
      <label className="text-xs text-neutral-500">날짜 선택</label>
      <input
        type="date"
        value={dateStr}
        onChange={handle}
        className="text-sm px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
      />
    </div>
  );
}
