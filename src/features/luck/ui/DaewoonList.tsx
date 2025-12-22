// features/luck/DaewoonList.tsx
import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { getElementColor, getSipSin } from "@/shared/domain/간지/utils";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { toCorrected } from "@/shared/domain/meongsik";
import { getYearGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";
//import { withSafeClockForUnknownTime } from "@/features/luck/utils/withSafeClockForUnknownTime";

// 십이운성/십이신살
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";

// ✅ 전역 설정 스토어 (SajuChart와 동일)
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";

import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { findActiveIndexByDate } from "@/features/luck/utils/active";
import { ensureSolarBirthDay, isYinUnified, mapEra, toDisplayChar } from "@/features/luck/utils/luckUiUtils";

/* ===== 컴포넌트 ===== */
export default function DaewoonList({
  data,
}: {
  data: MyeongSik;
}) {
  const list = useDaewoonList(data);

  const solarBirth = useMemo<Date>(() => {
    const ensured = ensureSolarBirthDay(data);
    return toCorrected(ensured);
  }, [data]);

  // 4) 일간(대운 십신 기준) 재산출 — 반드시 양력(solarBirth) + 규칙(rule)
  const dayStem = useMemo<Stem10sin>(() => {
    const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "조자시/야자시";
    const dayGz = getDayGanZhi(solarBirth, rule);
    return dayGz.charAt(0) as Stem10sin;
  }, [solarBirth, data.mingSikType]);

  const { date, setFromEvent } = useLuckPickerStore();
  const activeIndex = useMemo(() => findActiveIndexByDate(list, date), [list, date]);

  // ✅ 전역 설정 (SajuChart와 동일한 소스)
  const settings = useSettingsStore((s) => s.settings);
  const {
    charType,
    thinEum,
    showSipSin,
    showSibiUnseong,
    showSibiSinsal,
    sinsalBase,   // "일지" | "연지"
    sinsalMode,   // "classic" | "modern"
    sinsalBloom,  // boolean
  } = settings;

  // 경도(연간/연지 산출에 필요 시)
  const lon =
    !data.birthPlace || data.birthPlace.name === "모름" || data.birthPlace.lon === 0
      ? 127.5
      : data.birthPlace.lon;

  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "조자시/야자시";
  const baseBranchForShinsal: Branch10sin = (
    sinsalBase === "일지"
      ? getDayGanZhi(solarBirth, rule).charAt(1)
      : getYearGanZhi(solarBirth, lon).charAt(1)
  ) as Branch10sin;

  const calcUnseong = (branch: Branch10sin) =>
    showSibiUnseong ? getTwelveUnseong(dayStem, branch) : null;

  const calcShinsal = (targetBranch: Branch10sin) =>
    showSibiSinsal
      ? getTwelveShinsalBySettings({
          baseBranch: baseBranchForShinsal,
          targetBranch,
          era: mapEra(sinsalMode),
          gaehwa: !!sinsalBloom,
        })
      : null;

  return (
    <div className="w-full max-w-[640px] mx-auto rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-3 py-2 text-sm font-semibold tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300">
        대운리스트
      </div>

      <div className="flex gap-0.5 desk:gap-1 py-2 desk:p-2 flex-row-reverse">
        {list.map((ev, i) => {
          const stem = ev.gz.charAt(0) as Stem10sin;
          const branch = ev.gz.charAt(1) as Branch10sin;
          const age = getAge(solarBirth, ev.at);
          const isActive = i === activeIndex;

          const stemDisp = toDisplayChar(stem, "stem", charType);
          const branchDisp = toDisplayChar(branch, "branch", charType);

          const yinStem = isYinUnified(stem, "stem");
          const yinBranch = isYinUnified(branch, "branch");
          const stemFont = thinEum && yinStem ? "font-thin" : "font-bold";
          const branchFont = thinEum && yinBranch ? "font-thin" : "font-bold";

          const unseong = calcUnseong(branch);
          const shinsal = calcShinsal(branch);

          return (
            <div
              key={`${ev.gz}-${i}`}
              onClick={() => setFromEvent(ev, "대운")}
              className={`flex-1 rounded-sm desk:rounded-lg bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer ${
                isActive
                  ? "border border-yellow-500"
                  : "border border-neutral-200 dark:border-neutral-800 hover:border-yellow-500"
              }`}
              title={`${ev.gz} · ${ev.at.toLocaleDateString()}`}
            >
              <div className="desk:px-2 py-1 text-center text-[10px] bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                {age}
              </div>

              <div className="p-2 flex flex-col items-center gap-0.5">
                {/* 십신(천간) */}
                {showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap">
                    {getSipSin(dayStem, { stem })}
                  </div>
                )}

                {/* 천간 */}
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 ${getElementColor(
                    stem,
                    "stem",
                    settings
                  )}`}
                >
                  <span className={`text-[20px] md:text-xl ${stemFont}`}>
                    {stemDisp}
                  </span>
                </div>

                {/* 지지 */}
                <div
                  className={`w-8 h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 ${getElementColor(
                    branch,
                    "branch",
                    settings
                  )}`}
                >
                  <span className={`text-[20px] md:text-xl ${branchFont}`}>
                    {branchDisp}
                  </span>
                </div>

                {/* 십신(지지) */}
                {showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap">
                    {getSipSin(dayStem, { branch })}
                  </div>
                )}

                {/* 운성/신살 */}
                {(showSibiUnseong || showSibiSinsal) && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-1 text-center space-y-0.5 text-nowrap">
                    {showSibiUnseong && <div>{unseong}</div>}
                    {showSibiSinsal && <div>{shinsal}</div>}
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

function getAge(birth: Date, target: Date): number {
  const diffMs = target.getTime() - birth.getTime();
  const age = diffMs / (365.2425 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.round(age));
}

