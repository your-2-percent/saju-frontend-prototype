import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { getDayGanZhi, getHourGanZhi, getYearGanZhi, shiftDayGZ } from "@/shared/domain/ganji/common";
import { getSipSin, getElementColor } from "@/shared/domain/ganji/utils";
import type { Stem10sin, Branch10sin } from "@/shared/domain/ganji/utils";
import type { DayBoundaryRule } from "@/shared/type";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/ganji/twelve";
import { useSettingsStore } from "@/settings/input/useSettingsStore";
import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";
import { toCorrected } from "@/myeongsik/calc";
import { withSafeClockForUnknownTime } from "@/luck/calc/withSafeClockForUnknownTime";
import { ensureSolarBirthDay, isYinUnified, mapEra, toDisplayChar } from "@/luck/calc/luckUiUtils";
import { useDstOffsetMinutes } from "@/saju/input/useDstStore";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";

const toDayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

const HOUR_STARTS = [23, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21] as const;

const buildHourlyAnchors = (base: Date): Date[] => {
  const dayStart = toDayStart(base);
  return HOUR_STARTS.map((hour, idx) => {
    const at = new Date(dayStart);
    if (idx === 0) at.setDate(at.getDate() - 1); // 첫 자시는 전날 23시
    at.setHours(hour, 0, 0, 0);
    return at;
  });
};

export default function SiwoonList({
  data,
  selectedDay,
}: {
  data: MyeongSik;
  selectedDay: Date | null;
}) {
  const settings = useSettingsStore((s) => s.settings);
  const { date, setFromEvent } = useLuckPickerStore();
  const dstOffsetMinutes = useDstOffsetMinutes();
  const usePrevDay = useHourPredictionStore((s) => s.usePrevDay);

  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  const targetDay = useMemo(() => {
    const src = selectedDay ?? date ?? new Date();
    return src instanceof Date && !Number.isNaN(src.getTime()) ? src : new Date();
  }, [selectedDay, date]);

  const list = useMemo(
    () =>
      buildHourlyAnchors(targetDay).map((at) => ({
        at,
        gz: getHourGanZhi(at, rule),
      })),
    [targetDay, rule]
  );

  const currentHourGZ = useMemo(() => getHourGanZhi(date, rule), [date, rule]);
  const activeIndex = useMemo(() => {
    const idx = list.findIndex((ev) => ev.gz === currentHourGZ);
    return idx >= 0 ? idx : 0;
  }, [list, currentHourGZ]);

  const lon =
    !data.birthPlace || data.birthPlace.name === "모름" || data.birthPlace.lon === 0
      ? 127.5
      : data.birthPlace.lon;

  const birthRaw = toCorrected(data, dstOffsetMinutes);
  const birth = useMemo(() => withSafeClockForUnknownTime(data, birthRaw), [data, birthRaw]);

  const solarBirth = useMemo<Date>(() => {
    const ensured = ensureSolarBirthDay(data);
    return toCorrected(ensured, dstOffsetMinutes);
  }, [data, dstOffsetMinutes]);
  const solarBirthSafe = useMemo(() => withSafeClockForUnknownTime(data, solarBirth), [data, solarBirth]);

  const dayStem = useMemo<Stem10sin>(() => {
    const dayGz = getDayGanZhi(solarBirthSafe, rule);
    const shifted = usePrevDay ? shiftDayGZ(dayGz, -1) : dayGz;
    return shifted.charAt(0) as Stem10sin;
  }, [solarBirthSafe, rule, usePrevDay]);

  const baseBranch: Branch10sin = useMemo(
    () =>
      (settings.sinsalBase === "일지"
        ? (usePrevDay
            ? shiftDayGZ(getDayGanZhi(birth, rule), -1)
            : getDayGanZhi(birth, rule)
          ).charAt(1)
        : getYearGanZhi(birth, lon).charAt(1)) as Branch10sin,
    [settings.sinsalBase, usePrevDay, birth, rule, lon]
  );

  return (
    <div className="w-full max-w-[640px] mx-auto rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-3 py-2 text-sm font-semibold tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300">
        시운리스트
      </div>

      <div className="flex gap-0.5 p-2">
        {list.map((ev, i) => {
          const stem = ev.gz.charAt(0) as Stem10sin;
          const branch = ev.gz.charAt(1) as Branch10sin;
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

          const startHour = HOUR_STARTS[i] ?? ev.at.getHours();
          const timeLabel = `${startHour}시`;

          return (
            <div
              key={ev.at.toISOString()}
              onClick={() => setFromEvent({ at: ev.at, gz: ev.gz }, "시운")}
              className={`min-w-0 flex-1 rounded-sm desk:rounded-lg bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer ${
                isActive
                  ? "border border-yellow-500"
                  : "border border-neutral-200 dark:border-neutral-800 hover:border-yellow-500"
              }`}
              title={`${timeLabel} · ${ev.gz}`}
            >
              <div className="px-0.5 py-1 text-center text-[10px] bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300 whitespace-nowrap">
                {timeLabel}
              </div>

              <div className="p-1.5 flex flex-col items-center gap-1">
                {settings.showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap">
                    {getSipSin(dayStem, { stem })}
                  </div>
                )}

                <div
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-sm flex items-center justify-center border ${getElementColor(
                    stem,
                    "stem",
                    settings
                  )}`}
                >
                  <span className={`text-base md:text-lg ${stemFont}`}>{stemDisp}</span>
                </div>

                <div
                  className={`w-7 h-7 md:w-8 md:h-8 rounded-sm flex items-center justify-center border ${getElementColor(
                    branch,
                    "branch",
                    settings
                  )}`}
                >
                  <span className={`text-base md:text-lg ${branchFont}`}>{branchDisp}</span>
                </div>

                {settings.showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap">
                    {getSipSin(dayStem, { branch })}
                  </div>
                )}

                {(settings.showSibiUnseong || settings.showSibiSinsal) && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-center text-nowrap">
                    {settings.showSibiUnseong && unseong && <div>{unseong}</div>}
                    {settings.showSibiSinsal && shinsal && <div>{shinsal}</div>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
