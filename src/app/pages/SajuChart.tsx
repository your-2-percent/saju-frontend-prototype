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
import { lunarToSolarStrict, isRecord } from "@/shared/lib/calendar/lunar";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { 시주매핑_자시, 시주매핑_인시 } from "@/shared/domain/간지/const";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";

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

/* ===== 납음오행 매핑 ===== */
type ElemKR = "목" | "화" | "토" | "금" | "수";
type Nabeum = { label: string; elem: ElemKR };

const NABEUM_PAIRS: Array<{ keys: [string, string]; label: string; elem: ElemKR }> = [
  { keys: ["갑자","을축"], label: "해중금", elem: "금" },
  { keys: ["병인","정묘"], label: "노중화", elem: "화" },
  { keys: ["무진","기사"], label: "대림목", elem: "목" },
  { keys: ["경오","신미"], label: "노방토", elem: "토" },
  { keys: ["임신","계유"], label: "검봉금", elem: "금" },
  { keys: ["갑술","을해"], label: "산두화", elem: "화" },
  { keys: ["병자","정축"], label: "간하수", elem: "수" },
  { keys: ["무인","기묘"], label: "성두토", elem: "토" },
  { keys: ["경진","신사"], label: "백납금", elem: "금" },
  { keys: ["임오","계미"], label: "양류목", elem: "목" },
  { keys: ["갑신","을유"], label: "천중수", elem: "수" },
  { keys: ["병술","정해"], label: "옥상토", elem: "토" },
  { keys: ["무자","기축"], label: "벽력화", elem: "화" },
  { keys: ["경인","신묘"], label: "송백목", elem: "목" },
  { keys: ["임진","계사"], label: "장류수", elem: "수" },
  { keys: ["갑오","을미"], label: "사중금", elem: "금" },
  { keys: ["병신","정유"], label: "산하화", elem: "화" },
  { keys: ["무술","기해"], label: "평지목", elem: "목" },
  { keys: ["경자","신축"], label: "벽상토", elem: "토" },
  { keys: ["임인","계묘"], label: "금박금", elem: "금" },
  { keys: ["갑진","을사"], label: "복등화", elem: "화" },
  { keys: ["병오","정미"], label: "천하수", elem: "수" },
  { keys: ["무신","기유"], label: "대역토", elem: "토" },
  { keys: ["경술","신해"], label: "채천금", elem: "금" },
  { keys: ["임자","계축"], label: "상자목", elem: "목" },
  { keys: ["갑인","을묘"], label: "대계수", elem: "수" },
  { keys: ["병진","정사"], label: "사중토", elem: "토" },
  { keys: ["무오","기미"], label: "천상화", elem: "화" },
  { keys: ["경신","신유"], label: "석류목", elem: "목" },
  { keys: ["임술","계해"], label: "대해수", elem: "수" },
];

const NABEUM_MAP: Record<string, Nabeum> = (() => {
  const o: Record<string, Nabeum> = {};
  for (const p of NABEUM_PAIRS) {
    const [a, b] = p.keys;
    o[a] = { label: p.label, elem: p.elem };
    o[b] = { label: p.label, elem: p.elem };
  }
  return o;
})();

function getNabeumBg(elem: ElemKR): string {
  switch (elem) {
    case "목": return "bg-green-600 text-white";
    case "화": return "bg-red-600 text-white";
    case "토": return "bg-yellow-600 text-white";
    case "금": return "bg-gray-500 text-white";
    case "수": return "bg-blue-700 text-white";
    default:   return "bg-neutral-700 text-white";
  }
}

/* ===== 상단 노출(원국/대운/세운/월운…까지) 필터 ===== */
const LEVEL: Record<"대운" | "세운" | "월운", number> = { "대운": 1, "세운": 2, "월운": 3 };
function getCardLevel(label: string): number {
  if (label.includes("월운")) return 3;
  if (label.includes("세운")) return 2;
  if (label.includes("대운")) return 1;
  return 1;
}

