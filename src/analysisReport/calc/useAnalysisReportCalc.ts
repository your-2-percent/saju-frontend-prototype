import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, shiftDayGZ } from "@/shared/domain/ganji/common";
import { useLuckPickerStore } from "@/luck/input/useLuckPickerStore";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { normalizeGZ } from "@/analysisReport/calc/logic/relations";
import { computeUnifiedPower, mapElementToTenGod } from "@/analysisReport/calc/utils/unifiedPower";
import computeYongshin from "@/analysisReport/calc/yongshin";
import { natalShinPercent } from "@/analysisReport/calc/logic/powerPercent";
import { getTenGodColors } from "@/analysisReport/calc/utils/colors";
import type { Element, TenGod } from "@/analysisReport/calc/utils/types";
import type { BlendTab } from "@/analysisReport/calc/logic/blend";
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

// ✅ 멀티 용신
import {
  buildMultiYongshin,
  type YongshinMultiResult,
  type YongshinItem as MultiYongshinItem,
} from "../calc/yongshin/multi";

// ✅ 격국 판정 + 격국용신 후보 변환
import { computeNaegyeok } from "@/analysisReport/calc/logic/gyeokguk";
import { buildGyeokgukYongshinCandidates } from "@/analysisReport/calc/logic/gyeokguk/gyeokgukYongshin";

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

const safeStem = (gz: string) => (gz && gz.length >= 1 ? gz.charAt(0) : "");
const safeBranch = (gz: string) => (gz && gz.length >= 2 ? gz.charAt(1) : "");
const ELEMENT_STEM_PAIRS: Record<Element, readonly [string, string]> = {
  목: ["갑", "을"],
  화: ["병", "정"],
  토: ["무", "기"],
  금: ["경", "신"],
  수: ["임", "계"],
};

