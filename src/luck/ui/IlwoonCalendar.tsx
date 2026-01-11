// features/luck/IlwoonCalendar.tsx
import type { MyeongSik } from "@/shared/lib/storage";
import { getDayGanZhiilun } from "@/shared/domain/ganji/common";
import { getSipSin, getElementColor } from "@/shared/domain/ganji/utils";
import type { Stem10sin, Branch10sin } from "@/shared/domain/ganji/utils";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/ganji/twelve";
import { toDisplayChar, isYinUnified, mapEra } from "@/luck/calc/luckUiUtils";
import { useIlwoonCalendarInput } from "@/luck/input/useIlwoonCalendarInput";
import { useIlwoonCalendarCalc } from "@/luck/calc/useIlwoonCalendarCalc";
import { useIlwoonCalendarSave } from "@/luck/save/useIlwoonCalendarSave";
import { toNoon } from "@/luck/calc/dateUtils";
import { formatStartKST } from "@/luck/calc/termUtils";
import { useDstOffsetMinutes } from "@/saju/input/useDstStore";

export default function IlwoonCalendar({
  data,
  year,
  month,
  selectedMonth,
}: {
  data: MyeongSik;
  year: number;
  month: number;
  selectedMonth: Date | null;
}) {
  const dstOffsetMinutes = useDstOffsetMinutes();
  const input = useIlwoonCalendarInput();
  const calc = useIlwoonCalendarCalc({
    data,
    year,
    month,
    selectedMonth,
    dstOffsetMinutes,
    settings: input.settings,
    pickedDate: input.pickedDate,
  });
  const save = useIlwoonCalendarSave({ setFromEvent: input.setFromEvent });

  return (
    <div className="w-full max-w-[800px] mx-auto mb-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      {/* 헤더 */}
      <div className="flex justify-center items-center px-2 desk:px-4 py-2 bg-neutral-50 dark:bg-neutral-800/60">
        <div className="text-center text-[11px] desk:text-sm font-semibold text-neutral-700 dark:text-neutral-200">
          {calc.cur?.name ? (
            <>
              {calc.cur.name} {" ~ "}
              {calc.next?.name ?? ""}
            </>
          ) : (
            `${year}년 ${month}월`
          )}
          {calc.termMarks.length > 0 && (
            <div className="mt-0.5 text-[10px] desk:text-xs font-normal text-neutral-500 dark:text-neutral-400">
              [
              {calc.termMarks.map((t, i) => (
                <span key={`${t.name}_${t.date.getTime()}_${i}`}>
                  {t.name} {formatStartKST(t.date)}
                  {i < calc.termMarks.length - 1 ? " · " : ""}
                </span>
              ))}
              ]
            </div>
          )}
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 text-center text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300">
        {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      {/* 달력 */}
      <div className="grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-800">
        {calc.weeks.map((week, wi) =>
          week.map((d, di) => {
            if (!d) return <div key={`${wi}-${di}`} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800" />;

            const dayLocal = toNoon(d);
            const dayBase = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);

            const now = new Date();
            const isToday =
              dayLocal.getFullYear() === now.getFullYear() &&
              dayLocal.getMonth() === now.getMonth() &&
              dayLocal.getDate() === now.getDate();

            const isSelected =
              !!calc.pickerNoon &&
              dayLocal.getFullYear() === calc.pickerNoon.getFullYear() &&
              dayLocal.getMonth() === calc.pickerNoon.getMonth() &&
              dayLocal.getDate() === calc.pickerNoon.getDate();

            const isActive = isSelected || (!calc.pickerNoon && isToday);

            const gzDate =
              dstOffsetMinutes !== 0
                ? new Date(dayBase.getTime() + dstOffsetMinutes * 60 * 1000)
                : dayBase;
            const gz = getDayGanZhiilun(gzDate, calc.rule);
            const stem = gz.charAt(0) as Stem10sin;
            const branch = gz.charAt(1) as Branch10sin;

            const stemDisp = toDisplayChar(stem, "stem", input.settings.charType);
            const branchDisp = toDisplayChar(branch, "branch", input.settings.charType);

            const stemFont = input.settings.thinEum && isYinUnified(stem, "stem") ? "font-thin" : "font-bold";
            const branchFont =
              input.settings.thinEum && isYinUnified(branch, "branch") ? "font-thin" : "font-bold";

            const showSipSin = !!calc.dayStem && input.settings.showSipSin;
            const showUnseong = !!calc.dayStem && input.settings.showSibiUnseong;
            const showSinsal = !!calc.dayStem && calc.baseBranch != null && input.settings.showSibiSinsal;

            const sipSinStem = showSipSin ? getSipSin(calc.dayStem!, { stem }) : "";
            const sipSinBranch = showSipSin ? getSipSin(calc.dayStem!, { branch }) : "";
            const unseong = showUnseong ? getTwelveUnseong(calc.dayStem!, branch) : "";
            const shinsal = showSinsal
              ? getTwelveShinsalBySettings({
                  baseBranch: calc.baseBranch!,
                  targetBranch: branch,
                  era: mapEra(input.settings.sinsalMode),
                  gaehwa: !!input.settings.sinsalBloom,
                })
              : "";

            const mark = calc.termMarks.find(
              (tm) =>
                tm.date.getFullYear() === dayLocal.getFullYear() &&
                tm.date.getMonth() === dayLocal.getMonth() &&
                tm.date.getDate() === dayLocal.getDate()
            );

            return (
              <div
                key={d.toISOString()}
                onClick={() => save.handleDayClick(dayBase)}
                className={`space-y-1 bg-white dark:bg-neutral-900 flex flex-col items-center justify-start p-1 text-xs border cursor-pointer ${
                  isActive ? "border-yellow-500" : "border-neutral-200 dark:border-neutral-800"
                }`}
                title={`${gz} (${dayLocal.toLocaleDateString()})`}
              >
                <div className="text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <span>{dayLocal.getDate()}</span>
                  {mark && (
                    <span className="text-[10px] text-nowrap px-1 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200">
                      {mark.name}
                    </span>
                  )}
                </div>

                {showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">{sipSinStem}</div>
                )}

                <div
                  className={`w-8 h-8 rounded flex items-center justify-center text-base ${getElementColor(
                    stem,
                    "stem",
                    input.settings
                  )}`}
                >
                  <span className={stemFont}>{stemDisp}</span>
                </div>

                <div
                  className={`w-8 h-8 rounded flex items-center justify-center text-base ${getElementColor(
                    branch,
                    "branch",
                    input.settings
                  )}`}
                >
                  <span className={branchFont}>{branchDisp}</span>
                </div>

                {showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400">{sipSinBranch}</div>
                )}

                {(showUnseong || showSinsal) && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-center space-y-0.5">
                    {showUnseong && unseong && <div>{unseong}</div>}
                    {showSinsal && shinsal && <div>{shinsal}</div>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
