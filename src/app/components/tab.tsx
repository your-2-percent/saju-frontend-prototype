// features/UnMyounTabs.tsx
import { useEffect, useMemo, useState } from "react";
import UnViewer from "@/features/luck/viewer";
import MyoUnViewer from "@/features/myoun/MyoUnViewer";
import AnalysisReport from "@/features/AnalysisReport/";
import type { MyeongSik } from "@/shared/lib/storage";
import { toCorrected, ensureSolarBirthDay } from "@/shared/domain/meongsik";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/간지/공통";
import { withSafeClockForUnknownTime } from "@/features/luck/utils/withSafeClockForUnknownTime";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

/* ────────────────────────────────────────────────────────────
 * 달력 변환/유틸
 * ──────────────────────────────────────────────────────────── */
const isGZ = (s: unknown): s is string => typeof s === "string" && s.length >= 2;
const isValidPillars = (arr: unknown): arr is [string, string, string, string] => {
  if (!Array.isArray(arr) || arr.length !== 4) return false;
  return isGZ(arr[0]) && isGZ(arr[1]) && isGZ(arr[2]) && (arr[3] === "" || isGZ(arr[3]));
};

type TabKey = "un" | "myoun" | "report";

/* ────────────────────────────────────────────────────────────
 * 컴포넌트
 * ──────────────────────────────────────────────────────────── */
export default function UnMyounTabs({ data }: { data: MyeongSik }) {
  const [tab, setTab] = useState<TabKey>("un");

  // ✅ 묘운 뷰어는 "보이거나/아예 숨기거나"만 한다.
  // canUseMyoViewerNow() 자체가 loaded/isActiveNow 체크 포함이라,
  // 로딩 중에는 false -> 탭이 잠깐 보였다가 사라지는 깜빡임도 방지됨.
  const showMyoTab = useEntitlementsStore((s) => s.canUseMyoViewerNow());

  // ✅ 탭이 숨김 상태인데 현재 탭이 myoun이면 안전 탭으로 강제 이동
  useEffect(() => {
    if (tab === "myoun" && !showMyoTab) {
      setTab("un");
    }
  }, [tab, showMyoTab]);

  // 1) 음→양 보장 + 경도/DST 교정
  const correctedSolarRaw = useMemo(() => {
    try {
      const solarized = ensureSolarBirthDay(data);
      return toCorrected(solarized); // Date
    } catch {
      return new Date();
    }
  }, [data]);

  // 2) 시간 미상 시 정오 고정(야자시 경계 이슈 제거)
  const correctedSolar = useMemo(
    () => withSafeClockForUnknownTime(data, correctedSolarRaw),
    [data, correctedSolarRaw]
  );

  const isUnknownTime = !data.birthTime || data.birthTime === "모름";

  // 3) 간지 계산 (시주는 isUnknownTime이면 계산/표시 생략)
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
    <div className="w-[96%] max-w-[640px] mx-auto">
      {/* 탭 버튼 */}
      <div className="flex border-b border-neutral-700 mb-4">
        <button
          onClick={() => setTab("un")}
          className={`px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b hover:border-purple-500 hover:text-purple-500 font-bold ${
            tab === "un" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"
          }`}
        >
          기본운 뷰어
        </button>

        {/* ✅ 묘운 뷰어 탭: 권한 없으면 "아예 안 보이게" */}
        {showMyoTab ? (
          <button
            onClick={() => setTab("myoun")}
            className={`px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b hover:border-purple-500 hover:text-purple-500 font-bold ${
              tab === "myoun" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"
            }`}
          >
            묘운 뷰어
          </button>
        ) : null}

        <button
          onClick={() => setTab("report")}
          className={`px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b hover:border-purple-500 hover:text-purple-500 font-bold ${
            tab === "report" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"
          }`}
        >
          분석 레포트
        </button>
      </div>

      {/* 콘텐츠 */}
      {tab === "un" && <UnViewer data={data} />}
      {tab === "myoun" && showMyoTab && <MyoUnViewer data={data} />}
      {tab === "report" && (
        <AnalysisReport data={data} pillars={isValidPillars(pillars) ? pillars : []} />
      )}
    </div>
  );
}