/* ===== 지지 → 오행 매핑 (시주 버튼 색상용) ===== */
type ElemKRMap = Record<string, ElemKR>;
const BRANCH_TO_ELEMENT: ElemKRMap = {
  자: "수", 축: "토", 인: "목", 묘: "목",
  진: "토", 사: "화", 오: "화", 미: "토",
  신: "금", 유: "금", 술: "토", 해: "수",
};
function getBranchBgColor(branch: string): string {
  const elem = BRANCH_TO_ELEMENT[branch];
  switch (elem) {
    case "목": return "bg-green-600 text-white border-green-600";
    case "화": return "bg-red-600 text-white border-red-600";
    case "토": return "bg-yellow-500 text-white border-yellow-500";
    case "금": return "bg-gray-400 text-white border-gray-400";
    case "수": return "bg-blue-900 text-white border-blue-600";
    default:   return "bg-neutral-700 text-white border-neutral-700";
  }
}

type Props = {
  data: MyeongSik;
  hourTable?: DayBoundaryRule;
};

type Parsed = {
  corrected: Date;
  year: { stem: string; branch: string };
  month: { stem: string; branch: string };
  day: { stem: string; branch: string };
  hour: { stem: string; branch: string } | null;
};

export default function SajuChart({ data, hourTable }: Props) {
  // ✅ 전역 스토어
  const { date } = useLuckPickerStore();
  const settings = useSettingsStore((s) => s.settings);

  // ✅ 납음 표시 여부(스토어에 통일, 기본 true)
  const showNabeum = settings.showNabeum ?? true;

  // ✅ 명식 기준
  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? hourTable ?? "조자시/야자시";
  const lon = !data.birthPlace || data.birthPlace.name === "모름" || !data.birthPlace.lon ? 127.5 : data.birthPlace.lon;

  // 1) 출생 ‘양력’ 날짜를 먼저 구해서 DST 기본값 판단
  const { solarY, solarM, solarD } = useMemo(() => {
    let y = Number(data.birthDay?.slice(0, 4) ?? 2000);
    let m = Number(data.birthDay?.slice(4, 6) ?? 1);
    let d = Number(data.birthDay?.slice(6, 8) ?? 1);
    if (data.calendarType === "lunar") {
      const s = lunarToSolarStrict(y, m, d);
      y = s.getFullYear(); m = s.getMonth() + 1; d = s.getDate();
    }
    return { solarY: y, solarM: m, solarD: d };
  }, [data.birthDay, data.calendarType]);

  // 2) DST 토글 (초기값만 자동 감지, 이후엔 사용자가 제어)
  const [useDST, setUseDST] = useState<boolean>(false);
  useEffect(() => {
    if (solarY && solarM && solarD) {
      setUseDST(isDST(solarY, solarM, solarD));
    }
  }, [solarY, solarM, solarD]);

  const isUnknownTime = !data.birthTime || data.birthTime === "모름";

  // ✅ 원국 계산 함수
  function makeParsed(d: MyeongSik, useDSTFlag: boolean): Parsed {
    const unknown = !d.birthTime || d.birthTime === "모름";

    // 1) 양력으로 통일
    let y = Number(d.birthDay!.slice(0, 4));
    let mo = Number(d.birthDay!.slice(4, 6));
    let da = Number(d.birthDay!.slice(6, 8));
    if (d.calendarType === "lunar") {
      const solar = lunarToSolarStrict(y, mo, da);
      y = solar.getFullYear();
      mo = solar.getMonth() + 1;
      da = solar.getDate();
    }

    // 2) 기본 출생 시각 (모름이면 04:30 기준)
    const hh = unknown ? 4 : Number(d.birthTime!.slice(0, 2));
    const mi = unknown ? 30 : Number(d.birthTime!.slice(2, 4));
    const rawBirth = new Date(y, mo - 1, da, hh, mi, 0, 0);

    // 3) 출생지 판단
    const isUnknownPlace =
      !d.birthPlace || d.birthPlace.name === "모름" || !d.birthPlace.lon;

    const lonVal = isUnknownPlace ? 127.5 : d.birthPlace!.lon!;

    // 🔥 4) 보정 로직
    //    - 데이터에 corrected가 있으면 그대로 사용 (커스텀 명식 등)
    //    - 없으면 기존 보정 계산
    const hasCorrected =
      d.corrected instanceof Date && !Number.isNaN(d.corrected.getTime());

    let corrected0: Date;
    if (hasCorrected) {
      corrected0 = d.corrected;
    } else if (isUnknownPlace) {
      // 출생지 모름: 별도 보정 없이 원시 시각 사용
      corrected0 = rawBirth;
    } else {
      corrected0 = getCorrectedDate(rawBirth, lonVal, unknown);
    }

    // 5) 썸머타임 토글(필요할 때만 -1시간 추가로 깎기)
    const corrected = useDSTFlag
      ? new Date(corrected0.getTime() - 60 * 60 * 1000)
      : corrected0;

    // 6) 간지 계산
    const hourRule: DayBoundaryRule =
      (d.mingSikType ?? "조자시/야자시") as DayBoundaryRule;

    const yGZ = getYearGanZhi(corrected, lonVal);
    const mGZ = getMonthGanZhi(corrected, lonVal);
    const dGZ = getDayGanZhi(corrected, hourRule);
    const hGZ = unknown ? null : getHourGanZhi(corrected, hourRule);

    return {
      corrected,
      year:  { stem: yGZ.charAt(0), branch: yGZ.charAt(1) },
      month: { stem: mGZ.charAt(0), branch: mGZ.charAt(1) },
      day:   { stem: dGZ.charAt(0), branch: dGZ.charAt(1) },
      hour:  hGZ ? { stem: hGZ.charAt(0), branch: hGZ.charAt(1) } : null,
    };
  }

  // ✅ parsed는 data/useDST 바뀔 때만 재계산
  const [parsed, setParsed] = useState<Parsed>(() => makeParsed(data, useDST));
  useEffect(() => {
    setParsed(makeParsed(data, useDST));
  }, [data, useDST]);

  const hasCustomUnknownTime = !data.correctedLocal || data.correctedLocal.trim() === "";
  const correctedLabel = hasCustomUnknownTime || isUnknownTime
    ? "모름"
    : formatLocalYMDHM(parsed.corrected);

  // ✅ “사람 전환” 키 (상태 리셋 기준)
  const personKey = data.id ?? `${data.birthDay}-${data.birthTime}-${data.name ?? ""}`;

  // ✅ 일간(문자 그대로)
  const dayStem = parsed.day.stem as Stem10sin;

  // ✅ 시주예측 상태 (선택된 시주만 저장)
  type HourGZ = { stem: string; branch: string };
  const [manualHour, setManualHour] = useState<HourGZ | null>(null);

  // ✅ 자시/인시 토글 (초기값은 mingSikType 반영)
  const [useInsi, setUseInsi] = useState(() => data.mingSikType === "인시");
  useEffect(() => {
    setManualHour(null);
    setUseInsi(data.mingSikType === "인시");
  }, [personKey, data.mingSikType]);

  // ✅ 후보 리스트 (일간+토글 기준)
  const hourCandidates = useMemo(() => {
    const map = useInsi ? (시주매핑_인시 as Record<string, string[]>) : (시주매핑_자시 as Record<string, string[]>);
    return map[dayStem] ?? [];
  }, [useInsi, dayStem]);

  // ✅ 원국 표시용: 시주/일주 확정값
  const hourData = manualHour ?? parsed.hour;

  // ── 십이운성/십이신살 계산
  const baseBranchForShinsal =
    (settings.sinsalBase === "일지" ? parsed.day.branch : parsed.year.branch) as Branch10sin;

  const setHourPrediction = useHourPredictionStore((s) => s.setManualHour);

  const handleManualHourSelect = (stem: string, branch: string) => {
    const h = { stem, branch };
    setManualHour(h);
    setHourPrediction(h);
  };

  const calcUnseong = (branch: string) =>
    settings.showSibiUnseong ? getTwelveUnseong(dayStem, branch) : null;

  const calcShinsal = (targetBranch: string) =>
    settings.showSibiSinsal
      ? getTwelveShinsalBySettings({
          baseBranch: baseBranchForShinsal,
          targetBranch,
          era: mapEra(settings.sinsalMode),
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

  const showDSTButton = isDST(solarY, solarM, solarD);
  const handleDSTToggle = () => setUseDST((prev: boolean) => !prev);

  // 운 표시용
  const luck = useGlobalLuck(data, hourTable, date);
  const daeGz = luck.dae.gz;
  const seGz  = luck.se.gz;
  const wolGz = luck.wol.gz;

  return (
    <div className="w-full max-w-[640px] mx-auto">
      {/* 헤더 */}
      <div className="mb-1 flex flex-wrap items-end justify-between gap-2 p-2">
        <div>
          <div className="text-md desk:text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {(data.name?.trim() || "이름없음") + " "}
            <span className="text-sm text-neutral-500 dark:text-neutral-400 mr-2">({data.gender})</span>
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
            {formatBirthDisplay(data.birthDay, data.birthTime)}
            {data.birthPlace?.name ? ` · ${"출생지: " + data.birthPlace.name}` : ""}
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400">
              보정시: {correctedLabel}
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
            : "grid-cols-[4fr_5fr]"
        }`}
      >
        {/* 운 */}
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

                    if (c.label.includes("대운") && daeGz) { stem = daeGz.charAt(0) as Stem10sin; branch = daeGz.charAt(1) as Branch10sin; }
                    if (c.label.includes("세운") && seGz)  { stem = seGz.charAt(0) as Stem10sin;  branch = seGz.charAt(1) as Branch10sin; }
                    if (c.label.includes("월운") && wolGz) { stem = wolGz.charAt(0) as Stem10sin; branch = wolGz.charAt(1) as Branch10sin; }

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
                          {(settings.showSibiUnseong || settings.showSibiSinsal || showNabeum) && (
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 text-center space-y-0.5">
                              {settings.showSibiUnseong && <div>{unseong}</div>}
                              {settings.showSibiSinsal && <div>{shinsal}</div>}
                              {showNabeum && <NabeumBadge stem={stem} branch={branch} />}
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
                    let stem = c.data.stem as Stem10sin;
                    let branch = c.data.branch as Branch10sin;

                    if (c.label.includes("대운") && daeGz) { stem = daeGz.charAt(0) as Stem10sin; branch = daeGz.charAt(1) as Branch10sin; }
                    if (c.label.includes("세운") && seGz)  { stem = seGz.charAt(0) as Stem10sin;  branch = seGz.charAt(1) as Branch10sin; }
                    if (c.label.includes("월운") && wolGz) { stem = wolGz.charAt(0) as Stem10sin; branch = wolGz.charAt(1) as Branch10sin; }

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
                          {(settings.showSibiUnseong || settings.showSibiSinsal || showNabeum) && (
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1 text-center space-y-0.5">
                              {settings.showSibiUnseong && <div>{unseong}</div>}
                              {settings.showSibiSinsal && <div>{shinsal}</div>}
                              {showNabeum && <NabeumBadge stem={stem} branch={branch} />}
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
                  { key: "hour",  label: "시주", data: hourData },
                  { key: "day",   label: "일주", data: parsed.day },
                  { key: "month", label: "월주", data: parsed.month },
                  { key: "year",  label: "연주", data: parsed.year },
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
                          <Cell value={c.data.stem}   kind="stem"   charType={settings.charType} thinEum={settings.thinEum} />
                          <Cell value={c.data.branch} kind="branch" charType={settings.charType} thinEum={settings.thinEum} />
                          <HiddenStems branch={c.data.branch as Branch10sin} dayStem={dayStem} mode={hiddenMode} mapping={settings.hiddenStemMode} />
                          {(settings.showSibiUnseong || settings.showSibiSinsal || showNabeum) && (
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
                              {showNabeum && <NabeumBadge stem={c.data.stem} branch={c.data.branch} />}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] desk:text-xs text-neutral-500 dark:text-neutral-400">시간 미상</span>
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
                  { key: "hour",  label: "시주", data: hourData },
                  { key: "day",   label: "일주", data: parsed.day },
                  { key: "month", label: "월주", data: parsed.month },
                  { key: "year",  label: "연주", data: parsed.year },
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
                          <Cell value={c.data.stem}   kind="stem"   charType={settings.charType} thinEum={settings.thinEum} />
                          <Cell value={c.data.branch} kind="branch" charType={settings.charType} thinEum={settings.thinEum} />
                          <HiddenStems branch={c.data.branch as Branch10sin} dayStem={dayStem} mode={hiddenMode} mapping={settings.hiddenStemMode} />
                          {(settings.showSibiUnseong || settings.showSibiSinsal || showNabeum) && (
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
                              {showNabeum && <NabeumBadge stem={c.data.stem} branch={c.data.branch} />}
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 text-nowrap">시간 미상</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ✅ 시주 예측: 시간 미상일 때만 */}
      {isUnknownTime && (
        <div className="mt-4 p-3 border rounded bg-neutral-50 dark:bg-neutral-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-sm text-neutral-700 dark:text-neutral-300">
              시주 예측
            </span>
            <button
              onClick={() => setUseInsi((prev) => !prev)}
              className="px-2 py-1 text-xs rounded border bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-600 cursor-pointer"
            >
              {useInsi ? "현재 : 인시" : "현재 : 자시"}
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {hourCandidates.map((gz) => {
              const s = gz.charAt(0) as Stem10sin;
              const b = gz.charAt(1) as Branch10sin;
              const isActive = manualHour?.stem === s && manualHour?.branch === b;
              return (
                <button
                  key={gz}
                  onClick={() => handleManualHourSelect(s, b)}
                  className={`p-2 text-xs rounded border cursor-pointer ${
                    isActive
                      ? getBranchBgColor(b)
                      : "bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 border-neutral-300 dark:border-neutral-600"
                  }`}
                  title={`${gz} (시주 후보)`}
                >
                  {gz}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/** 납음오행 배지 */
function NabeumBadge({ stem, branch }: { stem: string; branch: string }) {
  const sK = STEM_H2K[stem] ?? stem;
  const bK = BRANCH_H2K[branch] ?? branch;
  const key = `${sK}${bK}`;
  const entry = NABEUM_MAP[key];
  if (!entry) return null;
  const cls = getNabeumBg(entry.elem);
  return (
    <span
      className={`inline-block px-1.5 py-[2px] rounded ${cls} border border-white/10 text-nowrap`}
      title={`${entry.label} · ${entry.elem}`}
    >
      {entry.label}
    </span>
  );
}

/** EraType 안전 매핑 */
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
  return (mode as unknown) as EraType;
}

/** 셀 */
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
  const { settings } = useSettingsStore();
  const color = getElementColor(value, kind, settings);
  const display = charType === "한글"
    ? (kind === "stem" ? (STEM_H2K[value] ?? value) : (BRANCH_H2K[value] ?? value))
    : (kind === "stem" ? (STEM_K2H[value] ?? value) : (BRANCH_K2H[value] ?? value));
  const isYin = kind === "stem" ? YIN_STEMS_ALL.has(value) : YIN_BRANCHES_ALL.has(value);
  const weight = thinEum && isYin ? "font-thin" : "font-bold";

  return (
    <div
      className={`w-11 h-11 sm:w-14 sm:h-14 md:w-14 md:h-14 rounded-md ${color}
                  flex items-center justify-center border border-neutral-200 dark:border-neutral-800`}
    >
      {/* ❌ text-white 제거 */}
      <span className={`text-[24px] md:text-2xl ${weight}`}>
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
