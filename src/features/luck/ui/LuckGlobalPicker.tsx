// features/luck/LuckGlobalPicker.tsx
import { useMemo, useState } from "react";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { useGlobalLuck } from "@/features/luck/useGlobalLuck";
import type { MyeongSik } from "@/shared/lib/storage";
//import type { DayBoundaryRule } from "@/shared/type";

export default function LuckGlobalPicker({
  pillars,
  ms,
  //hourTable,
}: {
  pillars?: string[];
  ms: MyeongSik;
  //hourTable?: DayBoundaryRule;
}) {
  const { date, setDate } = useLuckPickerStore();

  // ✅ dae/se/wol은 여기서 계산
  const luck = useGlobalLuck(ms);

  const dateStr = useMemo(() => {
    const d = date ?? new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [date]);

  const [timeStr, /*setTimeStr*/] = useState(() => {
    const hh = String(date.getHours()).padStart(2, "0");
    const mm = String(date.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  });

  const onDateChange = (v: string) => {
    const [hh, mm] = timeStr.split(":").map(Number);
    const [y, m, d] = v.split("-").map(Number);
    setDate(new Date(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0));
  };

  // const onTimeChange = (v: string) => {
  //   setTimeStr(v);
  //   const [hh, mm] = v.split(":").map(Number);
  //   const next = new Date(date);
  //   next.setHours(hh ?? 0, mm ?? 0, 0, 0);
  //   setDate(next);
  // };

  // 원국 + 운세 표시줄
  const titleLine = useMemo(() => {
  const natal =
    Array.isArray(pillars) && pillars.length >= 4
      ? `${pillars[0]}년 ${pillars[1]}월 ${pillars[2]}일 ${pillars[3]}시`
      : "";

    // 👉 전역 피커(date) 기준 luck 계산값 사용
    const dae = luck?.dae?.gz ? `${luck.dae.gz}대운` : null;
    const se  = luck?.se?.gz  ? `${luck.se.gz}세운`  : null;
    const wol = luck?.wol?.gz ? `${luck.wol.gz}월운` : null;

    const extras = [dae, se, wol].filter(Boolean).join(" ");

    return [natal, extras].filter(Boolean).join(" + ");
  }, [pillars, luck]);

  return (
    <div className="max-w-[640px] mx-auto mb-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 space-y-3">

      {/* 상단: 원국 + 운 */}
      {titleLine && (
        <div className="text-center text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {titleLine}
        </div>
      )}

      {/* 날짜/시간 피커 */}
      <div className="grid grid-cols-1 gap-3">
        <label className="w-full flex justify-center items-center"/*className="flex items-center gap-2"*/>
          <span className="text-sm text-neutral-500 mr-4">날짜</span>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => onDateChange(e.target.value)}
            className="w rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
          />
        </label>

        {/* <label className="flex items-center gap-2">
          <span className="w-14 text-sm text-neutral-500">시간</span>
          <input
            type="time"
            value={timeStr}
            onChange={(e) => onTimeChange(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
          />
        </label> */}
      </div>
    </div>
  );
}
