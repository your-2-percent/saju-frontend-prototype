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
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";

// 십이운성/십이신살
import * as Twelve from "@/shared/domain/간지/twelve";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";

// ✅ 전역 설정 스토어 (SajuChart와 동일)
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";

import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { findActiveIndexByDate } from "@/features/luck/utils/active";

/* ===== 한자/한글 변환 + 음간/음지 판별 ===== */
const STEM_H2K: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};
const BRANCH_H2K: Record<string, string> = {
  "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
  "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
};
const STEM_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(STEM_H2K).map(([h, k]) => [k, h]));
const BRANCH_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(BRANCH_H2K).map(([h, k]) => [k, h]));

function toDisplayChar(
  value: string,
  kind: "stem" | "branch",
  charType: "한자" | "한글"
) {
  if (charType === "한글") {
    return kind === "stem" ? (STEM_H2K[value] ?? value) : (BRANCH_H2K[value] ?? value);
  }
  return kind === "stem" ? (STEM_K2H[value] ?? value) : (BRANCH_K2H[value] ?? value);
}

const YIN_STEMS_ALL = new Set<string>(["乙", "丁", "己", "辛", "癸", "을", "정", "기", "신", "계"]);
const YIN_BRANCHES_ALL = new Set<string>(["丑", "卯", "巳", "未", "酉", "亥", "축", "묘", "사", "미", "유", "해"]);
function isYinUnified(value: string, kind: "stem" | "branch") {
  return kind === "stem" ? YIN_STEMS_ALL.has(value) : YIN_BRANCHES_ALL.has(value);
}

/* ===== EraType 안전 매핑 (SajuChart와 동일) ===== */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
type EraRuntime = {
  Classic?: Twelve.EraType;
  Modern?: Twelve.EraType;
  classic?: Twelve.EraType;
  modern?: Twelve.EraType;
};
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
  // union string 타입인 경우 그대로 호환
  return mode as unknown as Twelve.EraType;
}

const DEBUG = false;
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

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

              <div className="p-2 flex flex-col items-center gap-1">
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
                  <span className={`text-[20px] md:text-xl text-white ${stemFont}`}>
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
                  <span className={`text-[20px] md:text-xl text-white ${branchFont}`}>
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
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 text-center space-y-0.5 text-nowrap">
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
