// features/luck/DateInput.tsx
import { useEffect, useMemo, useRef, useState } from "react";

interface DateInputProps {
  date: Date;
  onChange: (next: Date) => void;
  min?: string;
  max?: string;
}

/** yyyy-mm-dd 포맷 */
function formatYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** YYYY-MM-DD 엄격 파싱 */
function parseYMDStrict(v: string): { y: number; m: number; d: number } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const [ys, ms, ds] = v.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const d = Number(ds);

  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  if (m < 1 || m > 12) return null;
  if (d < 1 || d > 31) return null;

  return { y, m, d };
}

/**
 * ✅ 해결 포인트
 * - type="date"는 ‘완성된 값’ 아니면 컨트롤드 입력이 막힘(년도 타이핑이 안 되는 느낌)
 * - 그래서 화면 입력은 text로 받고, 캘린더는 숨긴 date + 버튼으로 제공
 * - 값이 완성(YYYY-MM-DD)되면 onChange로 commit
 */
export default function DateInput({
  date,
  onChange,
  min = "1900-01-01",
  max = "2100-12-31",
}: DateInputProps) {
  const safeDate = useMemo(
    () => (date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()),
    [date]
  );

  const canonical = useMemo(() => formatYMD(safeDate), [safeDate]);
  const [draft, setDraft] = useState<string>(canonical);

  // 외부 date 변경 시 draft 동기화
  useEffect(() => {
    setDraft(canonical);
  }, [canonical]);

  const pickerRef = useRef<HTMLInputElement | null>(null);

  // 텍스트 입력: 타이핑은 자유, 완성된 YYYY-MM-DD만 커밋
  const onDraftChange = (v: string) => {
    setDraft(v);

    const parsed = parseYMDStrict(v);
    if (!parsed) return;

    const { y, m, d } = parsed;

    // "말일 안전화" 적용
    const lastDay = new Date(y, m, 0).getDate();
    const safeD = Math.min(d, lastDay);

    // 시간 유지
    const hh = safeDate.getHours();
    const mm = safeDate.getMinutes();
    const ss = safeDate.getSeconds();
    const ms = safeDate.getMilliseconds();

    const next = new Date(y, m - 1, safeD, hh, mm, ss, ms);
    if (!Number.isNaN(next.getTime())) {
      onChange(next);
    }
  };

  // 캘린더 픽커에서 선택
  const onPickerChange = (v: string) => {
    // v는 YYYY-MM-DD (브라우저 표준)
    if (!v) return;
    setDraft(v);

    const parsed = parseYMDStrict(v);
    if (!parsed) return;

    const { y, m, d } = parsed;

    const hh = safeDate.getHours();
    const mm = safeDate.getMinutes();
    const ss = safeDate.getSeconds();
    const mss = safeDate.getMilliseconds();

    const next = new Date(y, m - 1, d, hh, mm, ss, mss);
    if (!Number.isNaN(next.getTime())) onChange(next);
  };

  const openPicker = () => {
    const el = pickerRef.current;
    if (!el) return;

    // Chrome 지원: showPicker()
    if (typeof (el as HTMLInputElement & { showPicker?: () => void }).showPicker === "function") {
      (el as HTMLInputElement & { showPicker: () => void }).showPicker();
      return;
    }

    // fallback
    el.focus();
    el.click();
  };

  return (
    <div className="flex items-center gap-2">
      {/* 직접입력(년도 타이핑 해결) */}
      <input
        type="text"
        inputMode="numeric"
        placeholder="YYYY-MM-DD"
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        className="w-[140px] h-30 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-base desk:text-sm"
        aria-label="날짜(직접입력)"
      />

      {/* 캘린더 버튼 */}
      <button
        type="button"
        onClick={openPicker}
        className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-900"
        aria-label="캘린더 열기"
        title="캘린더"
      >
        📅
      </button>

      {/* 숨긴 date input: 캘린더 선택용 */}
      <input
        ref={pickerRef}
        type="date"
        value={draft}
        onChange={(e) => onPickerChange(e.target.value)}
        min={min}
        max={max}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />
    </div>
  );
}
