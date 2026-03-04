// features/luck/LuckGlobalPicker.tsx
import { useEffect, useMemo, useState } from "react";
import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";
import type { MyeongSik } from "@/shared/lib/storage";
import { useDstOffsetMinutes } from "@/saju/input/useDstStore";

const pad2 = (n: number) => String(n).padStart(2, "0");

const toDateTimeLocal = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(
    d.getMinutes()
  )}`;

const parseDateTimeLocal = (v: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const [datePart, timePart] = v.split("T");
  if (!datePart || !timePart) return null;

  const [ys, ms, ds] = datePart.split("-");
  const [hs, mins] = timePart.split(":");

  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);
  const hh = Number(hs);
  const mm = Number(mins);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (m < 1 || m > 12) return null;
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const lastDay = new Date(y, m, 0).getDate();
  if (d < 1 || d > lastDay) return null;

  const next = new Date(y, m - 1, d, hh, mm, 0, 0);
  return Number.isNaN(next.getTime()) ? null : next;
};

export default function LuckGlobalPicker({ ms }: { ms: MyeongSik }) {
  const { date, setDate } = useLuckPickerStore();
  const dstOffsetMinutes = useDstOffsetMinutes();
  void dstOffsetMinutes;

  const msKey = useMemo(() => {
    const id = typeof ms.id === "string" ? ms.id : "";
    if (id) return id;
    const b = typeof ms.birthDay === "string" || typeof ms.birthDay === "number" ? String(ms.birthDay) : "";
    const t = typeof ms.birthTime === "string" ? ms.birthTime : "";
    const g = typeof ms.ganji === "string" ? ms.ganji : "";
    return [g, b, t].filter(Boolean).join("|");
  }, [ms]);

  useEffect(() => {
    setDate(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msKey]);

  const safeDate = useMemo(
    () => (date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()),
    [date]
  );
  const [draftDateTime, setDraftDateTime] = useState(() => toDateTimeLocal(safeDate));

  useEffect(() => {
    setDraftDateTime(toDateTimeLocal(safeDate));
  }, [safeDate]);

  return (
    <div className="w-full max-w-[640px] mx-auto px-3 py-1.5 flex items-center gap-3">
      <input
        type="datetime-local"
        value={draftDateTime}
        min="1900-01-01T00:00"
        max="2100-12-31T23:59"
        onChange={(e) => {
          const v = e.target.value;
          setDraftDateTime(v);
          const parsed = parseDateTimeLocal(v);
          if (parsed) setDate(parsed);
        }}
        onBlur={() => {
          const parsed = parseDateTimeLocal(draftDateTime);
          if (!parsed) setDraftDateTime(toDateTimeLocal(safeDate));
        }}
        className="h-7! px-2! text-xs font-medium border rounded bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600"
      />
    </div>
  );
}
