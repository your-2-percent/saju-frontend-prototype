// features/luck/SewoonList.tsx
import { useState, useEffect, useMemo } from "react";
import { getSewoonListInDaewoon } from "@/features/luck/useSewoonList";
import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { toDayStem, toCorrected } from "@/shared/domain/meongsik";
import { getYearGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";

// 십이운성/십이신살
import * as Twelve from "@/shared/domain/간지/twelve";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";

// ✅ 전역 설정 스토어(SajuChart와 동일 소스)
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";

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

/* ===== EraType 안전 매핑 (SajuChart와 동일) ===== */
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
export default function SewoonList({
  data,
  activeDaeIndex,
  onSelect,
}: {
  data: MyeongSik;
  activeDaeIndex: number | null;
  onSelect?: (year: number) => void;
}) {
  // 전역 설정
  const settings = useSettingsStore((s) => s.settings);
  const {
    charType,
    thinEum,
    showSipSin,
    showSibiUnseong,
    showSibiSinsal,
    sinsalBase,
    sinsalMode,
    sinsalBloom,
  } = settings;

  const daeList = useDaewoonList(data);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const list = useMemo(() => {
    if (activeDaeIndex === null) return [];
    const currDae = daeList[activeDaeIndex];
    const nextDae = daeList[activeDaeIndex + 1];
    if (!currDae) return [];
    return getSewoonListInDaewoon(currDae, nextDae);
  }, [daeList, activeDaeIndex]);

  // 현재 연도 active
  useEffect(() => {
    if (!list.length) return;

    setActiveIndex(null);

    const now = new Date();
    const idx = list.findIndex((it, i) => {
      const next = list[i + 1]?.at;
      return now >= it.at && (!next || now < next);
    });

    // 현재 대운 범위일 때만 강조
    const nowDaeIndex = daeList.findIndex(d => {
      const next = daeList[daeList.indexOf(d) + 1]?.at;
      return now >= d.at && (!next || now < next);
    });

    if (activeDaeIndex !== null && activeDaeIndex === nowDaeIndex) {
      setActiveIndex(idx !== -1 ? idx : null);
    }
  }, [list, activeDaeIndex, daeList]);

  const dayStem = toDayStem(data) as Stem10sin;

  // 신살 기준 지지(일지/연지)
  const birth = toCorrected(data);
  const lon =
    !data.birthPlace || data.birthPlace.name === "모름" || data.birthPlace.lon === 0
      ? 127.5
      : data.birthPlace.lon;
  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "자시";
  const baseBranch: Branch10sin = (
    sinsalBase === "일지"
      ? getDayGanZhi(birth, rule).charAt(1)
      : getYearGanZhi(birth, lon).charAt(1)
  ) as Branch10sin;

  if (!dayStem) return null;

  return (
    <div className="w-full max-w-[640px] mx-auto rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden">
      <div className="px-3 py-2 text-sm font-semibold tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300">
        세운리스트
      </div>

      <div className="flex gap-0.5 desk:gap-1 py-2 desk:p-2 flex-row-reverse">
        {list.map((it, i) => {
          // 연도
          const year = it.at.getFullYear();

          // ✅ 여기서 그 해의 연주 간지 재계산(7월 1일 기준: 입춘 경계 이슈 회피)
          const yearGZ = getYearGanZhi(new Date(year, 6, 1), lon);
          const stem = yearGZ.charAt(0) as Stem10sin;
          const branch = yearGZ.charAt(1) as Branch10sin;

          const isActive = i === activeIndex;

          const stemDisp = toDisplayChar(stem, "stem", charType);
          const branchDisp = toDisplayChar(branch, "branch", charType);

          const yinStem = isYinUnified(stem, "stem");
          const yinBranch = isYinUnified(branch, "branch");
          const stemFont = thinEum && yinStem ? "font-thin" : "font-bold";
          const branchFont = thinEum && yinBranch ? "font-thin" : "font-bold";

          const unseong = showSibiUnseong ? getTwelveUnseong(dayStem, branch) : null;
          const shinsal = showSibiSinsal
            ? getTwelveShinsalBySettings({
                baseBranch,
                targetBranch: branch,
                era: mapEra(sinsalMode),
                gaehwa: !!sinsalBloom,
              })
            : null;

          return (
            <div
              key={i}
              onClick={() => {
                setActiveIndex(i);
                onSelect?.(year);
              }}
              className={`flex-1 rounded-sm desk:rounded-lg bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer ${
                isActive
                  ? "border border-yellow-500"
                  : "border border-neutral-200 dark:border-neutral-800 hover:border-yellow-500"
              }`}
              // ✅ 타이틀도 재계산한 간지 표시
              title={`${yearGZ} · ${it.at.toLocaleDateString()}`}
            >
              {/* 연도 */}
              <div className="desk:px-2 py-1 text-center text-[10px] bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                {year}
              </div>

              <div className="p-2 flex flex-col items-center gap-1">
                {/* 십신(천간) */}
                {showSipSin && (
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap">
                    {getSipSin(dayStem, { stem })}
                  </div>
                )}

                {/* 천간 */}
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 ${getElementColor(
                    stem,
                    "stem"
                  )}`}
                >
                  <span className={`text-xs sm:text-lg md:text-xl text-white ${stemFont}`}>
                    {stemDisp}
                  </span>
                </div>

                {/* 지지 */}
                <div
                  className={`w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 ${getElementColor(
                    branch,
                    "branch"
                  )}`}
                >
                  <span className={`text-xs sm:text-lg md:text-xl text-white ${branchFont}`}>
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
                  <div className="text-[10px] text-neutral-500 dark:text-neutral-400 text-center text-nowrap">
                    {showSibiUnseong && unseong && <div>{unseong}</div>}
                    {showSibiSinsal && shinsal && <div>{shinsal}</div>}
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
