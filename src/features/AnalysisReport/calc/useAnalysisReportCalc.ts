import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { normalizeGZ } from "../logic/relations";
import { computeUnifiedPower } from "../utils/unifiedPower";
import computeYongshin from "../calc/yongshin";
import { natalShinPercent } from "../logic/powerPercent";
import { getTenGodColors } from "../utils/colors";
import type { Element, TenGod } from "../utils/types";
import type { BlendTab } from "../logic/blend";
import {
  bareToFullStemMap,
  elementPresenceFromPillars,
  hasValidYmd,
  lightElementScoreFromPillars,
  mergeWithRatio,
  normalizeTo100,
  normalizePillars,
  stemsScaledToElementPercent100,
  stemsScaledToSubTotals,
  subTotalsToMainTotals,
  toBareFromGZ,
  toBareStemMap,
  type TenGodMain,
} from "./reportCalc";

type YongshinItem = { element: string; elNorm: Element | null; score: number; reasons: string[] };
type YongshinResult = { ordered: Array<{ element: string; score?: number; reasons?: string[] }> } | null;

type Args = {
  data: MyeongSik;
  pillars: string[];
  lunarPillars?: string[] | null;
  daewoonGzProp?: string | null;
  blendTab: BlendTab;
  demoteAbsent: boolean;
};

