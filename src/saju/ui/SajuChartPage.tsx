import { useMemo, useState, useEffect, useCallback } from "react";
import { useMediaQuery } from "react-responsive";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import type { Stem10sin, Branch10sin } from "@/shared/domain/ganji/utils";
import { getSipSin } from "@/shared/domain/ganji/utils";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import { isDST } from "@/shared/lib/core/timeCorrection";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/ganji/twelve";
import { useSettingsStore } from "@/settings/input/useSettingsStore";
import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import { useCurrentUnCards } from "@/luck/calc/luck-make";
import { useGlobalLuck } from "@/luck/calc/useGlobalLuck";
import { useDstStore } from "@/saju/input/useDstStore";
import {
  buildAllRelationTags,
  buildHarmonyTags,
  type RelationTags,
} from "@/analysisReport/calc/logic/relations";
import { BUCKET_KEYS } from "@/analysisReport/calc/logic/relations/buckets";
import { buildShinsalTags } from "@/analysisReport/calc/logic/shinsal";
import { mapEra } from "@/shared/domain/ganji/era";
import { shiftDayGZ } from "@/shared/domain/ganji/common";
import { buildHourCandidates } from "@/saju/calc/sajuHour";
import { parseMyeongSik } from "@/saju/calc/sajuParse";
import { formatBirthDisplay, formatCorrectedDisplay, isUnknownTime } from "@/saju/calc/sajuFormat";
import {
  isInsiRule,
  normalizeDayBoundaryRule,
  normalizeSinsalBase,
  resolveExposureLevel,
} from "@/saju/calc/sajuRules";
import type { HourGZ, Parsed } from "@/saju/calc/sajuTypes";
import { LuckCardsPanel } from "@/saju/ui/LuckCardsPanel";
import { SajuPillarsPanel } from "@/saju/ui/SajuPillarsPanel";
import { HourPredictionPanel } from "@/saju/ui/HourPredictionPanel";
import { SajuRelationPanels } from "@/saju/ui/SajuRelationPanels";

type Props = {
  data: MyeongSik;
  hourTable?: DayBoundaryRule;
};

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatBirthDisplayWithLunar(
  birthDay?: string,
  birthTime?: string | undefined,
  calendarType?: string
): string {
  if (!birthDay || birthDay.length < 8) {
    return formatBirthDisplay(birthDay, birthTime);
  }

  const base = formatBirthDisplay(birthDay, birthTime);

  if (calendarType !== "lunar") {
    return base;
  }

  try {
    const y = Number(birthDay.slice(0, 4));
    const m = Number(birthDay.slice(4, 6));
    const d = Number(birthDay.slice(6, 8));

    const solar = lunarToSolarStrict(y, m, d);
    const solarStr = `${solar.getFullYear()}.${pad2(
      solar.getMonth() + 1
    )}.${pad2(solar.getDate())}`;

    return `양력 ${solarStr} (음력 ${base})`;
  } catch {
    return `음력 ${base}`;
  }
}

const STEMS = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const TEN_GODS = ["비견", "겁재", "식신", "상관", "편재", "정재", "편관", "정관", "편인", "정인"] as const;

function getInjongStem(dayStem: string, targetTenGod: string): string {
  const idx = STEMS.indexOf(dayStem);
  if (idx === -1) return dayStem;
  
  for (const s of STEMS) {
    if (getSipSin(dayStem as Stem10sin, { stem: s as Stem10sin }) === targetTenGod) {
      return s;
    }
  }
  return dayStem;
}

