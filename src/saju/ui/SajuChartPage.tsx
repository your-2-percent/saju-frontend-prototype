import { useMemo, useState, useEffect } from "react";
import { useMediaQuery } from "react-responsive";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import type { Stem10sin, Branch10sin } from "@/shared/domain/ganji/utils";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import { isDST } from "@/shared/lib/core/timeCorrection";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/ganji/twelve";
import { useSettingsStore } from "@/settings/input/useSettingsStore";
import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import { useCurrentUnCards } from "@/luck/calc/luck-make";
import { useGlobalLuck } from "@/luck/calc/useGlobalLuck";
import { useDstStore } from "@/saju/input/useDstStore";
import { buildAllRelationTags } from "@/analysisReport/calc/logic/relations";
import { buildShinsalTags } from "@/analysisReport/calc/logic/shinsal";
import { mapEra } from "@/shared/domain/ganji/era";
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
  const dayStem = parsed.day.stem as Stem10sin;

  const [manualHour, setManualHour] = useState<HourGZ | null>(null);
  const [useInsi, setUseInsi] = useState(() => isInsiRule(data.mingSikType));

  useEffect(() => {
    setManualHour(null);
    setUseInsi(isInsiRule(data.mingSikType));
  }, [personKey, data.mingSikType]);

  useEffect(() => {
    setActiveRelationTag(null);
  }, [personKey]);

  const hourCandidates = useMemo(
    () => buildHourCandidates(dayStem, useInsi),
    [useInsi, dayStem]
  );

  const hourData = manualHour ?? parsed.hour;
  const setHourPrediction = useHourPredictionStore((s) => s.setManualHour);

  const handleManualHourSelect = (stem: string, branch: string) => {
    const h = { stem, branch };
    setManualHour(h);
    setHourPrediction(h);
  };

  const baseBranchForShinsal =
    (normalizeSinsalBase(settings.sinsalBase) === "일지"
      ? parsed.day.branch
      : parsed.year.branch) as Branch10sin;

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

  const [activeRelationTag, setActiveRelationTag] = useState<string | null>(null);

  const relationTags = useMemo(() => {
    const toGz = (p?: { stem?: string; branch?: string } | null) =>
      p?.stem && p?.branch ? `${p.stem}${p.branch}` : "";

    return buildAllRelationTags({
      natal: [
        toGz(parsed.year),
        toGz(parsed.month),
        toGz(parsed.day),
        toGz(hourData),
      ],
      daewoon: daeGz ?? undefined,
      sewoon: seGz ?? undefined,
      wolwoon: wolGz ?? undefined,
    });
  }, [parsed, hourData, daeGz, seGz, wolGz]);

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
        toGz(parsed.day),
        toGz(hourData),
      ],
      daewoon: daeGz ?? undefined,
      sewoon: seGz ?? undefined,
      wolwoon: wolGz ?? undefined,
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
  }, [parsed, hourData, daeGz, seGz, wolGz]);

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
          pillars={[
            { key: "hour", label: "시주", data: hourData },
            { key: "day", label: "일주", data: parsed.day },
            { key: "month", label: "월주", data: parsed.month },
            { key: "year", label: "년주", data: parsed.year },
          ]}
        />
      </div>

      <SajuRelationPanels
        isDesktop={isDesktop}
        exposureLevel={exposureLevel}
        relationChips={relationChips}
        relationByPillar={relationByPillar}
        activeRelationTag={activeRelationTag}
        onToggleRelationTag={setActiveRelationTag}
        showRelationBox={showRelationBox}
        showEtcShinsalBox={showEtcShinsalBox}
        etcShinsalGood={etcShinsal.good}
        etcShinsalBad={etcShinsal.bad}
      />

      {unknownTime && (
        <HourPredictionPanel
          hourCandidates={hourCandidates}
          useInsi={useInsi}
          onToggleRule={() => setUseInsi((prev) => !prev)}
          manualHour={manualHour}
          onSelectHour={handleManualHourSelect}
        />
      )}
    </div>
  );
}
