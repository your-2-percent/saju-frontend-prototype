import { useState, useEffect } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import DaewoonList from "@/features/luck/layout/DaewoonList";
import SewoonList from "@/features/luck/layout/SewoonList";
import WolwoonList from "@/features/luck/layout/WolwoonList";
import IlwoonCalendar from "@/features/luck/layout/IlwoonCalendar";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { getSewoonListInDaewoon } from "@/features/luck/useSewoonList";
import type { DayBoundaryRule } from "@/shared/type"

export default function UnViewer({ data }: { data: MyeongSik }) {
  const daeList = useDaewoonList(data);

  const [activeDaeIndex, setActiveDaeIndex] = useState<number | null>(null);
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const [ilwoonTarget, setIlwoonTarget] = useState<{ year: number; month: number } | null>(null);

  // 처음에는 일운까지 전부 보이게
  const [visibleLevel, setVisibleLevel] = useState<"dae" | "se" | "wol" | "il">("il");

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
  useEffect(() => {
    if (activeDaeIndex === null) return;
    const currDae = daeList[activeDaeIndex];
    const nextDae = daeList[activeDaeIndex + 1];
    if (!currDae) return;

    const sewoonList = getSewoonListInDaewoon(currDae, nextDae);
    const now = new Date();
    const idx = sewoonList.findIndex((it, i) => {
      const next = sewoonList[i + 1]?.at;
      return now >= it.at && (!next || now < next);
    });

    if (idx !== -1) {
      const y = sewoonList[idx].at.getFullYear();
      setActiveYear(y);
      setIlwoonTarget({ year: now.getFullYear(), month: now.getMonth() + 1 });
    }
  }, [activeDaeIndex, daeList]);

  return (
    <div className="w-full space-y-4">
      {/* 대운 */}
      <DaewoonList
        data={data}
        activeIndex={activeDaeIndex}
        onSelect={(i) => {
          setActiveDaeIndex(i);
          setVisibleLevel("se"); // 대운 클릭 → 세운까지 보임
        }}
      />

      {/* 세운 */}
      {visibleLevel === "se" || visibleLevel === "wol" || visibleLevel === "il" ? (
        <SewoonList
          data={data}
          activeDaeIndex={activeDaeIndex}
          onSelect={(year) => {
            setActiveYear(year);
            setVisibleLevel("wol"); // 세운 클릭 → 월운까지 보임
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
        />
      ) : null}

      {/* 일운 */}
      {visibleLevel === "il" && ilwoonTarget && (
        <IlwoonCalendar data={data} year={ilwoonTarget.year} month={ilwoonTarget.month} hourTable={data?.mingSikType as DayBoundaryRule} />
      )}
    </div>
  );
}