export default function SajuChart({ data, hourTable }: Props) {
  const { date, setDstOffsetMinutes } = useLuckPickerStore();
  const settings = useSettingsStore((s) => s.settings);
  const showNabeum = settings.showNabeum ?? true;
  const showRelationBox = settings.showRelationBox ?? true;
  const showEtcShinsalBox = settings.showEtcShinsal ?? true;

  const rule: DayBoundaryRule = normalizeDayBoundaryRule(data.mingSikType, hourTable);
  const lon =
    !data.birthPlace || data.birthPlace.name === "모름" || !data.birthPlace.lon
      ? 127.5
      : data.birthPlace.lon;

  const { solarY, solarM, solarD } = useMemo(() => {
    let y = Number(data.birthDay?.slice(0, 4) ?? 2000);
    let m = Number(data.birthDay?.slice(4, 6) ?? 1);
    let d = Number(data.birthDay?.slice(6, 8) ?? 1);
    if (data.calendarType === "lunar") {
      const s = lunarToSolarStrict(y, m, d);
      y = s.getFullYear();
      m = s.getMonth() + 1;
      d = s.getDate();
    }
    return { solarY: y, solarM: m, solarD: d };
  }, [data.birthDay, data.calendarType]);

  const useDST = useDstStore((s) => s.useDST);
  const setUseDST = useDstStore((s) => s.setUseDST);
  useEffect(() => {
    if (solarY && solarM && solarD) {
      setUseDST(isDST(solarY, solarM, solarD));
    }
  }, [solarY, solarM, solarD, setUseDST]);

  useEffect(() => {
    setDstOffsetMinutes(useDST ? -60 : 0);
  }, [useDST, setDstOffsetMinutes]);

  const unknownTime = isUnknownTime(data.birthTime);
  const [parsed, setParsed] = useState<Parsed>(() => parseMyeongSik(data, useDST));

  useEffect(() => {
    setParsed(parseMyeongSik(data, useDST));
  }, [data, useDST]);

  const personKey = data.id ?? `${data.birthDay}-${data.birthTime}-${data.name ?? ""}`;
  const usePrevDay = useHourPredictionStore((s) => s.usePrevDay);
  const setUsePrevDay = useHourPredictionStore((s) => s.setUsePrevDay);
  const effectiveDay = useMemo(() => {
    const dayGz = `${parsed.day.stem}${parsed.day.branch}`;
    const shiftedDayGz = usePrevDay ? shiftDayGZ(dayGz, -1) : dayGz;
    return {
      stem: shiftedDayGz.charAt(0),
      branch: shiftedDayGz.charAt(1),
    };
  }, [parsed.day.stem, parsed.day.branch, usePrevDay]);
  const baseDayStem = parsed.day.stem as Stem10sin;
  const dayStem = effectiveDay.stem as Stem10sin;

  const [manualHour, setManualHour] = useState<HourGZ | null>(null);
  const [useInsi, setUseInsi] = useState(() => isInsiRule(data.mingSikType));
  const clearHourPrediction = useHourPredictionStore((s) => s.clearManualHour);

  const [isDayMasterMode, setIsDayMasterMode] = useState(true);
  const [fateLabTarget, setFateLabTarget] = useState<string | null>(null);
  const [fateLabContext, setFateLabContext] = useState<"year" | "day" | "month" | "hour" | null>(null);
  const [isDetailMode, setIsDetailMode] = useState(false);

  useEffect(() => {
    setManualHour(null);
    clearHourPrediction();
    setUseInsi(isInsiRule(data.mingSikType));
    setUsePrevDay(false);
  }, [personKey, data.mingSikType, clearHourPrediction, setUsePrevDay]);

  const hourCandidateStem = usePrevDay && useInsi ? dayStem : baseDayStem;
  const hourCandidates = useMemo(
    () => buildHourCandidates(hourCandidateStem, useInsi),
    [useInsi, hourCandidateStem]
  );

  const hourData = manualHour ?? parsed.hour;
  const setHourPrediction = useHourPredictionStore((s) => s.setManualHour);

  const canSelectHourBranch = useCallback(
    (branch: string) => {
      if (!usePrevDay) return true;
      if (useInsi) return branch === "자" || branch === "축";
      return branch === "자";
    },
    [usePrevDay, useInsi]
  );

  useEffect(() => {
    if (!manualHour) return;
    if (!canSelectHourBranch(manualHour.branch)) {
      setManualHour(null);
      clearHourPrediction();
    }
  }, [manualHour, canSelectHourBranch, clearHourPrediction]);

  const handleManualHourSelect = (stem: string, branch: string) => {
    if (!canSelectHourBranch(branch)) return;
    if (manualHour?.stem === stem && manualHour?.branch === branch) {
      setManualHour(null);
      clearHourPrediction();
      return;
    }
    const h = { stem, branch };
    setManualHour(h);
    setHourPrediction(h);
  };

  const baseBranchForShinsal =
    (normalizeSinsalBase(settings.sinsalBase) === "일지"
      ? effectiveDay.branch
      : parsed.year.branch) as Branch10sin;

  const calcUnseong = useCallback((branch: string, pillarStem?: string) => {
    if (!settings.showSibiUnseong) return null;
    
    let targetStem = dayStem; // Default Bong-beop (Day Stem)

    if (isDayMasterMode) {
      targetStem = dayStem;
    } else {
      targetStem = (pillarStem as Stem10sin) || dayStem;
    }

    return getTwelveUnseong(targetStem, branch);
  }, [settings.showSibiUnseong, dayStem, isDayMasterMode]);

  const calcShinsal = (targetBranch: string) =>
    settings.showSibiSinsal
      ? getTwelveShinsalBySettings({
          baseBranch: baseBranchForShinsal,
          targetBranch,
          era: mapEra(settings.sinsalMode),
          gaehwa: settings.sinsalBloom,
        })
      : null;

  const dstOffsetMinutes = useDST ? -60 : 0;
  const unCards = useCurrentUnCards(data, rule, dstOffsetMinutes);
  const isDesktop = useMediaQuery({ query: "(min-width: 992px)" });

  const hiddenMode: "all" | "main" = settings.hiddenStem === "regular" ? "main" : "all";
  const exposureLevel = resolveExposureLevel(settings.exposure);
  const filteredCards =
    exposureLevel === 0
      ? []
      : unCards.filter((c) => {
          const level = c.key === "daeun" ? 1 : c.key === "seun" ? 2 : 3;
          return level <= exposureLevel;
        });

  const showDSTButton = isDST(solarY, solarM, solarD);
  const handleDSTToggle = () => setUseDST(!useDST);

  const correctedBase = useMemo(() => {
    const dt =
      data.corrected instanceof Date ? data.corrected : new Date(String(data.corrected ?? ""));
    if (!Number.isNaN(dt.getTime())) return dt;
    return parsed.corrected;
  }, [data.corrected, parsed.corrected]);

  const correctedForDisplay = useMemo(() => {
    if (!correctedBase) return correctedBase;
    if (showDSTButton && useDST) return new Date(correctedBase.getTime() - 60 * 60 * 1000);
    return correctedBase;
  }, [correctedBase, showDSTButton, useDST]);

  const correctedLabel = useMemo(() => {
    const local = showDSTButton && useDST ? "" : data.correctedLocal; // ✅ DST ON이면 correctedLocal 무시
    return formatCorrectedDisplay(local, correctedForDisplay ?? new Date(), unknownTime);
  }, [data.correctedLocal, correctedForDisplay, unknownTime, showDSTButton, useDST]);

  const luck = useGlobalLuck(data, hourTable, date, { dstOffsetMinutes });
  const daeGz = luck.dae.gz;
  const seGz = luck.se.gz;
  const wolGz = luck.wol.gz;

  const maxRelationApplyLevel = useMemo(() => {
    if (exposureLevel >= 3 && wolGz) return 3;
    if (exposureLevel >= 2 && seGz) return 2;
    if (exposureLevel >= 1 && daeGz) return 1;
    return 0;
  }, [exposureLevel, daeGz, seGz, wolGz]);

  const [relationApplyLevel, setRelationApplyLevel] =
    useState<number>(maxRelationApplyLevel);
  const [activeRelationTag, setActiveRelationTag] = useState<string | null>(null);

  useEffect(() => {
    setRelationApplyLevel(maxRelationApplyLevel);
    setActiveRelationTag(null);
  }, [personKey, maxRelationApplyLevel]);

  const relationTags = useMemo(() => {
    const toGz = (p?: { stem?: string; branch?: string } | null) =>
      p?.stem && p?.branch ? `${p.stem}${p.branch}` : "";

    const natal = [
      toGz(parsed.year),
      toGz(parsed.month),
      toGz(effectiveDay),
      toGz(hourData),
    ] as const;

    const luckTags = buildAllRelationTags({
      natal: [...natal],
      daewoon: relationApplyLevel >= 1 ? daeGz ?? undefined : undefined,
      sewoon: relationApplyLevel >= 2 ? seGz ?? undefined : undefined,
      wolwoon: relationApplyLevel >= 3 ? wolGz ?? undefined : undefined,
    });

    const natalTags = buildHarmonyTags([...natal], { fillNone: false });
    const merged: RelationTags = { ...luckTags };
    for (const key of BUCKET_KEYS) {
      merged[key] = Array.from(new Set([...(merged[key] ?? []), ...(natalTags[key] ?? [])]));
    }

    return merged;
  }, [parsed, effectiveDay, hourData, daeGz, seGz, wolGz, relationApplyLevel]);

  const relationChips = useMemo(() => {
    const all = [
      ...relationTags.cheonganHap,
      ...relationTags.cheonganChung,
      ...relationTags.jijiSamhap,
      ...relationTags.jijiBanhap,
      ...relationTags.jijiBanghap,
      ...relationTags.jijiYukhap,
      ...relationTags.jijiChung,
      ...relationTags.jijiHyeong,
      ...relationTags.jijiPa,
      ...relationTags.jijiHae,
      ...relationTags.amhap,
      ...relationTags.ganjiAmhap,
    ].filter((t) => t && t !== "#없음");

    return Array.from(new Set(all));
  }, [relationTags]);

  useEffect(() => {
    if (activeRelationTag && !relationChips.includes(activeRelationTag)) {
      setActiveRelationTag(null);
    }
  }, [activeRelationTag, relationChips]);

  const relationByPillar = useMemo(() => {
    const addUnique = (arr: string[], tag: string) => {
      if (!arr.includes(tag)) arr.push(tag);
    };

    const out = {
      luck: { wol: [] as string[], se: [] as string[], dae: [] as string[] },
      natal: { hour: [] as string[], day: [] as string[], month: [] as string[], year: [] as string[] },
    };

    for (const tag of relationChips) {
      const prefix = tag.replace(/^#/, "").split("_")[0] ?? "";
      const tokens = prefix.split("X").filter(Boolean);

      if (tokens.includes("월운")) addUnique(out.luck.wol, tag);
      if (tokens.includes("세운")) addUnique(out.luck.se, tag);
      if (tokens.includes("대운")) addUnique(out.luck.dae, tag);

      if (tokens.includes("시")) addUnique(out.natal.hour, tag);
      if (tokens.includes("일")) addUnique(out.natal.day, tag);
      if (tokens.includes("월")) addUnique(out.natal.month, tag);
      if (tokens.includes("연")) addUnique(out.natal.year, tag);
    }

    return out;
  }, [relationChips]);

  const etcShinsal = useMemo(() => {
    const toGz = (p?: { stem?: string; branch?: string } | null) =>
      p?.stem && p?.branch ? `${p.stem}${p.branch}` : "";

    const data = buildShinsalTags({
      natal: [
        toGz(parsed.year),
        toGz(parsed.month),
        toGz(effectiveDay),
        toGz(hourData),
      ],
      daewoon: exposureLevel >= 1 ? daeGz ?? undefined : undefined,
      sewoon: exposureLevel >= 2 ? seGz ?? undefined : undefined,
      wolwoon: exposureLevel >= 3 ? wolGz ?? undefined : undefined,
    });

    const uniq = (items: string[]) =>
      Array.from(new Set(items.filter((t) => t && t !== "#없음")));

    return {
      good: {
        natal: {
          hour: uniq(data.good.si ?? []),
          day: uniq(data.good.il ?? []),
          month: uniq(data.good.wol ?? []),
          year: uniq(data.good.yeon ?? []),
        },
        luck: {
          dae: uniq(data.good.dae ?? []),
          se: uniq(data.good.se ?? []),
          wol: uniq(data.good.wolun ?? []),
        },
      },
      bad: {
        natal: {
          hour: uniq(data.bad.si ?? []),
          day: uniq(data.bad.il ?? []),
          month: uniq(data.bad.wol ?? []),
          year: uniq(data.bad.yeon ?? []),
        },
        luck: {
          dae: uniq(data.bad.dae ?? []),
          se: uniq(data.bad.se ?? []),
          wol: uniq(data.bad.wolun ?? []),
        },
      },
    };
  }, [parsed, effectiveDay, hourData, daeGz, seGz, wolGz, exposureLevel]);

  const tagKindMap = useMemo(() => {
    const map: Record<string, "stem" | "branch" | "both"> = {};
    const set = (items: string[], kind: "stem" | "branch" | "both") => {
      for (const t of items) map[t] = kind;
    };
    set(relationTags.cheonganHap, "stem");
    set(relationTags.cheonganChung, "stem");
    set(relationTags.jijiSamhap, "branch");
    set(relationTags.jijiBanhap, "branch");
    set(relationTags.jijiBanghap, "branch");
    set(relationTags.jijiYukhap, "branch");
    set(relationTags.jijiChung, "branch");
    set(relationTags.jijiHyeong, "branch");
    set(relationTags.jijiPa, "branch");
    set(relationTags.jijiHae, "branch");
    set(relationTags.amhap, "branch");
    set(relationTags.ganjiAmhap, "both");
    return map;
  }, [relationTags]);

  const activeHighlightMap = useMemo(() => {
    if (!activeRelationTag) return {};
    const kind = tagKindMap[activeRelationTag] ?? "branch";
    const prefix = activeRelationTag.replace(/^#/, "").split("_")[0] ?? "";
    const tokens = prefix.split("X").filter(Boolean);
    const mapKey: Record<string, string> = {
      "연": "year",
      "월": "month",
      "일": "day",
      "시": "hour",
      "대운": "daeun",
      "세운": "seun",
      "월운": "wolun",
      "일운": "ilun",
    };

    const next: Record<string, { stem: boolean; branch: boolean }> = {};
    for (const t of tokens) {
      const key = mapKey[t];
      if (!key) continue;
      const cur = next[key] ?? { stem: false, branch: false };
      if (kind === "stem") cur.stem = true;
      else if (kind === "branch") cur.branch = true;
      else {
        cur.stem = true;
        cur.branch = true;
      }
      next[key] = cur;
    }

    return next;
  }, [activeRelationTag, tagKindMap]);
  
  // Fate Lab: 보유 육친 확인
  const existingTenGods = useMemo(() => {
    const set = new Set<string>();
    const check = (s?: string) => {
      if(s) set.add(getSipSin(dayStem, { stem: s as Stem10sin }));
    };
    // 천간
    check(parsed.year.stem);
    check(parsed.month.stem);
    check(hourData?.stem);
    // 지지 (지장간 포함 여부는 기획에 따라 다르나 보통 본기 기준)
    // 여기서는 간단히 지지 본기 십신 체크
    const checkBranch = (b?: string) => {
      if(b) set.add(getSipSin(dayStem, { branch: b as Branch10sin }));
    };
    checkBranch(parsed.year.branch);
    checkBranch(parsed.month.branch);
    checkBranch(effectiveDay.branch);
    checkBranch(hourData?.branch);
    return set;
  }, [dayStem, parsed, effectiveDay, hourData]);

  return (
    <div className="w-full max-w-[640px] mx-auto">
      <div className="mb-1 gap-2 p-2">
        <div>
          <div className="text-md desk:text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {(data.name?.trim() || "이름없음") + " "}
            <span className="text-sm text-neutral-500 dark:text-neutral-400 mr-2">
              ({data.gender})
            </span>
            {showDSTButton && (
              <button
                onClick={handleDSTToggle}
                className={`px-2 py-0.5 text-xs rounded cursor-pointer border
                  ${
                    useDST
                      ? "bg-red-600 text-white border-red-600"
                      : "bg-neutral-100 text-neutral-700 border-neutral-300 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700"
                  }`}
              >
                서머타임 {useDST ? "ON" : "OFF"}
              </button>
            )}
          </div>
          <div className="text-xs desk:text-sm text-neutral-600 dark:text-neutral-400">
            {formatBirthDisplayWithLunar(
              data.birthDay,
              data.birthTime,
              data.calendarType
            )}
            &nbsp;· 보정시각: {correctedLabel}
          </div>
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {data.birthPlace?.name ? `출생지: ${data.birthPlace.name}` : ""} / 기준 경도: {lon.toFixed(2)}° · {rule} 기준
        </div>
      </div>

      <div className="px-2 mb-2 flex justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 cursor-pointer">
            <input 
              type="checkbox" 
              checked={isDetailMode} 
              onChange={(e) => setIsDetailMode(e.target.checked)}
              className="w-3 h-3 accent-indigo-600"
            />
            <span className="text-xs text-neutral-600 dark:text-neutral-400 font-medium">십이운성 상세보기</span>
          </label>
        </div>

        {isDetailMode && (
          <button
            onClick={() => setIsDayMasterMode(!isDayMasterMode)}
            className={`flex items-center h-30 gap-2 px-3 rounded-full text-xs font-bold transition-all shadow-sm border cursor-pointer ${
              isDayMasterMode
                ? "bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900"
                : "bg-white text-neutral-600 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-700"
            }`}
          >
            <span className="text-md">{isDayMasterMode ? "●" : "○"}</span>
            {isDayMasterMode ? "일간 중심 모드 (봉법)" : "간지 중심 모드 (거법)"}
          </button>
        )}
      </div>

      {isDetailMode && <p className="mb-2 text-right text-xs text-neutral-500 dark:text-neutral-400">
        좌법은 지장간을 클릭하면 볼 수 있습니다
      </p>}

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
        {filteredCards.length > 0 && (
          <LuckCardsPanel
            cards={filteredCards}
            isDesktop={isDesktop}
            dayStem={dayStem}
            charType={settings.charType}
            thinEum={settings.thinEum}
            showSipSin={settings.showSipSin}
            showUnseong={settings.showSibiUnseong}
            showShinsal={settings.showSibiSinsal}
            showNabeum={showNabeum}
            hiddenMode={hiddenMode}
            hiddenStemMode={settings.hiddenStemMode}
            calcUnseong={calcUnseong}
            calcShinsal={calcShinsal}
            daeGz={daeGz}
            seGz={seGz}
            wolGz={wolGz}
            highlightMap={activeHighlightMap}
          />
        )}

        <SajuPillarsPanel
          isDesktop={isDesktop}
          dayStem={dayStem}
          charType={settings.charType}
          thinEum={settings.thinEum}
          showSipSin={settings.showSipSin}
          showUnseong={settings.showSibiUnseong}
          showShinsal={settings.showSibiSinsal}
          showNabeum={showNabeum}
          hiddenMode={hiddenMode}
          hiddenStemMode={settings.hiddenStemMode}
          calcUnseong={calcUnseong}
          calcShinsal={calcShinsal}
          highlightMap={activeHighlightMap}
          isDayMasterMode={isDayMasterMode}
          isDetailMode={isDetailMode}
          pillars={[
            { key: "hour", label: "시주", data: hourData },
            { key: "day", label: "일주", data: effectiveDay },
            { key: "month", label: "월주", data: parsed.month },
            { key: "year", label: "년주", data: parsed.year },
          ]}
        />
      </div>

      {unknownTime && (
        <HourPredictionPanel
          hourCandidates={hourCandidates}
          useInsi={useInsi}
          onToggleRule={() => setUseInsi((prev) => !prev)}
          usePrevDay={usePrevDay}
          onTogglePrevDay={() => setUsePrevDay(!usePrevDay)}
          canSelectHourBranch={canSelectHourBranch}
          manualHour={manualHour}
          onSelectHour={handleManualHourSelect}
        />
      )}

      {isDetailMode && <div className="mt-2 mb-6 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg">🧪</span>
          <h3 className="font-bold text-sm text-neutral-800 dark:text-neutral-200">인종법 (가상 육친 대입)</h3>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-3">
          내 사주에 없는 글자가 들어오면 어떤 힘을 받을까요? 아이콘을 눌러 확인해보세요.
        </p>
        
        <div className="flex flex-wrap gap-2">
          {TEN_GODS.map((tg) => {
            const isMissing = !existingTenGods.has(tg);
            const isSelected = fateLabTarget === tg;
            return (
              <button
                key={tg}
                onClick={() => {
                  setFateLabTarget(isSelected ? null : tg);
                  setFateLabContext(null);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-all cursor-pointer ${
                  isSelected
                    ? "bg-purple-600 text-white border-purple-600 shadow-md transform scale-105"
                    : isMissing
                    ? "bg-white text-neutral-600 border-dashed border-neutral-400 font-bold hover:border-purple-400 hover:text-purple-500 dark:bg-neutral-800 dark:text-neutral-300 dark:border-neutral-600"
                    : "bg-neutral-50 text-neutral-400 border-transparent hover:bg-neutral-100 dark:bg-neutral-800/50 dark:text-neutral-500"
                }`}
                title={isMissing ? "미보유 (가상 대입)" : "보유중 (가상 대입)"}
              >
                {tg}
              </button>
            );
          })}
        </div>

        {fateLabTarget && (
          <div className="mt-4 p-3 bg-white dark:bg-neutral-800 rounded-lg border border-purple-100 dark:border-purple-900/30 animate-fadeIn">
            <div className="space-y-2">
              <p className="text-xs font-bold text-neutral-600 dark:text-neutral-400 text-center mb-2">
                어느 영역에서 확인하시겠습니까?
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setFateLabContext("year")}
                  className={`flex items-center gap-3 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    fateLabContext === "year"
                      ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-800"
                      : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  }`}
                >
                  <span className="text-lg">🌳</span>
                  <div>
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">근본과 배경 (연지)</div>
                    <div className="text-[10px] text-neutral-500">"초년운과 가문은 어떠한가?"</div>
                  </div>
                </button>
                <button
                  onClick={() => setFateLabContext("day")}
                  className={`flex items-center gap-3 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    fateLabContext === "day"
                      ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-800"
                      : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  }`}
                >
                  <span className="text-lg">🏠</span>
                  <div>
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">나의 기본 역량 (일지)</div>
                    <div className="text-[10px] text-neutral-500">"내가 이 기운을 다룰 능력이 있는가?"</div>
                  </div>
                </button>
                <button
                  onClick={() => setFateLabContext("month")}
                  className={`flex items-center gap-3 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    fateLabContext === "month"
                      ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-800"
                      : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  }`}
                >
                  <span className="text-lg">🏢</span>
                  <div>
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">사회적 환경 (월지)</div>
                    <div className="text-[10px] text-neutral-500">"세상이 나에게 이 기운을 허락하는가?"</div>
                  </div>
                </button>
                <button
                  onClick={() => setFateLabContext("hour")}
                  className={`flex items-center gap-3 p-2 rounded-lg border text-left transition-colors cursor-pointer ${
                    fateLabContext === "hour"
                      ? "bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800 ring-1 ring-purple-200 dark:ring-purple-800"
                      : "border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                  }`}
                >
                  <span className="text-lg">👨‍👧‍👧</span>
                  <div>
                    <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200">미래와 방향성 (시지)</div>
                    <div className="text-[10px] text-neutral-500">"미래에 이 기운이 남아있는가?"</div>
                  </div>
                </button>
              </div>
            </div>

            {fateLabContext && (
              <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700 animate-fadeIn">
                {(() => {
                  const targetStem = getInjongStem(dayStem, fateLabTarget) as Stem10sin;
                  const targetBranch = fateLabContext === 'day' ? effectiveDay.branch : fateLabContext === 'month' ? parsed.month.branch : fateLabContext === 'year' ? parsed.year.branch : hourData?.branch;
                  
                  if (!targetBranch) return <div className="text-xs text-neutral-500 text-center">해당 지지 정보를 알 수 없습니다.</div>;

                  const unseong = getTwelveUnseong(targetStem, targetBranch as Branch10sin);
                  const contextDesc = fateLabContext === 'day' ? "나의 능력에서는" : fateLabContext === 'month' ? "환경적 지원에서는" : fateLabContext === 'year' ? "가문의 배경에서는" : "미래의 기운에서는";

                  return (
                    <div className="text-center space-y-2">
                      <div className="text-xs text-white">{contextDesc} <strong className="text-amber-300">{unseong}</strong>의 상태입니다.</div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>}

      <SajuRelationPanels
        isDesktop={isDesktop}
        exposureLevel={exposureLevel}
        relationApplyLevel={relationApplyLevel}
        maxRelationApplyLevel={maxRelationApplyLevel}
        onChangeRelationApplyLevel={setRelationApplyLevel}
        relationChips={relationChips}
        relationByPillar={relationByPillar}
        activeRelationTag={activeRelationTag}
        onToggleRelationTag={setActiveRelationTag}
        showRelationBox={showRelationBox}
        showEtcShinsalBox={showEtcShinsalBox}
        etcShinsalGood={etcShinsal.good}
        etcShinsalBad={etcShinsal.bad}
      />

      
    </div>
  );
}
