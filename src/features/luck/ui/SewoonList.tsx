// features/luck/components/SewoonList.tsx
import { useEffect, useMemo, useState } from "react";
import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { toCorrected } from "@/shared/domain/meongsik";
import { getYearGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { findActiveIndexByDate } from "@/features/luck/utils/active";
import { withSafeClockForUnknownTime } from "@/features/luck/utils/withSafeClockForUnknownTime";
import { ensureSolarBirthDay, isYinUnified, mapEra, toDisplayChar } from "@/features/luck/utils/luckUiUtils";
import { useDstOffsetMinutes } from "@/shared/lib/hooks/useDstStore";

/* 경계 회피용: 해당 해 ‘한가운데’(7/2 12:00) */
function toSafeMiddleOfYear(y: number): Date {
  return new Date(y, 6, 2, 12, 0, 0, 0);
}

/** 현재나이(한국식, 연도 기준 +1). 만 나이 말고 “올해 나이”로 계산 */
function koreanAgeByYear(birthYear: number, targetYear: number): number {
  return targetYear - birthYear + 1;
}

export default function SewoonList({
  data,
  list,
  onSelect,
}: {
  data: MyeongSik;
  list: { at: Date; gz: string }[];
  onSelect?: (year: number) => void;
}) {
  const settings = useSettingsStore((s) => s.settings);
  const { date, setFromEvent } = useLuckPickerStore();
  const dstOffsetMinutes = useDstOffsetMinutes();

  /* 1) 리스트 ‘고정(sticky)’: 부모가 일시적으로 빈 배열을 내려줘도 이전 리스트 유지 */
  const [stickyList, setStickyList] = useState<{ at: Date; gz: string }[]>(() => list);
  useEffect(() => {
    if (list && list.length > 0) setStickyList(list);
  }, [list]);

  /* 2) 최종 뷰 리스트: 우선 현재 list, 없으면 sticky, 그것마저 없으면 한 해짜리 fallback */
  // 출생/좌표 등 파생값
  const birthRaw = toCorrected(data, dstOffsetMinutes);
  const birth = useMemo(
    () => withSafeClockForUnknownTime(data, birthRaw),
    [data, birthRaw]
  );
  const birthYear = useMemo(() => birth.getFullYear(), [birth]);

  const lon =
    !data.birthPlace || data.birthPlace.name === "모름" || data.birthPlace.lon === 0
      ? 127.5
      : data.birthPlace.lon;

  const fallbackList = useMemo(() => {
    if (!date) return [];
    const y = date.getFullYear();
    const at = toSafeMiddleOfYear(y);
    const gz = getYearGanZhi(at, lon);
    return [{ at, gz }];
  }, [date, lon]);

  const rawViewList =
    list.length > 0 ? list : stickyList.length > 0 ? stickyList : fallbackList;

  /* 3) 정렬 보장 */
  const viewList = useMemo(
    () => [...rawViewList].sort((a, b) => a.at.getTime() - b.at.getTime()),
    [rawViewList]
  );

  /* 4) 인덱스 계산(클램핑) */
  const storeIndex = useMemo(() => {
    if (viewList.length === 0) return 0;
    const idx = findActiveIndexByDate(viewList, date);
    if (idx < 0) return 0;
    if (idx >= viewList.length) return viewList.length - 1;
    return idx;
  }, [viewList, date]);

  /* 5) 낙관적 로컬 인덱스: 클릭 즉시 반영해서 플리커 방지 */
  const [localIndex, setLocalIndex] = useState<number | null>(null);
  useEffect(() => {
    // 외부 상태 바뀌면 로컬 고정 해제(동기화)
    setLocalIndex(null);
  }, [date, viewList]);

  const activeIndex = localIndex ?? storeIndex;

  const solarBirth = useMemo<Date>(() => {
    const ensured = ensureSolarBirthDay(data);
    return toCorrected(ensured, dstOffsetMinutes);
  }, [data, dstOffsetMinutes]);

  /* 6) 도메인 파생값(표시/신살 등) — ✅ 안전한 일간/기준지지 */
  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "조자시/야자시";
  const dayStem = useMemo<Stem10sin>(() => {
    const dayGz = getDayGanZhi(solarBirth, rule);
    return dayGz.charAt(0) as Stem10sin;
  }, [solarBirth, rule]);

  const baseBranch: Branch10sin = useMemo(() => {
    return (
      (settings.sinsalBase === "일지"
        ? getDayGanZhi(birth, rule).charAt(1)
        : getYearGanZhi(birth, lon).charAt(1)) as Branch10sin
    );
  }, [birth, rule, lon, settings.sinsalBase]);

  return (
    <div className="w-full max-w-[640px] mx-auto rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-3 py-2 text-sm font-semibold tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300">
        세운리스트
      </div>

      <div className="flex gap-0.5 desk:gap-1 py-2 desk:p-2 flex-row-reverse">
        {viewList.map((ev, i) => {
          const year = ev.at.getFullYear();
          // 표시용 간지(확정): 연중간 날짜로 계산 → 경계/입춘 영향 최소화
          const mid = toSafeMiddleOfYear(year);
          const yearGZ = getYearGanZhi(mid, lon);
          const stem = yearGZ.charAt(0) as Stem10sin;
          const branch = yearGZ.charAt(1) as Branch10sin;

          const isActive = i === activeIndex;

          const stemDisp = toDisplayChar(stem, "stem", settings.charType);
          const branchDisp = toDisplayChar(branch, "branch", settings.charType);

          const yinStem = isYinUnified(stem, "stem");
          const yinBranch = isYinUnified(branch, "branch");
          const stemFont = settings.thinEum && yinStem ? "font-thin" : "font-bold";
          const branchFont = settings.thinEum && yinBranch ? "font-thin" : "font-bold";

          const unseong = settings.showSibiUnseong ? getTwelveUnseong(dayStem, branch) : null;
          const shinsal = settings.showSibiSinsal
            ? getTwelveShinsalBySettings({ baseBranch, targetBranch: branch, era: mapEra(settings.sinsalMode), gaehwa: !!settings.sinsalBloom })
            : null;

          // ✅ 현재나이(한국식, 연도 기준 +1) 계산
          const age = koreanAgeByYear(birthYear, year);

          return (
            <div
              key={`${year}-${ev.gz || i}`}
              onClick={() => {

              if (i === 0) {
                setLocalIndex(i); // 표시만 바뀌게
                return;           // 내부 세운 이동 금지
              }
              // 1) 선택 즉시 표시
              setLocalIndex(i);

              // ✅ 2) 세운 앵커: 'at'과 'gz'를 동일한 연중간 날짜로 고정
              const anchorAt = toSafeMiddleOfYear(year);
              const anchorGz = getYearGanZhi(anchorAt, lon);

              setFromEvent({ at: anchorAt, gz: anchorGz }, "세운");

              // 3) 부모 콜백은 한 틱 뒤
              if (onSelect) {
                if (typeof queueMicrotask !== "undefined") queueMicrotask(() => onSelect(year));
                else Promise.resolve().then(() => onSelect(year));
              }
            }}
            className={`flex-1 rounded-sm desk:rounded-lg bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer ${
              isActive ? "border border-yellow-500" : "border border-neutral-200 dark:border-neutral-800 hover:border-yellow-500"
            }`}
              title={`${yearGZ} · ${ev.at.toLocaleDateString()} · ${age}세`}
            >
              {/* ✅ 나이(현재나이) 표시: 년도 위에 */}
              <div className="desk:px-2 py-1 text-center text-[10px] bg-neutral-100 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200">
                {age}세
              </div>

              <div className="desk:px-2 py-1 text-center text-[10px] bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                {year}
              </div>

              <div className="p-2 flex flex-col items-center gap-1">
                {settings.showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap">
                    {getSipSin(dayStem, { stem })}
                  </div>
                )}

                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border ${getElementColor(stem, "stem", settings)}`}>
                  <span className={`text-[20px] md:text-xl ${stemFont}`}>{stemDisp}</span>
                </div>

                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border ${getElementColor(branch, "branch", settings)}`}>
                  <span className={`text-[20px] md:text-xl ${branchFont}`}>{branchDisp}</span>
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

