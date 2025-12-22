// features/luck/LuckGlobalPicker.tsx
import { useEffect, useMemo } from "react";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { useGlobalLuck } from "@/features/luck/useGlobalLuck";
import type { MyeongSik } from "@/shared/lib/storage";
import DateInput from "@/features/luck/ui/DateTimePicker";

export default function LuckGlobalPicker({
  ms,
}: {
  ms: MyeongSik;
}) {
  const { date, setDate } = useLuckPickerStore();

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
  const luck = useGlobalLuck(ms);

  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();

  const titleLine = useMemo(() => {
    const natal = typeof ms.ganji === "string" ? ms.ganji : "";
    const dae = luck?.dae?.gz ? `${luck.dae.gz}대운` : null;
    const se = luck?.se?.gz ? `${luck.se.gz}세운` : null;
    const wol = luck?.wol?.gz ? `${luck.wol.gz}월운` : null;

    const extras = [dae, se, wol].filter(Boolean).join(" ");
    return [natal, extras].filter(Boolean).join(" + ");
  }, [ms.ganji, luck]);

  const onDatePicked = (next: Date) => {
    // 시간은 next에 이미 유지된 값이 들어옴(DateInput이 유지해줌)
    setDate(next);
  };

  return (
    <div className="max-w-[640px] mx-auto mb-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-3 space-y-3">
      {/* 상단: 원국 + 운 */}
      {titleLine && (
        <div className="text-center text-sm font-medium text-neutral-800 dark:text-neutral-200">
          {titleLine}
        </div>
      )}

      {/* 날짜 입력: 직접입력(text) + 캘린더(date picker) 둘 다 지원 */}
      <div className="grid grid-cols-1 gap-3">
        <label className="w-full flex justify-center items-center">
          <span className="text-sm text-neutral-500 mr-4">날짜</span>
          <DateInput
            date={safeDate}
            onChange={onDatePicked}
            min="1900-01-01"
            max="2100-12-31"
          />
        </label>
      </div>
    </div>
  );
}