export function useAnalysisReportCalc({
  data,
  pillars,
  lunarPillars,
  daewoonGzProp,
  blendTab,
  demoteAbsent,
}: Args) {
  const { date, yearGZ, monthGZ, dayGZ } = useLuckPickerStore();
  const seGz = useMemo(() => normalizeGZ(yearGZ), [yearGZ]);
  const wolGz = useMemo(() => normalizeGZ(monthGZ), [monthGZ]);
  const ilGz = useMemo(() => normalizeGZ(dayGZ), [dayGZ]);

  const daeList = useDaewoonList(data, data?.mingSikType);
  const autoDaeIndex = useMemo(() => {
    if (!daeList?.length) return 0;
    const i = daeList.findIndex((d, k) => {
      const next = daeList[k + 1]?.at;
      return date >= d.at && (!next || date < next);
    });
    if (i !== -1) return i;
    if (date < daeList[0].at) return 0;
    return daeList.length - 1;
  }, [daeList, date]);

  const daewoonGz = useMemo(() => {
    const raw = daewoonGzProp ?? daeList?.[autoDaeIndex]?.gz ?? "";
    const ko = normalizeGZ(raw);
    return ko || null;
  }, [daewoonGzProp, daeList, autoDaeIndex]);

  const { manualHour } = useHourPredictionStore();
  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  const solarKo = useMemo(() => normalizePillars(pillars), [pillars]);
  const lunarKo = useMemo(() => normalizePillars(lunarPillars), [lunarPillars]);

  const solarKoWithHour = useMemo(() => {
    const arr = [...solarKo] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "" || arr[3] === "--") && manualHour) {
      arr[3] = manualHour.stem + manualHour.branch;
    }
    return arr;
  }, [solarKo, manualHour]);
  const lunarKoWithHour = useMemo(() => {
    const arr = [...lunarKo] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "" || arr[3] === "--") && manualHour) {
      arr[3] = manualHour.stem + manualHour.branch;
    }
    return arr;
  }, [lunarKo, manualHour]);

  const computedFallback = useMemo<[string, string, string, string] | null>(() => {
    const y = Number(data.birthDay?.slice(0, 4));
    const m = Number(data.birthDay?.slice(4, 6));
    const d = Number(data.birthDay?.slice(6, 8));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const base = new Date(y, m - 1, d, 12, 0, 0, 0);
    const yn = normalizeGZ(getYearGanZhi(base) || "");
    const wl = normalizeGZ(getMonthGanZhi(base) || "");
    const il = normalizeGZ(getDayGanZhi(base, rule) || "");
    return [yn, wl, il, ""];
  }, [data.birthDay, rule]);

  const solarValid = hasValidYmd(solarKoWithHour);
  const lunarValid = hasValidYmd(lunarKoWithHour);

  const basis: "solar" | "lunar" = "solar";
  const effectiveBasis: "solar" | "lunar" =
    basis === "lunar"
      ? (lunarValid ? "lunar" : solarValid ? "solar" : "lunar")
      : (solarValid ? "solar" : lunarValid ? "lunar" : "solar");

  const activePillars = useMemo<[string, string, string, string]>(() => {
    const source =
      effectiveBasis === "lunar"
        ? (lunarValid ? lunarKoWithHour : solarValid ? solarKoWithHour : computedFallback ?? ["", "", "", ""])
        : (solarValid ? solarKoWithHour : lunarValid ? lunarKoWithHour : computedFallback ?? ["", "", "", ""]);
    const arr = [...source] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "" || arr[3] === "--") && manualHour) {
      arr[3] = manualHour.stem + manualHour.branch;
    }
    if (arr[3] === "--") arr[3] = "";
    return arr;
  }, [effectiveBasis, solarValid, lunarValid, solarKoWithHour, lunarKoWithHour, computedFallback, manualHour]);

  const hourKeyForUi = useMemo(
    () => (manualHour ? manualHour.stem + manualHour.branch : activePillars[3] || ""),
    [manualHour, activePillars]
  );

  const chain = useMemo(() => ({
    dae: blendTab !== "원국" ? daewoonGz ?? null : null,
    se: (blendTab === "세운" || blendTab === "월운" || blendTab === "일운") ? (seGz ?? null) : null,
    wol: (blendTab === "월운" || blendTab === "일운") ? (wolGz ?? null) : null,
    il: (blendTab === "일운") ? (ilGz ?? null) : null,
  }), [blendTab, daewoonGz, seGz, wolGz, ilGz]);

  const unified = useMemo(() => {
    return computeUnifiedPower({ natal: activePillars, tab: blendTab, chain, hourKey: hourKeyForUi });
  }, [activePillars, blendTab, chain, hourKeyForUi]);

  const overlay = useMemo(() => {
    if (!unified) return null;

    const natalBare = toBareStemMap(unified.perStemElementScaled);
    const daeBare = chain.dae ? toBareFromGZ(chain.dae) : {};
    const seBare = chain.se ? toBareFromGZ(chain.se) : {};
    const wolBare = chain.wol ? toBareFromGZ(chain.wol) : {};
    const ilBare = chain.il ? toBareFromGZ(chain.il) : {};

    const merged = mergeWithRatio([
      { kind: "natal", bare: natalBare },
      { kind: "dae", bare: daeBare },
      { kind: "se", bare: seBare },
      { kind: "wol", bare: wolBare },
      { kind: "il", bare: ilBare },
    ]);

    const mergedNorm = normalizeTo100(merged);
    const perStemAugFull = bareToFullStemMap(mergedNorm);
    const totalsSub = stemsScaledToSubTotals(merged, unified.dayStem);
    const totalsMain = subTotalsToMainTotals(totalsSub);
    const elemPct100 = stemsScaledToElementPercent100(merged);

    return { perStemAugBare: merged, perStemAugFull, elemPct100, totalsMain, totalsSub };
  }, [unified, chain]);

  const presentMap = useMemo(
    () => elementPresenceFromPillars(activePillars, { includeBranches: true }),
    [activePillars]
  );
  const hasAbsent = useMemo(
    () => (["목", "화", "토", "금", "수"] as Element[]).some((el) => !presentMap[el]),
    [presentMap]
  );

  const elemForFallback = overlay?.elemPct100 ?? unified?.elementPercent100 ?? lightElementScoreFromPillars(activePillars);

  const chartData = useMemo(() => {
    if (!unified || !overlay) return [] as Array<{ name: TenGodMain; value: number; color: string }>;
    const colors = getTenGodColors(unified.dayStem);
    return (Object.entries(overlay.totalsMain) as [TenGodMain, number][])
      .map(([name, value]) => ({
        name,
        value,
        color: colors[name as TenGod],
      }));
  }, [unified, overlay]);

  const elementPct = overlay?.elemPct100 ?? { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const tenSubTotals100 = overlay?.totalsSub ?? null;

  const luckKey = useMemo(
    () =>
      [
        blendTab,
        daewoonGz ?? "",
        seGz ?? "",
        wolGz ?? "",
        ilGz ?? "",
        date?.toISOString?.() ?? "",
        hourKeyForUi,
      ].join("|"),
    [blendTab, daewoonGz, seGz, wolGz, ilGz, date, hourKeyForUi]
  );

  const revKey = useMemo(() => {
    const subsSig = tenSubTotals100
      ? (Object.entries(tenSubTotals100)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}:${v}`)
        .join(","))
      : "none";

    const dataSig = chartData.map((d) => `${d.name}:${d.value}`).join(",");

    return `${luckKey}||${activePillars.join("")}||${dataSig}||${subsSig}`;
  }, [luckKey, activePillars, chartData, tenSubTotals100]);

  const yongshinRaw: YongshinResult =
    typeof computeYongshin === "function"
      ? (computeYongshin(activePillars, unified?.totals) as YongshinResult)
      : null;

  const yongshinList = useMemo<YongshinItem[]>(() => {
    const rawArr = yongshinRaw?.ordered ?? [];
    const list: YongshinItem[] = rawArr.map((rec) => {
      const element = rec.element ?? "";
      const elNorm: Element | null =
        /목|木|wood/i.test(element) ? "목" :
        /화|火|fire/i.test(element) ? "화" :
        /토|土|earth/i.test(element) ? "토" :
        /금|金|metal/i.test(element) ? "금" :
        /수|水|water/i.test(element) ? "수" : null;
      const score = typeof rec.score === "number"
        ? rec.score
        : elNorm
          ? (elemForFallback[elNorm] ?? 0)
          : 0;
      const reasons = Array.isArray(rec.reasons) ? rec.reasons : [];
      return { element, elNorm, score, reasons };
    });

    const getPresent = (el: Element | null): boolean => (el ? presentMap[el] : false);

    const demoted = demoteAbsent
      ? list.map((it) =>
        it.elNorm && !getPresent(it.elNorm)
          ? { ...it, score: 0, reasons: [...it.reasons, "부재후순위: 원국 부재 → 0점"] }
          : it
      )
      : list;

    demoted.sort((a, b) => {
      const ap = getPresent(a.elNorm) ? 1 : 0;
      const bp = getPresent(b.elNorm) ? 1 : 0;
      if (demoteAbsent && ap !== bp) return bp - ap;
      if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
      return (a.elNorm ?? a.element).localeCompare(b.elNorm ?? b.element);
    });

    return demoted;
  }, [yongshinRaw, demoteAbsent, elemForFallback, presentMap]);

  const maxScore = useMemo(
    () => Math.max(0, ...yongshinList.map((it) => (Number.isFinite(it.score) ? it.score : 0))),
    [yongshinList]
  );

  const dayElementPercent = useMemo(
    () => natalShinPercent(activePillars, { criteriaMode: "modern", useHarmonyOverlay: true }),
    [activePillars]
  );

  return {
    seGz,
    wolGz,
    ilGz,
    daewoonGz,
    activePillars,
    chain,
    unified,
    overlay,
    chartData,
    elementPct,
    tenSubTotals100,
    hourKeyForUi,
    revKey,
    yongshinList,
    maxScore,
    hasAbsent,
    dayElementPercent,
    isValidActive: hasValidYmd(activePillars),
  };
}
