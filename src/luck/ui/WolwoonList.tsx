// features/luck/WolwoonList.tsx
import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { getMonthGanZhi, getYearGanZhi, getDayGanZhi } from "@/shared/domain/ganji/common";
import { getSipSin, getElementColor } from "@/shared/domain/ganji/utils";
import type { Stem10sin, Branch10sin } from "@/shared/domain/ganji/utils";
import { toCorrected } from "@/myeongsik/calc";
import type { DayBoundaryRule } from "@/shared/type";
import { useDstOffsetMinutes } from "@/saju/input/useDstStore";

// 십이운성/십이신살
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/ganji/twelve";

// ✅ 전역 설정 (SajuChart와 동일 소스)
import { useSettingsStore } from "@/settings/input/useSettingsStore";

import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";
import { findActiveIndexByDate } from "@/luck/calc/active";
import { getSolarTermBoundaries } from "@/features/myoun";
import { withSafeClockForUnknownTime } from "@/luck/calc/withSafeClockForUnknownTime";
import { getJieRangeByDate } from "@/luck/calc/solarTermUtils";
import { ensureSolarBirthDay, isYinUnified, mapEra, toDisplayChar } from "@/luck/calc/luckUiUtils";

/* ===== 절입(12절) 정의 ===== */
const JIE_SET = new Set([
  "입춘", "경칩", "청명", "입하", "망종", "소서",
  "입추", "백로", "한로", "입동", "대설", "소한",
]);

/* ===== KST 보정 유틸 ===== */
function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 0, 0);
}
function monthNumberKST(d: Date): number {
  const parts = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "numeric" }).formatToParts(d);
  return Number(parts.find(p => p.type === "month")?.value ?? (d.getMonth() + 1));
}

/* ===== 절기 테이블 앵커(연 단위) ===== */
function solarYearAnchorDate(year: number) {
  // 태양년 내부 확정일(6/15 정오)
  return new Date(year, 5, 15, 12, 0, 0, 0);
}

//type JieBoundary = { name: string; date: Date };

/** activeYear의 1/1(로컬) 이후 '첫 입춘'부터 12개 절입을 뽑아서,
 *  각 절입의 "그 날 00:00(KST)"을 월운 시작점으로 사용. */
