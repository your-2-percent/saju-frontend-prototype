// features/luck/WolwoonList.tsx
import { useMemo, useState, useEffect } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { getMonthGanZhi, getYearGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { toDayStem, toCorrected } from "@/shared/domain/meongsik";
import type { DayBoundaryRule } from "@/shared/type";

// 십이운성/십이신살
import * as Twelve from "@/shared/domain/간지/twelve";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";

// ✅ 전역 설정 (SajuChart와 동일 소스)
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";

import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { findActiveIndexByDate } from "@/features/luck/utils/active";

/* ===== 한자/한글 변환 + 음간/음지 ===== */
const STEM_H2K: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};
const BRANCH_H2K: Record<string, string> = {
  "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
  "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
};
const STEM_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(STEM_H2K).map(([h,k]) => [k,h]));
const BRANCH_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(BRANCH_H2K).map(([h,k]) => [k,h]));

function toDisplayChar(value: string, kind: "stem" | "branch", charType: "한자" | "한글") {
  if (charType === "한글") {
    return kind === "stem" ? (STEM_H2K[value] ?? value) : (BRANCH_H2K[value] ?? value);
  }
  return kind === "stem" ? (STEM_K2H[value] ?? value) : (BRANCH_K2H[value] ?? value);
}

const YIN_STEMS_ALL = new Set<string>(["乙","丁","己","辛","癸","을","정","기","신","계"]);
const YIN_BRANCHES_ALL = new Set<string>(["丑","卯","巳","未","酉","亥","축","묘","사","미","유","해"]);
function isYinUnified(value: string, kind: "stem" | "branch") {
  return kind === "stem" ? YIN_STEMS_ALL.has(value) : YIN_BRANCHES_ALL.has(value);
}

/* ===== EraType 안전 매핑 (SajuChart 동일) ===== */
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
    return mode === "classic"
      ? (exported.Classic ?? exported.classic)!
      : (exported.Modern ?? exported.modern)!;
  }
  return (mode as unknown) as Twelve.EraType;
}

/* ===== 컴포넌트 ===== */
export default function WolwoonList({
  data,
  activeYear,
  onSelect,
}: {
  data: MyeongSik;
  activeYear: number | null;
  onSelect?: (year: number, month: number) => void;
}) {
  const settings = useSettingsStore((s) => s.settings);
  const [/*activeIndex*/, setActiveIndex] = useState<number | null>(null);

  const lon =
    !data.birthPlace || data.birthPlace.name === "모름" || data.birthPlace.lon === 0
      ? 127.5
      : data.birthPlace.lon;

  const dayStem = toDayStem(data) as Stem10sin;

  // 신살 기준 지지(일지/연지)
  const birth = toCorrected(data);
  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "야자시";
  const baseBranch: Branch10sin = (
    settings.sinsalBase === "일지"
      ? getDayGanZhi(birth, rule).charAt(1)
      : getYearGanZhi(birth, lon).charAt(1)
  ) as Branch10sin;

  // 월운 리스트 (해당 연도 2월~다음해 1월)
  const list = useMemo(() => {
    if (!activeYear) return [];
    const arr: { at: Date; gz: string }[] = [];
    for (let m = 2; m <= 13; m++) {
      const y = m === 13 ? activeYear + 1 : activeYear;
      const mon = m === 13 ? 1 : m;
      const dt = new Date(y, mon - 1, 10);
      const gz = getMonthGanZhi(dt, lon);
      arr.push({ at: dt, gz });
    }
    return arr;
  }, [activeYear, lon]);

  // 현재 월 자동 active
  useEffect(() => {
    if (!list.length) return;
    setActiveIndex(null);
    const now = new Date();
    const idx = list.findIndex((it, i) => {
      const next = list[i + 1]?.at;
      return now >= it.at && (!next || now < next);
    });
    if (activeYear === now.getFullYear()) {
      setActiveIndex(idx !== -1 ? idx : null);
    }
  }, [list, activeYear]);

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
          const label = `${ev.at.getMonth() + 1}월`;
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
              key={ev.gz}
              onClick={() => {
                setActiveIndex(i);
                onSelect?.(ev.at.getFullYear(), ev.at.getMonth() + 1);
                setFromEvent(ev, "월운");
              }}
              className={`flex-1 rounded-sm desk:rounded-lg bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer ${
                isActive
                  ? "border border-yellow-500"
                  : "border border-neutral-200 dark:border-neutral-800 hover:border-yellow-500"
              }`}
              title={`${ev.gz} · ${ev.at.toLocaleDateString()}`}
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
                  <span className={`text-base md:text-xl text-white ${stemFont}`}>
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
                  <span className={`text-base md:text-xl text-white ${branchFont}`}>
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
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
