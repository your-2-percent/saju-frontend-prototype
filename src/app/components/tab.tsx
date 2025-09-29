// features/UnMyounTabs.tsx
import { useMemo, useState } from "react";
import UnViewer from "@/features/luck/viewer";
import MyoUnViewer from "@/features/myoun/MyoUnViewer";
import AnalysisReport from "@/features/AnalysisReport/";
import type { MyeongSik } from "@/shared/lib/storage";
import { toCorrected } from "@/shared/domain/meongsik";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/간지/공통";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import { withSafeClockForUnknownTime } from "@/features/luck/utils/withSafeClockForUnknownTime";

/* ────────────────────────────────────────────────────────────
 * 달력 변환/유틸
 * ──────────────────────────────────────────────────────────── */
const DEBUG = false;
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const isGZ = (s: unknown): s is string => typeof s === "string" && s.length >= 2;
const isValidPillars = (arr: unknown): arr is [string, string, string, string] => 
  Array.isArray(arr) && arr.length === 4 && arr.every(isGZ); 

/** data가 음력이라면 반드시 ‘양력 birthDay(YYYYMMDD)’로 치환한 사본을 반환 */
function ensureSolarBirthDay(data: MyeongSik): MyeongSik {
  const any: Record<string, unknown> = data as unknown as Record<string, unknown>;

  const birthDay = typeof any.birthDay === "string" ? any.birthDay : "";
  const calType = typeof any.calendarType === "string" ? (any.calendarType as string) : "solar";

  if (birthDay.length < 8) return data;

  const y = Number(birthDay.slice(0, 4));
  const m = Number(birthDay.slice(4, 6));
  const d = Number(birthDay.slice(6, 8));

  // 프로젝트에 있을 수 있는 다양한 윤달 필드 케이스를 모두 수용
  const leapFlags = ["isLeap", "isLeapMonth", "leapMonth", "leap", "lunarLeap"] as const;
  let isLeap = false;
  for (const k of leapFlags) {
    const v = any[k];
    if (typeof v === "boolean") {
      isLeap = v;
      break;
    }
    if (typeof v === "number") {
      isLeap = v === 1;
      break;
    }
    if (typeof v === "string") {
      isLeap = v === "1" || v.toLowerCase() === "true";
      break;
    }
  }

  if (calType === "lunar") {
    try {
      // ✅ lunarToSolarStrict 사용
      const solarDate = lunarToSolarStrict(y, m, d, 0, 0);
      const newBirthDay = `${solarDate.getFullYear()}${pad2(
        solarDate.getMonth() + 1
      )}${pad2(solarDate.getDate())}`;

      const out: MyeongSik = {
        ...data,
        birthDay: newBirthDay,
        calendarType: "solar",
      } as MyeongSik;

      if (DEBUG) {
        console.debug("[UnMyounTabs] lunar→solar:", {
          in: { y, m, d, isLeap },
          out: newBirthDay,
        });
      }
      return out;
    } catch (e) {
      if (DEBUG) console.warn("[UnMyounTabs] lunar2solar 실패 → 원본 유지", e);
      return data;
    }
  }

  return data; // 이미 양력
}

/* ────────────────────────────────────────────────────────────
 * 컴포넌트
 * ──────────────────────────────────────────────────────────── */
export default function UnMyounTabs({ data }: { data: MyeongSik }) {
  const [tab, setTab] = useState<"un" | "myoun" | "report">("un");

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
        <button
          onClick={() => setTab("myoun")}
          className={`px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b hover:border-purple-500 hover:text-purple-500 font-bold ${
            tab === "myoun" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"
          }`}
        >
          묘운 뷰어
        </button>
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
      {tab === "myoun" && <MyoUnViewer data={data} />}
      {tab === "report" && (
        // pillars(양력)만 확실히 전달 — lunarPillars는 생략
        <AnalysisReport data={data} pillars={isValidPillars(pillars) ? pillars : []} />
      )}
    </div>
  );
}
