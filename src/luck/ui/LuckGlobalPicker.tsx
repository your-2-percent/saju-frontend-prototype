// features/luck/LuckGlobalPicker.tsx
import { useEffect, useMemo, useState } from "react";
import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";
import { useGlobalLuck } from "@/luck/calc/useGlobalLuck";
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

export default function LuckGlobalPicker({
  ms,
}: {
  ms: MyeongSik;
}) {
  const { date, setDate } = useLuckPickerStore();
  const dstOffsetMinutes = useDstOffsetMinutes();

  // ✅ ms 변경 감지는 "안정적인 키"로 (객체 레퍼런스 바뀜에 의한 불필요 리셋 방지)
  const msKey = useMemo(() => {
    const id = typeof ms.id === "string" ? ms.id : "";
    if (id) return id;

    const b = typeof ms.birthDay === "string" || typeof ms.birthDay === "number" ? String(ms.birthDay) : "";
    const t = typeof ms.birthTime === "string" ? ms.birthTime : "";
    const g = typeof ms.ganji === "string" ? ms.ganji : "";
    return [g, b, t].filter(Boolean).join("|");
  }, [ms]);

  // ✅ 사이드바에서 다른 ms 선택할 때만 현재 시각으로 리셋
  useEffect(() => {
    setDate(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msKey]);

  // ✅ dae/se/wol 계산 (전역 date 기준은 내부 store가 관리)
  const luck = useGlobalLuck(ms, undefined, undefined, { dstOffsetMinutes });

  const safeDate = useMemo(
    () => (date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()),
    [date]
  );
  const [draftDateTime, setDraftDateTime] = useState(() => toDateTimeLocal(safeDate));

  useEffect(() => {
    setDraftDateTime(toDateTimeLocal(safeDate));
  }, [safeDate]);

  const titleLine = useMemo(() => {
    const natal = typeof ms.ganji === "string" ? ms.ganji : "";
    const dae = luck?.dae?.gz ? `${luck.dae.gz}대운` : null;
    const se = luck?.se?.gz ? `${luck.se.gz}세운` : null;
    const wol = luck?.wol?.gz ? `${luck.wol.gz}월운` : null;
    const il = luck?.il?.gz ? `${luck.il.gz}일운` : null;
    const si = luck?.si?.gz ? `${luck.si.gz}시운` : null;

    const extras = [dae, se, wol, il, si].filter(Boolean).join(" ");
    return [natal, extras].filter(Boolean).join(" + ");
  }, [ms.ganji, luck]);

  const onDateTimePicked = (next: Date) => {
    setDate(next);
  };

  return (
    <div className="w-[calc(100%_-_16px)] max-w-[625px] desk:max-w-[640px] mx-auto mb-4 px-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 space-y-3">
      {/* 상단: 원국 + 운 */}
      {titleLine && (
        <div className="text-center text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {titleLine}
        </div>
      )}

      {/* 날짜 입력: 직접입력(text) + 캘린더(date picker) 둘 다 지원 */}
      <div className="grid grid-cols-1 gap-3">
        <label className="w-full flex justify-center items-center">
          <span className="text-sm text-neutral-500 mr-4">날짜/시간</span>
          <input
            type="datetime-local"
            value={draftDateTime}
            min="1900-01-01T00:00"
            max="2100-12-31T23:59"
            onChange={(e) => {
              const v = e.target.value;
              setDraftDateTime(v);
              const parsed = parseDateTimeLocal(v);
              if (parsed) onDateTimePicked(parsed);
            }}
            onBlur={() => {
              const parsed = parseDateTimeLocal(draftDateTime);
              if (!parsed) {
                setDraftDateTime(toDateTimeLocal(safeDate));
              }
            }}
            className="h-9 desk:h-30 px-3 desk:px-2 py-1.5 desk:py-1 text-sm desk:text-xs font-medium border rounded-md desk:rounded bg-white dark:bg-neutral-700"
          />
        </label>
      </div>
    </div>
  );
}
