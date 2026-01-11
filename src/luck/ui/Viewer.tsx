import { useState, useEffect, useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import DaewoonList from "@/features/luck/ui/DaewoonList";
import SewoonList from "@/luck/ui/SewoonList";
import WolwoonList from "@/luck/ui/WolwoonList";
import IlwoonCalendar from "@/luck/ui/IlwoonCalendar";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { getSewoonListInDaewoon } from "@/luck/calc/useSewoonList";
import { useGlobalLuck } from "@/luck/calc/useGlobalLuck";
import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";
import { useDstOffsetMinutes } from "@/saju/input/useDstStore";
import type { DayBoundaryRule } from "@/shared/type";

export default function UnViewer({ data }: { data: MyeongSik }) {
  const dstOffsetMinutes = useDstOffsetMinutes();
  const daeList = useDaewoonList(data, data.mingSikType as DayBoundaryRule, 100, dstOffsetMinutes);

  const [activeDaeIndex, setActiveDaeIndex] = useState<number | null>(null);
  const [ilwoonTarget, setIlwoonTarget] = useState<{ year: number; month: number } | null>(null);

  // 처음에는 일운까지 전부 보이게
  const [visibleLevel, setVisibleLevel] = useState<"dae" | "se" | "wol" | "il">("il");
  const [selectedMonth, setSelectedMonth] = useState<Date | null>(null);

  // 로드 시 현재 대운 자동 선택
  useEffect(() => {
    if (!daeList.length) return;
    const now = new Date();
    const idx = daeList.findIndex((it, i) => {
      const next = daeList[i + 1]?.at;
      return now >= it.at && (!next || now < next);
    });
    if (idx !== -1) setActiveDaeIndex(idx);
  }, [daeList]);

  // ✅ activeYear + 일운 타겟 결정
  const resolveDaeIndex = (idx: number) =>
    idx <= 0 && daeList.length > 1 ? 1 : idx;

  useEffect(() => {
    if (activeDaeIndex === null) return;
    const idx = resolveDaeIndex(activeDaeIndex);
    const currDae = daeList[idx];
    const nextDae = daeList[idx + 1];
    if (!currDae) return;

    const sewoonList = getSewoonListInDaewoon(currDae, nextDae);
    if (!Array.isArray(sewoonList) || sewoonList.length === 0) return;
    const normalized = sewoonList.filter(
      (it): it is { at: Date; gz: string } =>
        !!it && it.at instanceof Date && !Number.isNaN(it.at.getTime())
    );
    if (!normalized.length) return;
    const now = new Date();
    const t = now.getTime();
    const seIndex = normalized.findIndex((it, i) => {
      const next = normalized[i + 1]?.at;
      const curTime = it.at.getTime();
      const nextTime = next ? next.getTime() : null;
      return t >= curTime && (nextTime === null || t < nextTime);
    });

    if (seIndex !== -1) {
      setIlwoonTarget({ year: now.getFullYear(), month: now.getMonth() });
    }
  }, [activeDaeIndex, daeList]);

  const luck = useGlobalLuck(data, undefined, undefined, { dstOffsetMinutes });
  const { date } = useLuckPickerStore();
  const activeYear = date.getMonth() + 1 === 1
    ? date.getFullYear() - 1
    : date.getFullYear();

  const seList = useMemo(() => {
    if (!luck?.dae?.gz) return [];
    const idx = daeList.findIndex((d, i) => {
      const next = daeList[i + 1]?.at;
      return luck.dae.at >= d.at && (!next || luck.dae.at < next);
    });
    if (idx === -1) return [];
    const fixedIdx = resolveDaeIndex(idx);

    const currDae = daeList[fixedIdx];
    const nextDae = daeList[fixedIdx + 1];
    const raw = getSewoonListInDaewoon(currDae, nextDae);
    return Array.isArray(raw)
      ? raw.filter(
          (it): it is { at: Date; gz: string } =>
            !!it && it.at instanceof Date && !Number.isNaN(it.at.getTime())
        )
      : [];
  }, [daeList, luck?.dae]);

  return (
    <div className="w-full space-y-4">
      {/* 대운 */}
      <DaewoonList
        data={data}
      />

      {/* 세운 */}
      {visibleLevel === "se" || visibleLevel === "wol" || visibleLevel === "il" ? (
        <SewoonList
          data={data}
          list={seList}
          onSelect={() => {
            setVisibleLevel("wol");
          }}
        />
      ) : null}

      {/* 월운 */}
      {visibleLevel === "wol" || visibleLevel === "il" ? (
        <WolwoonList
          data={data}
          activeYear={activeYear}
          onSelect={(y, m) => {
            setIlwoonTarget({ year: y, month: m });
            setVisibleLevel("il"); // 월운 클릭 → 일운까지 보임
          }}
          onSelectMonth={setSelectedMonth}
        />
      ) : null}

      {/* 일운 */}
      {visibleLevel === "il" && ilwoonTarget && (
        <IlwoonCalendar
          data={data}
          year={ilwoonTarget.year}
          month={ilwoonTarget.month + 1}
          selectedMonth={selectedMonth}
        />
      )}
    </div>
  );
}
