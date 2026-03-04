// features/UnMyounTabs.tsx
import { useMemo } from "react";
import UnViewer from "@/luck/ui/Viewer";
import MyoUnViewer from "@/features/myoun/MyoUnViewer";
import AnalysisReport from "@/analysisReport/ui/";
import type { MyeongSik } from "@/shared/lib/storage";
import { toCorrected, ensureSolarBirthDay } from "@/myeongsik/calc";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/ganji/common";
import { withSafeClockForUnknownTime } from "@/luck/calc/withSafeClockForUnknownTime";
import { useDstOffsetMinutes } from "@/saju/input/useDstStore";

/* ────────────────────────────────────────────────────────────
 * 달력 변환/유틸
 * ──────────────────────────────────────────────────────────── */
const isGZ = (s: unknown): s is string => typeof s === "string" && s.length >= 2;
const isValidPillars = (arr: unknown): arr is [string, string, string, string] => {
  if (!Array.isArray(arr) || arr.length !== 4) return false;
  return isGZ(arr[0]) && isGZ(arr[1]) && isGZ(arr[2]) && (arr[3] === "" || isGZ(arr[3]));
};

export type TabKey = "un" | "myoun" | "report" | "shinsal";

/* ────────────────────────────────────────────────────────────
 * 컴포넌트 (탭 버튼은 Page.tsx로 이동, 여기는 컨텐츠만)
 * ──────────────────────────────────────────────────────────── */
export default function UnMyounTabs({
  data,
  tab,
  showMyoTab,
}: {
  data: MyeongSik;
  tab: TabKey;
  showMyoTab: boolean;
}) {
  const dstOffsetMinutes = useDstOffsetMinutes();

  const correctedSolarRaw = useMemo(() => {
    try {
      const solarized = ensureSolarBirthDay(data);
      return toCorrected(solarized, dstOffsetMinutes);
    } catch {
      return new Date();
    }
  }, [data, dstOffsetMinutes]);

  const correctedSolar = useMemo(
    () => withSafeClockForUnknownTime(data, correctedSolarRaw),
    [data, correctedSolarRaw]
  );

  const isUnknownTime = !data.birthTime || data.birthTime === "모름";

  const pillars = useMemo<string[]>(() => {
    try {
      const y = getYearGanZhi(correctedSolar, data.birthPlace?.lon);
      const m = getMonthGanZhi(correctedSolar, data.birthPlace?.lon);
      const d = getDayGanZhi(correctedSolar, data.mingSikType);
      const h = isUnknownTime ? "" : getHourGanZhi(correctedSolar, data.mingSikType);
      return [y, m, d, h];
    } catch {
      return [];
    }
  }, [correctedSolar, data?.mingSikType, data?.birthPlace?.lon, isUnknownTime]);

  return (
    <div className="w-[calc(100%_-_16px)] max-w-[625px] desk:max-w-[640px] mx-auto">
      {tab === "un" && (
        <UnViewer data={data} />
      )}
      {tab === "myoun" && showMyoTab && <MyoUnViewer data={data} />}
      {tab === "report" && (
        <AnalysisReport data={data} pillars={isValidPillars(pillars) ? pillars : []} />
      )}
    </div>
  );
}
