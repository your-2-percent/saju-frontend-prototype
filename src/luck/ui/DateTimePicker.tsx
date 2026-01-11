// features/luck/NativeDateInput.tsx
import { useEffect, useMemo, useState } from "react";

interface NativeDateInputProps {
  date: Date;
  onChange: (next: Date) => void;
  min?: string; // "YYYY-MM-DD"
  max?: string; // "YYYY-MM-DD"
  className?: string;
}

function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMDStrict(v: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;

  const [ys, ms, ds] = v.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12) return null;

  const lastDay = new Date(y, m, 0).getDate();
  if (d < 1 || d > lastDay) return null;

  return { y, m, d };
}

function clampYMD(v: string, min: string, max: string): string {
  // ISO 포맷(YYYY-MM-DD)은 문자열 비교가 날짜 비교랑 같음
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

export default function NativeDateInput({
  date,
  onChange,
  min = "1900-01-01",
  max = "2100-12-31",
  className = "px-2 py-1 text-xs border rounded bg-white dark:bg-neutral-700",
}: NativeDateInputProps) {
  const safeDate = useMemo(
    () => (date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()),
    [date]
  );

  const canonical = useMemo(() => formatYMD(safeDate), [safeDate]);

  // ✅ 핵심: input value는 "문자열 state"로 유지
  const [draft, setDraft] = useState<string>(canonical);

  // 외부 date 변경 시 동기화
  useEffect(() => {
    setDraft(canonical);
  }, [canonical]);

  const commitIfValid = (v: string) => {
    const parsed = parseYMDStrict(v);
    if (!parsed) return;

    const vv = clampYMD(v, min, max);

    const { y, m, d } = parseYMDStrict(vv)!;

    // 시간 유지(원래 date의 시/분/초/ms)
    const hh = safeDate.getHours();
    const mm = safeDate.getMinutes();
    const ss = safeDate.getSeconds();
    const ms = safeDate.getMilliseconds();

    const next = new Date(y, m - 1, d, hh, mm, ss, ms);
    if (!Number.isNaN(next.getTime())) onChange(next);
  };

  return (
    <input
      type="date"
      value={draft}
      min={min}
      max={max}
      onChange={(e) => {
        const v = e.target.value; // 완성된 YYYY-MM-DD 또는 ""(지움)
        setDraft(v);
        if (v) commitIfValid(v); // 즉시 커밋(원하면 blur로만 옮겨도 됨)
      }}
      onBlur={() => {
        // 비었거나/이상하면 마지막 정상값으로 롤백
        if (!draft || !parseYMDStrict(draft)) {
          setDraft(canonical);
          return;
        }
        // 범위 밖이면 clamp해서 롤백+커밋
        const clamped = clampYMD(draft, min, max);
        if (clamped !== draft) {
          setDraft(clamped);
          commitIfValid(clamped);
        }
      }}
      className={className}
      aria-label="날짜 선택"
    />
  );
}