function parseBirthDateNoon(birthDay?: string | null): Date {
  const s = String(birthDay ?? "");
  if (!/^\d{8}$/.test(s)) return new Date();
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(4, 6));
  const d = Number(s.slice(6, 8));
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0);
  return Number.isNaN(dt.getTime()) ? new Date() : dt;
}

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

  const { manualHour, usePrevDay } = useHourPredictionStore();
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

  const basis: "solar" | "lunar" = data.calendarType === "lunar" ? "lunar" : "solar";
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
    if (!usePrevDay) return arr;
    const shifted = shiftDayGZ(arr[2] || "", -1);
    return [arr[0], arr[1], shifted, arr[3]];
  }, [effectiveBasis, solarValid, lunarValid, solarKoWithHour, lunarKoWithHour, computedFallback, manualHour, usePrevDay]);

  const dayStem = useMemo(() => safeStem(activePillars[2] ?? ""), [activePillars]);
  const monthBranch = useMemo(() => safeBranch(activePillars[1] ?? ""), [activePillars]);
  const birthDateForGyeok = useMemo(() => parseBirthDateNoon(data.birthDay), [data.birthDay]);

  const hourKeyForUi = useMemo(
    () => (manualHour ? manualHour.stem + manualHour.branch : activePillars[3] || ""),
    [manualHour, activePillars]
  );

  const chain = useMemo(
    () => ({
      dae: blendTab !== "원국" ? daewoonGz ?? null : null,
      se: blendTab === "세운" || blendTab === "월운" || blendTab === "일운" ? (seGz ?? null) : null,
      wol: blendTab === "월운" || blendTab === "일운" ? (wolGz ?? null) : null,
      il: blendTab === "일운" ? (ilGz ?? null) : null,
    }),
    [blendTab, daewoonGz, seGz, wolGz, ilGz]
  );

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

  const elemForFallback =
    overlay?.elemPct100 ?? unified?.elementPercent100 ?? lightElementScoreFromPillars(activePillars);

  const baseChartData = useMemo(() => {
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
  const tenSubTotals100 = overlay?.totalsSub ?? unified?.perTenGodSub ?? null;

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

  // --------------------
  // 기존 억부용신(= computeYongshin 결과)
  // --------------------
  const yongshinRaw: YongshinResult =
    typeof computeYongshin === "function"
      ? (computeYongshin(activePillars, unified?.totals) as YongshinResult)
      : null;

  const eokbuList = useMemo<YongshinItem[]>(() => {
    const rawArr = yongshinRaw?.ordered ?? [];
    return rawArr.map((rec) => {
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
  }, [yongshinRaw, elemForFallback]);

  // ✅ 멀티에 넣을 억부 후보(타입 맞춤)
  const eokbuListForMulti = useMemo<MultiYongshinItem[]>(
    () => eokbuList.map((x) => ({ element: x.element, elNorm: x.elNorm, score: x.score, reasons: x.reasons })),
    [eokbuList]
  );

  // --------------------
  // ✅ 격국용신 후보(내격/진신/가신 기반) 자동 생성
  // --------------------
  const gyeokgukList = useMemo<MultiYongshinItem[]>(() => {
    if (!dayStem || !monthBranch) return [];

    const [yGZ, mGZ, dGZ, hGZ] = activePillars;

    const emittedStems = [safeStem(yGZ), safeStem(mGZ), safeStem(dGZ), safeStem(hGZ)].filter(Boolean);
    const otherBranches = [safeBranch(yGZ), safeBranch(dGZ), safeBranch(hGZ)].filter(Boolean);

    const inner = computeNaegyeok({
      dayStem,
      monthBranch,
      date: birthDateForGyeok,
      pillars: activePillars,
      emittedStems,
      otherBranches,
    });

    // buildGyeokgukYongshinCandidates는 (inner, dayStem) → YongshinItem[] 형태로 만든다고 가정
    const items = buildGyeokgukYongshinCandidates(inner, dayStem);

    const toElNorm = (label: string): Element | null => {
      if (/목|木|wood/i.test(label)) return "목";
      if (/화|火|fire/i.test(label)) return "화";
      if (/토|土|earth/i.test(label)) return "토";
      if (/금|金|metal/i.test(label)) return "금";
      if (/수|水|water/i.test(label)) return "수";
      return null;
    };

    return (items ?? []).map((it) => ({
      element: it.element,
      elNorm: toElNorm(it.element),
      score: Number.isFinite(it.score) ? it.score : 0,
      reasons: Array.isArray(it.reasons) ? it.reasons : [],
    }));
  }, [activePillars, dayStem, monthBranch, birthDateForGyeok]);

  // --------------------
  // ✅ 멀티 용신(억부/조후/통관/병약/격국)
  // --------------------
  const yongshinMulti: YongshinMultiResult = useMemo(() => {
    const monthGzForJohu = activePillars[1] || "";

    return buildMultiYongshin({
      eokbuList: eokbuListForMulti,
      monthGz: monthGzForJohu,
      elemPct: elemForFallback,
      presentMap,
      demoteAbsent,
      pillars: activePillars,
      gyeokgukList,
    });
  }, [activePillars, eokbuListForMulti, elemForFallback, presentMap, demoteAbsent, gyeokgukList]);

  const adjustedElemPct100 = useMemo<Record<Element, number> | null>(() => {
    const adjusted = yongshinMulti.adjustedElemPct;
    if (!adjusted) return null;
    return normalizeTo100({
      목: adjusted.목 ?? 0,
      화: adjusted.화 ?? 0,
      토: adjusted.토 ?? 0,
      금: adjusted.금 ?? 0,
      수: adjusted.수 ?? 0,
    }) as Record<Element, number>;
  }, [yongshinMulti.adjustedElemPct]);

  const chartData = useMemo(() => {
    if (!dayStem || !adjustedElemPct100) return baseChartData;

    const totals: Record<TenGodMain, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
    for (const el of ["목", "화", "토", "금", "수"] as const) {
      const ten = mapElementToTenGod(dayStem, el) as TenGodMain;
      totals[ten] += adjustedElemPct100[el] ?? 0;
    }

    const normalized = normalizeTo100(totals) as Record<TenGodMain, number>;
    const colors = getTenGodColors(dayStem);

    return (Object.entries(normalized) as [TenGodMain, number][])
      .map(([name, value]) => ({
        name,
        value,
        color: colors[name as TenGod],
      }));
  }, [adjustedElemPct100, baseChartData, dayStem]);

  const pentagonPerStemScaled = useMemo(() => {
    const baseFull = overlay?.perStemAugFull;
    if (!baseFull || !adjustedElemPct100) return baseFull;

    const baseMap = baseFull as Record<string, number>;
    const outBare: Record<string, number> = {};

    for (const el of ["목", "화", "토", "금", "수"] as const) {
      const [s1, s2] = ELEMENT_STEM_PAIRS[el];
      const k1 = `${s1}${el}`;
      const k2 = `${s2}${el}`;
      const b1 = Math.max(0, Number(baseMap[k1] ?? 0));
      const b2 = Math.max(0, Number(baseMap[k2] ?? 0));
      const baseSum = b1 + b2;
      const target = Math.max(0, Number(adjustedElemPct100[el] ?? 0));

      if (target <= 0) {
        outBare[s1] = 0;
        outBare[s2] = 0;
        continue;
      }

      if (baseSum <= 0) {
        outBare[s1] = Math.round(target);
        outBare[s2] = 0;
        continue;
      }

      const r1 = (b1 / baseSum) * target;
      const r2 = (b2 / baseSum) * target;
      const f1 = Math.floor(r1);
      const f2 = Math.floor(r2);
      let rem = Math.round(target) - (f1 + f2);

      let n1 = f1;
      let n2 = f2;
      if (rem > 0) {
        if (r1 - f1 >= r2 - f2) n1 += 1;
        else n2 += 1;
        rem -= 1;
      }
      if (rem > 0) n1 += rem;

      outBare[s1] = n1;
      outBare[s2] = n2;
    }

    return bareToFullStemMap(outBare);
  }, [adjustedElemPct100, overlay?.perStemAugFull]);

  const revKey = useMemo(() => {
    const subsSig = tenSubTotals100
      ? Object.entries(tenSubTotals100)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}:${v}`)
          .join(",")
      : "none";

    const dataSig = chartData.map((d) => `${d.name}:${d.value}`).join(",");

    return `${luckKey}||${activePillars.join("")}||${dataSig}||${subsSig}`;
  }, [luckKey, activePillars, chartData, tenSubTotals100]);

  // 기존 UI 호환용: best 후보 리스트(없으면 억부)
  const yongshinList = useMemo<YongshinItem[]>(() => {
    const best = yongshinMulti.best;
    if (best?.candidates?.length) {
      return best.candidates.map((c) => ({
        element: c.element,
        elNorm: c.elNorm,
        score: c.score,
        reasons: c.reasons,
      }));
    }
    return eokbuList;
  }, [yongshinMulti, eokbuList]);

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
    pentagonPerStemScaled,
    elementPct,
    tenSubTotals100,
    hourKeyForUi,
    revKey,

    // ✅ 추가/호환
    yongshinMulti,
    yongshinRecommend: yongshinMulti, // AnalysisReport.tsx에서 calc.yongshinRecommend 쓰는 거 대응
    yongshinList,
    maxScore,
    hasAbsent,

    dayElementPercent,
    isValidActive: hasValidYmd(activePillars),
  };
}