function buildSolarMonthStarts(activeYear: number): Array<{ name: string; termAt: Date; at00: Date }> {
  const tables = [
    ...(getSolarTermBoundaries(solarYearAnchorDate(activeYear - 1)) ?? []),
    ...(getSolarTermBoundaries(solarYearAnchorDate(activeYear)) ?? []),
    ...(getSolarTermBoundaries(solarYearAnchorDate(activeYear + 1)) ?? []),
  ]
    .map(t => ({ name: String(t.name), date: new Date(t.date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const jie = tables.filter(t => JIE_SET.has(t.name));

  const jan1 = new Date(activeYear, 0, 1, 0, 0, 0, 0);
  const nextJan1 = new Date(activeYear + 1, 0, 1, 0, 0, 0, 0);

  const startIdx = jie.findIndex(t => t.name === "입춘" && t.date >= jan1 && t.date < nextJan1);
  if (startIdx === -1) return [];

  const out: Array<{ name: string; termAt: Date; at00: Date }> = [];
  for (let k = 0; k < 12; k++) {
    const item = jie[startIdx + k];
    if (!item) break;
    const termAt = new Date(item.date);        // 절입 실제 시각
    const at00 = startOfLocalDay(termAt);      // 월 경계는 그 날 00:00로 묶는다
    out.push({ name: item.name, termAt, at00 });
  }
  return out;
}

/* ===== 컴포넌트 ===== */
export default function WolwoonList({
  data,
  activeYear,
  onSelect,
  onSelectMonth 
}: {
  data: MyeongSik;
  activeYear: number | null;
  onSelect?: (year: number, month0: number) => void;
  onSelectMonth: (d: Date) => void
}) {
  const settings = useSettingsStore((s) => s.settings);
  const dstOffsetMinutes = useDstOffsetMinutes();

  const lon =
    !data.birthPlace || data.birthPlace.name === "모름" || data.birthPlace.lon === 0
      ? 127.5
      : data.birthPlace.lon;

  const birthRaw = toCorrected(data, dstOffsetMinutes);
  const birth = useMemo(
    () => withSafeClockForUnknownTime(data, birthRaw),
    [data, birthRaw]
  );
  const solarBirth = useMemo<Date>(() => {
    const ensured = ensureSolarBirthDay(data);
    return toCorrected(ensured, dstOffsetMinutes);
  }, [data, dstOffsetMinutes]);
  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "조자시/야자시";
  // 안전한 일간(십신 계산용)
  const dayStem = useMemo<Stem10sin>(() => {
    const dayGz = getDayGanZhi(solarBirth, rule);
    return dayGz.charAt(0) as Stem10sin;
  }, [solarBirth, rule]);
  const baseBranch: Branch10sin = (
    settings.sinsalBase === "일지"
      ? getDayGanZhi(birth, rule).charAt(1)
      : getYearGanZhi(birth, lon).charAt(1)
  ) as Branch10sin;

  // 월운 리스트 (절입 기준 12개, at=그날 00:00)
  const list = useMemo(() => {
    if (!activeYear) return [];
    const jieStarts = buildSolarMonthStarts(activeYear);
    return jieStarts.map(j => {
      const at = j.termAt;
      // 절입 다음날 0시를 월간지 계산용으로 사용
      // getMonthGanZhi는 절입 경계에 +30분을 더해 계산하므로, 그 이후 시각으로 보정
      const safeForGz = new Date(j.termAt.getTime() + 31 * 60 * 1000);

      const gz = getMonthGanZhi(safeForGz, lon);
      return { at, gz, term: j.name, termAt: j.termAt };
    });
  }, [activeYear, lon]);

  const { date, setFromEvent } = useLuckPickerStore();
  const activeIndex = findActiveIndexByDate(list, date);
  

  return (
    <div className="w-full max-w-[640px] mx-auto rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-3 py-2 text-sm font-semibold tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300">
        월운리스트
      </div>

      <div className="flex gap-0.5 desk:gap-1 py-2 desk:p-2 flex-row-reverse">
        {list.map((ev, i) => {
          const stem = ev.gz.charAt(0) as Stem10sin;
          const branch = ev.gz.charAt(1) as Branch10sin;
          const label = `${monthNumberKST(ev.at)}월`; // ✅ KST 기준 월 라벨
          const isActive = i === activeIndex;

          const stemDisp = toDisplayChar(stem, "stem", settings.charType);
          const branchDisp = toDisplayChar(branch, "branch", settings.charType);

          const yinStem = isYinUnified(stem, "stem");
          const yinBranch = isYinUnified(branch, "branch");
          const stemFont = settings.thinEum && yinStem ? "font-thin" : "font-bold";
          const branchFont = settings.thinEum && yinBranch ? "font-thin" : "font-bold";

          const unseong = settings.showSibiUnseong ? getTwelveUnseong(dayStem, branch) : null;
          const shinsal = settings.showSibiSinsal
            ? getTwelveShinsalBySettings({
                baseBranch,
                targetBranch: branch,
                era: mapEra(settings.sinsalMode),
                gaehwa: !!settings.sinsalBloom,
              })
            : null;

          return (
            <div
              key={`${ev.term}-${ev.at.toISOString()}`}
              onClick={() => {
                onSelectMonth(ev.at);
                const delayed = new Date(ev.at);
                const { start } = getJieRangeByDate(delayed); // ✅ 클릭된 절입 구간 기준
                onSelect?.(start.getFullYear(), start.getMonth()); // 이 월이 IlwoonCalendar에 전달됨
                setFromEvent({ at: delayed, gz: getMonthGanZhi(delayed, lon) }, "월운");
              }}
              className={`flex-1 rounded-sm desk:rounded-lg bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer ${
                isActive
                  ? "border border-yellow-500"
                  : "border border-neutral-200 dark:border-neutral-800 hover:border-yellow-500"
              }`}
              title={`${ev.term} 시작 · ${ev.gz} · ${ev.termAt.toLocaleString()}`}
            >
              <div className="desk:px-2 py-1 text-center text-[10px] bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                {label}
              </div>

              <div className="p-2 flex flex-col items-center gap-1">
                {/* 십신(천간) */}
                {settings.showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap">
                    {getSipSin(dayStem, { stem })}
                  </div>
                )}

                {/* 천간 */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 ${getElementColor(
                    stem,
                    "stem",
                    settings
                  )}`}
                >
                  <span className={`text-base md:text-xl ${stemFont}`}>
                    {stemDisp}
                  </span>
                </div>

                {/* 지지 */}
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 ${getElementColor(
                    branch,
                    "branch",
                    settings
                  )}`}
                >
                  <span className={`text-base md:text-xl ${branchFont}`}>
                    {branchDisp}
                  </span>
                </div>

                {/* 십신(지지) */}
                {settings.showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap">
                    {getSipSin(dayStem, { branch })}
                  </div>
                )}

                {/* 운성/신살 */}
                {(settings.showSibiUnseong || settings.showSibiSinsal) && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-center text-nowrap">
                    {settings.showSibiUnseong && unseong && <div>{unseong}</div>}
                    {settings.showSibiSinsal && shinsal && <div>{shinsal}</div>}
                  </div>
                )}

                {/* 절입 라벨(보조) */}
                <div className="text-[10px] text-neutral-400 dark:text-neutral-500 text-nowrap">
                  {ev.term}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
