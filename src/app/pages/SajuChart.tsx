// features/myeongsik/SajuChart.tsx
import { useMemo, useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import type { MyeongSik } from "@/shared/lib/storage";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/간지/공통";
import { getCorrectedDate, isDST } from "@/shared/lib/core/timeCorrection";
import type { DayBoundaryRule } from "@/shared/type";
import { getElementColor, getSipSin } from "@/shared/domain/간지/utils";
import type { Stem10sin, Branch10sin } from "@/shared/domain/간지/utils";
import { useCurrentUnCards } from "@/features/luck/luck-make";
import { formatLocalYMDHM } from "@/shared/utils";
import { HiddenStems } from "@/shared/domain/hidden-stem";
import * as solarlunar from "solarlunar";

// 십이운성/십이신살
import * as Twelve from "@/shared/domain/간지/twelve";
import {
  getTwelveUnseong,
  getTwelveShinsalBySettings,
} from "@/shared/domain/간지/twelve";
import type { EraType } from "@/shared/domain/간지/twelve";

// ✅ 전역 설정 스토어 (Zustand)
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";

import { useGlobalLuck } from "@/features/luck/useGlobalLuck";

type Props = {
  data: MyeongSik;
  /** 부모가 강제로 테이블을 지정하고 싶을 때만 넘김. 기본은 data.mingSikType */
  hourTable?: DayBoundaryRule;
};

/* ===== solarlunar 안전 래퍼 (CJS/ESM 호환, 윤달 미사용) ===== */
type Lunar2SolarRaw = { cYear: number; cMonth: number; cDay: number; isLeap?: boolean };
type L2SFn = (y: number, m: number, d: number, isLeap?: boolean) => unknown;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function hasDefault(v: unknown): v is { default: unknown } {
  return isRecord(v) && "default" in v;
}
function hasL2S(v: unknown): v is { lunar2solar: L2SFn } {
  return isRecord(v) && typeof (v as Record<string, unknown>).lunar2solar === "function";
}
function assertL2SResult(v: unknown): Lunar2SolarRaw {
  if (!isRecord(v)) throw new Error("Invalid lunar2solar result");
  const y = v["cYear"], m = v["cMonth"], d = v["cDay"];
  if (typeof y !== "number" || typeof m !== "number" || typeof d !== "number") {
    throw new Error("Invalid lunar2solar fields");
  }
  const isLeapVal = v["isLeap"];
  return { cYear: y, cMonth: m, cDay: d, isLeap: typeof isLeapVal === "boolean" ? isLeapVal : undefined };
}
function pickSolarLunar(mod: unknown): { lunar2solar: (y: number, m: number, d: number, isLeap: boolean) => Lunar2SolarRaw } {
  const base = hasDefault(mod) ? (mod as { default: unknown }).default : mod;
  if (!hasL2S(base)) throw new Error("solarlunar.lunar2solar not found");
  return {
    lunar2solar: (y: number, m: number, d: number, isLeap: boolean) => {
      const raw = (base as { lunar2solar: L2SFn }).lunar2solar(y, m, d, isLeap);
      return assertL2SResult(raw);
    },
  };
}
const SL = pickSolarLunar(solarlunar);

function lunarToSolarStrict(y: number, m: number, d: number) {
  const out = SL.lunar2solar(y, m, d, false);
  return { y: out.cYear, m: out.cMonth, d: out.cDay };
}

/* ===== 한자/한글 변환 + 음양 판별 ===== */
const STEM_H2K: Record<string, string> = {
  "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
  "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};
const BRANCH_H2K: Record<string, string> = {
  "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
  "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
};
// 역변환(한글→한자)
const STEM_K2H: Record<string, string> = Object.fromEntries(Object.entries(STEM_H2K).map(([h, k]) => [k, h]));
const BRANCH_K2H: Record<string, string> = Object.fromEntries(Object.entries(BRANCH_H2K).map(([h, k]) => [k, h]));

// 음간/음지: 문자 종류 무관하게 판별하도록 통합 셋
const YIN_STEMS_ALL = new Set<string>(["乙","丁","己","辛","癸","을","정","기","신","계"]);
const YIN_BRANCHES_ALL = new Set<string>(["丑","卯","巳","未","酉","亥","축","묘","사","미","유","해"]);

function toDisplayChar(value: string, kind: "stem" | "branch", charType: "한자" | "한글") {
  if (charType === "한글") {
    // 한자 → 한글 (이미 한글이면 그대로)
    return kind === "stem" ? (STEM_H2K[value] ?? value) : (BRANCH_H2K[value] ?? value);
  } else {
    // 한글 → 한자 (이미 한자면 그대로)
    return kind === "stem" ? (STEM_K2H[value] ?? value) : (BRANCH_K2H[value] ?? value);
  }
}
function isYinUnified(value: string, kind: "stem" | "branch") {
  return kind === "stem" ? YIN_STEMS_ALL.has(value) : YIN_BRANCHES_ALL.has(value);
}

/** EraType 안전 매핑: enum/union 모두 대응 (no `as any`) */
type EraRuntime = { Classic?: EraType; Modern?: EraType; classic?: EraType; modern?: EraType };
function isEraRuntime(v: unknown): v is EraRuntime {
  return isRecord(v) && ("Classic" in v || "Modern" in v || "classic" in v || "modern" in v);
}
function mapEra(mode: "classic" | "modern"): EraType {
  const exported = (Twelve as unknown as Record<string, unknown>)["EraType"];
  if (isEraRuntime(exported)) {
    return mode === "classic"
      ? (exported.Classic ?? exported.classic)!
      : (exported.Modern ?? exported.modern)!;
  }
  // union string type이면 그대로 호환
  return (mode as unknown) as EraType;
}

/* ===== 상단 노출(원국/대운/세운/월운…까지) 필터 ===== */
const LEVEL: Record<"대운" | "세운" | "월운", number> = { "대운": 1, "세운": 2, "월운": 3 };
function getCardLevel(label: string): number {
  if (label.includes("월운")) return 3;
  if (label.includes("세운")) return 2;
  if (label.includes("대운")) return 1;
  // 기타 카드는 기본 1로 취급(대운 레벨)
  return 1;
}

export default function SajuChart({ data, hourTable }: Props) {
  // ✅ 진입 즉시 안전 변환
  const ms: MyeongSik | null = data ?? null;

  if (ms) {
    if (!(ms.dateObj instanceof Date)) {
      ms.dateObj = ms.dateObj ? new Date(ms.dateObj) : new Date();
    }
    if (!(ms.corrected instanceof Date)) {
      ms.corrected = ms.corrected ? new Date(ms.corrected) : new Date();
    }
  }

  const safeDate = ms?.dateObj instanceof Date && !isNaN(ms.dateObj.getTime())
  ? ms.dateObj
  : null;

console.log("🟡 safeDate:", safeDate, ms?.dateObj);

  const { name, birthDay, birthTime, birthPlace, gender, calendarType, mingSikType } = data;

  // ✅ 전역 설정 구독
  const settings = useSettingsStore((s) => s.settings);

  // ✅ 명식 기준 (data > prop > 기본)
  const rule: DayBoundaryRule = (mingSikType as DayBoundaryRule) ?? hourTable ?? "야자시";

  const lon =
    !birthPlace || birthPlace.name === "모름" || !birthPlace.lon
      ? 127.5
      : birthPlace.lon;

  // 1) 출생 ‘양력’ 날짜를 먼저 구해서 DST 기본값 판단
  const { solarY, solarM, solarD } = useMemo(() => {
    
    let y = Number(birthDay?.slice(0, 4) ?? 2000);
    let m = Number(birthDay?.slice(4, 6) ?? 1);
    let d = Number(birthDay?.slice(6, 8) ?? 1);
    if (calendarType === "lunar") {
      const s = lunarToSolarStrict(y, m, d);
      y = s.y; m = s.m; d = s.d;
    }
    return { solarY: y, solarM: m, solarD: d };
  }, [birthDay, calendarType]);

  // 2) DST 토글 (초기값만 자동 감지, 이후엔 사용자가 제어)
  const [useDST, setUseDST] = useState<boolean>(false);

  useEffect(() => {
    if (solarY && solarM && solarD) {
      setUseDST(isDST(solarY, solarM, solarD));
    }
  }, [solarY, solarM, solarD]);

  // 3) 원국 계산
  const parsed = useMemo(() => {

    const isUnknownTime = !data.birthTime || data.birthTime === "모름";
    const isUnknownPlace = !data.birthPlace;
    let y = Number(data.birthDay!.slice(0, 4));
    let mo = Number(data.birthDay!.slice(4, 6));
    let d = Number(data.birthDay!.slice(6, 8));

    if (data.calendarType === "lunar") {
      const solar = lunarToSolarStrict(y, mo, d);
      y = solar.y; mo = solar.m; d = solar.d;
    }

    const hh = isUnknownTime ? 0 : Number(data.birthTime!.slice(0, 2) || "0");
    const mi = isUnknownTime ? 0 : Number(data.birthTime!.slice(2, 4) || "0");

    const rawBirth = new Date(y, mo - 1, d, hh, mi, 0, 0);

    const lonVal = isUnknownPlace || !data.birthPlace || data.birthPlace.lon === 0
      ? 127.5
      : data.birthPlace.lon;

    let corrected = data.corrected ?? getCorrectedDate(rawBirth, lonVal);

    if (useDST) {
      corrected = new Date(corrected.getTime() - 60 * 60 * 1000);
    }

    const hourRule: DayBoundaryRule = (data.mingSikType ?? "야자시") as DayBoundaryRule;

    const yearGZ = getYearGanZhi(corrected as Date, lonVal);
    const monthGZ = getMonthGanZhi(corrected as Date, lonVal);
    const dayGZ = getDayGanZhi(corrected as Date, hourRule);
    const hourGZ = isUnknownTime ? null : getHourGanZhi(corrected as Date, hourRule);

    return {
      corrected, // 보정시 표기도 이 값 사용
      year:  { stem: yearGZ.charAt(0),  branch: yearGZ.charAt(1) },
      month: { stem: monthGZ.charAt(0), branch: monthGZ.charAt(1) },
      day:   { stem: dayGZ.charAt(0),   branch: dayGZ.charAt(1) },
      hour:  hourGZ ? { stem: hourGZ.charAt(0), branch: hourGZ.charAt(1) } : null,
    };
  }, [useDST, data.birthDay, data.birthPlace, data.birthTime, data.calendarType, data.mingSikType, data.corrected]);

  const showDSTButton = isDST(solarY, solarM, solarD);

  // ── 십이운성/십이신살 계산
  const dayStem = parsed.day.stem as Stem10sin;
  const baseBranchForShinsal =
    (settings.sinsalBase === "일지" ? parsed.day.branch : parsed.year.branch) as Branch10sin;

  const calcUnseong = (branch: string) =>
    settings.showSibiUnseong ? getTwelveUnseong(dayStem, branch) : null;

  const calcShinsal = (targetBranch: string) =>
    settings.showSibiSinsal
      ? getTwelveShinsalBySettings({
          baseBranch: baseBranchForShinsal,
          targetBranch,
          era: mapEra(settings.sinsalMode), // ★ EraType 안전 매핑
          gaehwa: settings.sinsalBloom,
        })
      : null;

  const unCards = useCurrentUnCards(data, rule);
  const isDesktop = useMediaQuery({ query: "(min-width: 992px)" });

  // 지장간 모드 매핑 ("regular" → "main", "all" → "all")
  const hiddenMode: "all" | "main" = settings.hiddenStem === "regular" ? "main" : "all";

  // 노출 단계별 카드 필터링
  const exposure = settings.exposure; // "원국" | "대운" | "세운" | "월운"
  const exposureLevel = exposure === "원국" ? 0 : LEVEL[exposure as "대운" | "세운" | "월운"];
  const filteredCards = exposureLevel === 0
    ? []
    : unCards.filter((c) => getCardLevel(c.label) <= exposureLevel);

  const handleDSTToggle = () => setUseDST((prev) => !prev);

  //const ms: MyeongSik | null = data ?? null;

  const dateObj = ms?.dateObj instanceof Date ? ms.dateObj : new Date(ms?.dateObj ?? "");
  //const corrected = ms?.corrected instanceof Date ? ms.corrected : new Date(ms?.corrected ?? "");

  if (!dateObj || isNaN(dateObj.getTime())) {
    console.error("⚠ Invalid dateObj in SajuChart:", ms?.dateObj);
  }
  const luck = useGlobalLuck(ms, hourTable);

  // 예시: 차트에 표기할 운 간지(대/세/월/일)
  const daeGz = luck.dae.gz;
  const seGz  = luck.se.gz;
  const wolGz = luck.wol.gz;

  return (
    <div className="w-full max-w-[640px] mx-auto">
      {/* 헤더 */}
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2 p-2">
        <div>
          <div className="text-md desk:text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {name?.trim() || "이름없음"}{" "}
            <span className="text-sm text-neutral-500 dark:text-neutral-400 mr-2">({gender})</span>
            {/* ✅ DST 조건부 버튼 */}
            {showDSTButton && (
              <button
                onClick={handleDSTToggle}
                className={`px-2 py-0.5 text-xs rounded cursor-pointer border
                  ${useDST
                    ? "bg-red-600 text-white border-red-600"
                    : "bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700"
                  }`
                }
              >
                썸머타임 {useDST ? "ON" : "OFF"}
              </button>
            )}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            {formatBirthDisplay(birthDay, birthTime)}
            {birthPlace?.name ? ` · ${"출생지: " + birthPlace.name}` : ""}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
            보정시: {formatLocalYMDHM(parsed.corrected)}
          </div>
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          기준 경도: {lon.toFixed(2)}° · {rule} 기준
        </div>
      </div>

      {/* 운 + 원국 */}
      <div
        className={`grid gap-2 p-2 desk:p-0 ${
          filteredCards.length === 0
            ? "grid-cols-1"
            : filteredCards.length === 1
            ? "grid-cols-[2fr_8fr]"
            : filteredCards.length === 2
            ? "grid-cols-[3.5fr_6.5fr]"
            : "grid-cols-[4fr_5fr]" // 3개 이상
        }`}
      >
        {/* 운 (노출 설정에 따라 필터링된 카드만) */}
        {filteredCards.length > 0 && (
          isDesktop ? (
            <section className="rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow">
              <div className="px-3 py-1 text-md text-neutral-600 dark:text-neutral-300"><b>운</b></div>
              <div className="pb-2">
                <div
                  className={`grid gap-2 p-3 ${
                    filteredCards.length === 1
                      ? "grid-cols-1"
                      : filteredCards.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-3"
                  }`}
                >
                  {filteredCards.map((c) => {
                    let stem = c.data.stem as Stem10sin;
                    let branch = c.data.branch as Branch10sin;

                    // ✅ 피커 전역 간지로 덮어쓰기
                    if (c.label.includes("대운") && daeGz) {
                      stem = daeGz.charAt(0) as Stem10sin;
                      branch = daeGz.charAt(1) as Branch10sin;
                    }
                    if (c.label.includes("세운") && seGz) {
                      stem = seGz.charAt(0) as Stem10sin;
                      branch = seGz.charAt(1) as Branch10sin;
                    }
                    if (c.label.includes("월운") && wolGz) {
                      stem = wolGz.charAt(0) as Stem10sin;
                      branch = wolGz.charAt(1) as Branch10sin;
                    }
                    // 일운 카드도 따로 있다면 동일하게 ilGz 적용

                    const unseong = calcUnseong(branch);
                    const shinsal = calcShinsal(branch);
                    return (
                      <div
                        key={c.key}
                        className="rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                      >
                        <div className="px-2 py-1 text-center text-xs tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                          {c.label}
                        </div>
                        <div className="p-2 flex flex-col items-center gap-1">
                          {settings.showSipSin && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {getSipSin(dayStem, { stem })}
                            </div>
                          )}
                          <Cell value={stem} kind="stem" charType={settings.charType} thinEum={settings.thinEum} />
                          <Cell value={branch} kind="branch" charType={settings.charType} thinEum={settings.thinEum} />
                          <HiddenStems branch={branch} dayStem={dayStem} mode={hiddenMode} mapping={settings.hiddenStemMode} />
                          {(settings.showSibiUnseong || settings.showSibiSinsal) && (
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 text-center space-y-0.5">
                              {settings.showSibiUnseong && <div>{unseong}</div>}
                              {settings.showSibiSinsal && <div>{shinsal}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          ) : (
            <div className="rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow">
              <div className="px-3 py-1 text-[11px] text-neutral-600 dark:text-neutral-300">운</div>
              <div className="pb-2">
                <div
                  className={`grid gap-1 p-0 ${
                    filteredCards.length === 1
                      ? "grid-cols-1"
                      : filteredCards.length === 2
                      ? "grid-cols-2"
                      : "grid-cols-3"
                  }`}
                >
                  {filteredCards.map((c) => {
                    const stem = c.data.stem as Stem10sin;
                    const branch = c.data.branch as Branch10sin;
                    const unseong = calcUnseong(branch);
                    const shinsal = calcShinsal(branch);
                    return (
                      <div
                        key={c.key}
                        className="rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                      >
                        <div className="py-1 text-center text-xs tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                          {c.label}
                        </div>
                        <div className="py-2 flex flex-col items-center gap-1">
                          {settings.showSipSin && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {getSipSin(dayStem, { stem })}
                            </div>
                          )}
                          <Cell value={stem} kind="stem" charType={settings.charType} thinEum={settings.thinEum} />
                          <Cell value={branch} kind="branch" charType={settings.charType} thinEum={settings.thinEum} />
                          <HiddenStems branch={branch} dayStem={dayStem} mode={hiddenMode} mapping={settings.hiddenStemMode} />
                          {(settings.showSibiUnseong || settings.showSibiSinsal) && (
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 text-center space-y-0.5">
                              {settings.showSibiUnseong && <div>{unseong}</div>}
                              {settings.showSibiSinsal && <div>{shinsal}</div>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )
        )}

        {/* 원국 */}
        {isDesktop ? (
          <section className="flex-2 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow">
            <div className="px-3 py-1 text-md text-neutral-600 dark:text-neutral-300"><b>원국</b></div>
            <div className="pb-2">
              <div className="grid grid-cols-4 gap-2 p-3">
                {[
                  { key: "hour", label: "시주", data: parsed.hour },
                  { key: "day", label: "일주", data: parsed.day },
                  { key: "month", label: "월주", data: parsed.month },
                  { key: "year", label: "연주", data: parsed.year },
                ].map((c) => (
                  <div
                    key={c.key}
                    className="rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                  >
                    <div className="px-2 py-1 text-center text-xs tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                      {c.label}
                    </div>
                    <div className="p-2 flex flex-col items-center gap-1">
                      {c.data ? (
                        <>
                          {settings.showSipSin && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {getSipSin(dayStem, { stem: c.data.stem as Stem10sin })}
                            </div>
                          )}
                          <Cell value={c.data.stem} kind="stem" charType={settings.charType} thinEum={settings.thinEum} />
                          <Cell value={c.data.branch} kind="branch" charType={settings.charType} thinEum={settings.thinEum} />
                          <HiddenStems branch={c.data.branch as Branch10sin} dayStem={dayStem} mode={hiddenMode} mapping={settings.hiddenStemMode} />
                          {(settings.showSibiUnseong || settings.showSibiSinsal) && (
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 text-center space-y-0.5">
                              {settings.showSibiUnseong && <div>{getTwelveUnseong(dayStem, c.data.branch)}</div>}
                              {settings.showSibiSinsal && (
                                <div>
                                  {getTwelveShinsalBySettings({
                                    baseBranch: (settings.sinsalBase === "일지" ? parsed.day.branch : parsed.year.branch) as Branch10sin,
                                    targetBranch: c.data.branch,
                                    era: mapEra(settings.sinsalMode),
                                    gaehwa: settings.sinsalBloom,
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">시간 미상</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : (
          <div className="flex-2 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700 shadow">
            <div className="px-3 py-1 text-[11px] text-neutral-600 dark:text-neutral-300">원국</div>
            <div className="px-1 pb-2">
              <div className="grid grid-cols-4 gap-1">
                {[
                  { key: "hour", label: "시주", data: parsed.hour },
                  { key: "day", label: "일주", data: parsed.day },
                  { key: "month", label: "월주", data: parsed.month },
                  { key: "year", label: "연주", data: parsed.year },
                ].map((c) => (
                  <div
                    key={c.key}
                    className="rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden"
                  >
                    <div className="py-1 text-center text-xs tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300">
                      {c.label}
                    </div>
                    <div className="py-2 flex flex-col items-center gap-1">
                      {c.data ? (
                        <>
                          {settings.showSipSin && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400">
                              {getSipSin(dayStem, { stem: c.data.stem as Stem10sin })}
                            </div>
                          )}
                          <Cell value={c.data.stem} kind="stem" charType={settings.charType} thinEum={settings.thinEum} />
                          <Cell value={c.data.branch} kind="branch" charType={settings.charType} thinEum={settings.thinEum} />
                          <HiddenStems branch={c.data.branch as Branch10sin} dayStem={dayStem} mode={hiddenMode} mapping={settings.hiddenStemMode} />
                          {(settings.showSibiUnseong || settings.showSibiSinsal) && (
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 text-center space-y-0.5">
                              {settings.showSibiUnseong && <div>{getTwelveUnseong(dayStem, c.data.branch)}</div>}
                              {settings.showSibiSinsal && (
                                <div>
                                  {getTwelveShinsalBySettings({
                                    baseBranch: (settings.sinsalBase === "일지" ? parsed.day.branch : parsed.year.branch) as Branch10sin,
                                    targetBranch: c.data.branch,
                                    era: mapEra(settings.sinsalMode),
                                    gaehwa: settings.sinsalBloom,
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">시간 미상</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** 셀: 글자 타입(한자/한글) + 음간/음지 얇게 */
function Cell({
  value,
  kind,
  charType,
  thinEum,
}: {
  value: string;
  kind: "stem" | "branch";
  charType: "한자" | "한글";
  thinEum: boolean;
}) {
  const color = getElementColor(value, kind);
  const display = toDisplayChar(value, kind, charType);
  const isYin = isYinUnified(value, kind); // 원본값 기준(한자/한글 상관없음)
  const weight = thinEum && isYin ? "font-thin" : "font-bold";

  return (
    <div className={`w-11 h-11 sm:w-14 sm:h-14 md:w-14 md:h-14 rounded-md ${color} flex items-center justify-center border border-neutral-200 dark:border-neutral-800`}>
      <span className={`text-[24px] md:text-2xl ${weight} text-white`}>
        {display}
      </span>
    </div>
  );
}

function formatBirthDisplay(yyyymmdd?: string, hhmm?: string) {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  const date = `${y}-${m}-${d}`;
  if (!hhmm || hhmm === "모름" || !/^\d{4}$/.test(hhmm)) return date;
  return `${date} ${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

