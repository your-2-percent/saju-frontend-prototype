// features/luck/LuckGlobalPicker.tsx
import { useEffect, useMemo } from "react";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { useGlobalLuck } from "@/features/luck/useGlobalLuck";
import type { MyeongSik } from "@/shared/lib/storage";
// import type { DayBoundaryRule } from "@/shared/type";

export default function LuckGlobalPicker({
  pillars,
  ms,
  // hourTable,
}: {
  pillars?: string[];
  ms: MyeongSik;
  // hourTable?: DayBoundaryRule;
}) {
  const { date, setDate } = useLuckPickerStore();

  // ✅ 사이드바에서 "명식 보기"로 다른 ms 선택할 때마다 현재 시각으로 리셋
  useEffect(() => {
    setDate(new Date());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ms]); // ms 식별자가 있다면 ms.id 등으로 바꿔도 됨

  // ✅ dae/se/wol은 여기서 계산 (전역 date 기준)
  const luck = useGlobalLuck(ms);

  const dateStr = useMemo(() => {
    const d = date ?? new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, [date]);

  // 🔒 말일 안전화: 10/31 → 다음 달 이동 시 유효 일자(그 달의 마지막 날)로 보정
  const onDateChange = (v: string) => {
    if (!v) return;

    // yyyy-mm-dd → 숫자 파싱
    const [ys, ms, ds] = v.split("-");
    const y = Number(ys);
    const m = Number(ms); // 1~12
    const d = Number(ds);

    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
      return; // 잘못된 값은 무시
    }

    // 현재 전역 시각(시/분 유지)
    const base = date ?? new Date();
    const hh = base.getHours();
    const mm = base.getMinutes();

    // 해당 월의 마지막 날짜 계산 (m은 1~12 이므로 m 그대로 사용)
    const lastDayOfMonth = new Date(y, m, 0).getDate();
    const safeDay = Math.min(d, lastDayOfMonth); // 11월에 31일 없음 → 30으로 보정 등

    // 로컬 타임존 기준으로 생성 (UTC 파싱 회피)
    const next = new Date(y, m - 1, safeDay, hh, mm, 0, 0);

    // 유효성 체크 후 반영
    if (!Number.isNaN(next.getTime())) {
      setDate(next);
    }
  };

  // 원국 + 운세 표시줄
  const titleLine = useMemo(() => {
    const natal =
      Array.isArray(pillars) && pillars.length >= 4
        ? `${pillars[0]}년 ${pillars[1]}월 ${pillars[2]}일 ${pillars[3]}시`
        : "";

    // 👉 전역 피커(date) 기준 luck 계산값 사용
    const dae = luck?.dae?.gz ? `${luck.dae.gz}대운` : null;
    const se = luck?.se?.gz ? `${luck.se.gz}세운` : null;
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

      {/* 날짜 피커 (시간은 전역 date에서 유지) */}
      <div className="grid grid-cols-1 gap-3">
        <label className="w-full flex justify-center items-center">
          <span className="text-sm text-neutral-500 mr-4">날짜</span>
          <input
            type="date"
            value={dateStr}
            onChange={(e) => onDateChange(e.target.value)}
            // 선택 범위 안전망(선택). 필요 없으면 지워도 됨.
            min="1900-01-01"
            max="2100-12-31"
            className="w rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
          />
        </label>

        {/* 시간 입력은 숨김. 필요시 아래 주석 해제해서 사용 */}
        {/*
        <label className="flex items-center gap-2">
          <span className="w-14 text-sm text-neutral-500">시간</span>
          <input
            type="time"
            value={timeStr}
            onChange={(e) => onTimeChange(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 dark:border-neutral-700 bg-transparent px-2 py-1 text-sm"
          />
        </label>
        */}
      </div>
    </div>
  );
}