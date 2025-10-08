// features/luck/components/SewoonList.tsx
import { useEffect, useMemo, useState } from "react";
import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { toCorrected } from "@/shared/domain/meongsik";
import { getYearGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";
import * as Twelve from "@/shared/domain/간지/twelve";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { findActiveIndexByDate } from "@/features/luck/utils/active";
import { withSafeClockForUnknownTime } from "@/features/luck/utils/withSafeClockForUnknownTime";

/* ===== 한자/한글 변환 + 음간/음지 ===== */
const STEM_H2K: Record<string, string> = { "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무", "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계" };
const BRANCH_H2K: Record<string, string> = { "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사", "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해" };
const STEM_K2H = Object.fromEntries(Object.entries(STEM_H2K).map(([h, k]) => [k, h]));
const BRANCH_K2H = Object.fromEntries(Object.entries(BRANCH_H2K).map(([h, k]) => [k, h]));

function toDisplayChar(value: string, kind: "stem" | "branch", charType: "한자" | "한글") {
  if (charType === "한글") {
    return kind === "stem" ? (STEM_H2K[value] ?? value) : (BRANCH_H2K[value] ?? value);
  }
  return kind === "stem" ? (STEM_K2H[value] ?? value) : (BRANCH_K2H[value] ?? value);
}

const YIN_STEMS_ALL = new Set(["乙","丁","己","辛","癸","을","정","기","신","계"]);
const YIN_BRANCHES_ALL = new Set(["丑","卯","巳","未","酉","亥","축","묘","사","미","유","해"]);
function isYinUnified(value: string, kind: "stem" | "branch") {
  return kind === "stem" ? YIN_STEMS_ALL.has(value) : YIN_BRANCHES_ALL.has(value);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
type EraRuntime = { Classic?: Twelve.EraType; Modern?: Twelve.EraType; classic?: Twelve.EraType; modern?: Twelve.EraType };
function isEraRuntime(v: unknown): v is EraRuntime {
  return isRecord(v) && ("Classic" in v || "Modern" in v || "classic" in v || "modern" in v);
}
function mapEra(mode: "classic" | "modern"): Twelve.EraType {
  const exported = (Twelve as unknown as Record<string, unknown>)["EraType"];
  if (isEraRuntime(exported)) {
    return mode === "classic" ? (exported.Classic ?? exported.classic)! : (exported.Modern ?? exported.modern)!;
  }
  return mode as Twelve.EraType;
}

/* 경계 회피용: 해당 해 ‘한가운데’(7/2 12:00) */
function toSafeMiddleOfYear(y: number): Date {
  return new Date(y, 6, 2, 12, 0, 0, 0);
}

function buildDateKeepingMonth(targetYear: number, prev?: Date): Date {
  const base = prev ?? new Date();
  const m = base.getMonth();             // 0~11
  const hh = base.getHours();
  const mm = base.getMinutes();

  // 월운 리스트는 "해당 해 2월 ~ 다음 해 1월" 구조.
  // 기존 월이 1월(0)이면, targetYear의 "다음해 1월"에 매핑해야 맞음.
  if (m === 0) {
    return new Date(targetYear + 1, 0, 10, hh, mm, 0, 0); // 다음해 1월 10일
  }
  // 그 외엔 targetYear의 같은 달 10일로 고정(경계 회피)
  return new Date(targetYear, m, 10, hh, mm, 0, 0);
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

  /* 1) 리스트 ‘고정(sticky)’: 부모가 일시적으로 빈 배열을 내려줘도 이전 리스트 유지 */
  const [stickyList, setStickyList] = useState<{ at: Date; gz: string }[]>(() => list);
  useEffect(() => {
    if (list && list.length > 0) setStickyList(list);
  }, [list]);

  /* 2) 최종 뷰 리스트: 우선 현재 list, 없으면 sticky, 그것마저 없으면 한 해짜리 fallback */
  // 출생/좌표 등 파생값
  const birthRaw = toCorrected(data);
  const birth = useMemo(
    () => withSafeClockForUnknownTime(data, birthRaw),
    [data, birthRaw]
  );
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

  /* 6) 도메인 파생값(표시/신살 등) — ✅ 안전한 일간/기준지지 */
  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "조자시/야자시";
  const dayStem = useMemo<Stem10sin>(() => {
    const dayGz = getDayGanZhi(birth, rule);
    return dayGz.charAt(0) as Stem10sin;
  }, [birth, rule]);

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

          return (
            <div
              key={`${year}-${ev.gz || i}`}
              onClick={() => {
                // 1) 화면 플리커 방지용(선택 표시 즉시 반영)
                setLocalIndex(i);

                // 2) 현재 store의 month를 유지한 채 연도만 targetYear로 교체
                const targetAt = buildDateKeepingMonth(year, date);

                // 3) 전역 상태 업데이트 (gz는 해당 targetAt 기준 연간지)
                setFromEvent({ at: targetAt, gz: getYearGanZhi(targetAt, lon) }, "세운");

                // 4) 부모 콜백은 한 틱 뒤(레이스 방지)
                if (onSelect) {
                  if (typeof queueMicrotask !== "undefined") queueMicrotask(() => onSelect(year));
                  else Promise.resolve().then(() => onSelect(year));
                }
              }}
              className={`flex-1 rounded-sm desk:rounded-lg bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer ${
                isActive ? "border border-yellow-500" : "border border-neutral-200 dark:border-neutral-800 hover:border-yellow-500"
              }`}
              title={`${yearGZ} · ${ev.at.toLocaleDateString()}`}
            >
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
                  <span className={`text-[20px] md:text-xl text-white ${stemFont}`}>{stemDisp}</span>
                </div>

                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border ${getElementColor(branch, "branch", settings)}`}>
                  <span className={`text-[20px] md:text-xl text-white ${branchFont}`}>{branchDisp}</span>
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
