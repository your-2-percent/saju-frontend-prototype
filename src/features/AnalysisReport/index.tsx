// features/AnalysisReport/AnalysisReport.tsx
import { useMemo, useState } from "react";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { computePowerDataDetailed } from "./utils/computePowerData";
import PentagonChart from "./PentagonChart";
import StrengthBar from "./StrengthBar";
import HarmonyTagPanel from "./HarmonyTagPanel";
import { getTenGodColors } from "./utils/colors";
import type { PowerData, Element, TenGod } from "./utils/types";
import computeYongshin from "./utils/yongshin"; // ✅ 기본 함수 export 가정
import { normalizeGZ } from "./logic/relations";
import type { CriteriaMode } from "./utils/strength";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import type { MyeongSik } from "@/shared/lib/storage";
import { blendElementStrength, type BlendTab, BLEND_TABS } from "./logic/blend";
import { mapElementsToTenGods } from "./utils/tenGod";
import ShinsalTagPanel from "./ShinsalTagPanel";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import ClimateBars from "./ClimateBars";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";

const EMPTY_TOTALS: ReadonlyArray<PowerData> = Object.freeze([]);

const STEM_H2K: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
const BRANCH_H2K: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};
const STEM_TO_ELEMENT: Record<string, Element> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토",
  경: "금", 신: "금", 임: "수", 계: "수",
};
const BRANCH_MAIN_ELEMENT: Record<string, Element> = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
  오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};

function normalizeGZLocal(raw: string): string {
  if (!raw) return "";
  const s = raw
    .replace(/[()[\]{}]/g, "")
    .replace(/\s+/g, "")
    .replace(/[년월일시年月日時干支柱:\-_.]/g, "");
  const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
  if (mKo) return `${mKo[1]}${mKo[2]}`;
  const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
  if (mHa) {
    const st = STEM_H2K[mHa[1] as keyof typeof STEM_H2K];
    const br = BRANCH_H2K[mHa[2] as keyof typeof BRANCH_H2K];
    return st && br ? `${st}${br}` : "";
  }
  return "";
}

function normalizePillars(input?: string[] | null): string[] {
  const arr = Array.isArray(input) ? input.slice(0, 4) : [];
  while (arr.length < 4) arr.push("");

  return arr.map((raw, idx) => {
    if (!raw) return ""; // 빈값 그대로
    const s = raw
      .replace(/[()[\]{}]/g, "")
      .replace(/\s+/g, "")
      .replace(/[년월일시年月日時干支柱:\-_.]/g, "");

    const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
    if (mKo) return `${mKo[1]}${mKo[2]}`;

    const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
    if (mHa) {
      return `${STEM_H2K[mHa[1] as keyof typeof STEM_H2K]}${BRANCH_H2K[mHa[2] as keyof typeof BRANCH_H2K]}`;
    }

    // 🚨 못 잡으면 최소 2자리 보장 위해 일단 "공백" 대신 ???
    return idx <= 2 ? "--" : ""; 
  });
}

function elementPresenceFromPillars(
  p: [string, string, string, string],
  opts?: { includeBranches?: boolean }
): Record<Element, boolean> {
  const includeBranches = !!opts?.includeBranches;
  const present: Record<Element, boolean> = { 목: false, 화: false, 토: false, 금: false, 수: false };
  for (const gz of p) {
    if (!gz) continue;
    const se = STEM_TO_ELEMENT[gz.charAt(0)];
    if (se) present[se] = true;
    if (includeBranches) {
      const be = BRANCH_MAIN_ELEMENT[gz.charAt(1)];
      if (be) present[be] = true;
    }
  }
  return present;
}

function lightElementScoreFromPillars(
  p: [string, string, string, string]
): Record<Element, number> {
  const acc: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const gz of p) {
    if (!gz) continue;
    const se = STEM_TO_ELEMENT[gz.charAt(0)];
    const be = BRANCH_MAIN_ELEMENT[gz.charAt(1)];
    if (se) acc[se] += 10;
    if (be) acc[be] += 6;
  }
  return acc;
}

/** 연·월·일이 유효하면 true (시주는 비어도 OK) */
function hasValidYmd(p: [string, string, string, string]): boolean {
  return p[0]?.length === 2 && p[1]?.length === 2 && p[2]?.length === 2;
}

/** Yongshin 결과 최소 형태 */
type YongshinItem = { element: string; elNorm: Element | null; score: number; reasons: string[] };
type YongshinResult = { ordered: Array<{ element: string; score?: number; reasons?: string[] }> } | null;

export default function AnalysisReport({
  data,
  pillars,
  lunarPillars,
  daewoonGz: daewoonGzProp,
}: {
  data: MyeongSik;
  pillars: string[];
  lunarPillars?: string[] | null;
  daewoonGz?: string | null;
}) {
  const settings = useSettingsStore((s) => s.settings);
  const [basis] = useState<"solar" | "lunar">("solar");
  const [demoteAbsent, setDemoteAbsent] = useState(true);
  const [criteriaMode, setCriteriaMode] = useState<CriteriaMode>("modern");

  // 섹션/운 탭
  const [bigTab, setBigTab] = useState<"일간 · 오행 강약" | "형충회합" | "신살">("일간 · 오행 강약");
  const [blendTab, setBlendTab] = useState<BlendTab>("원국");

  // 전역 피커 운
  const { date, yearGZ, monthGZ, dayGZ } = useLuckPickerStore();
  const seGz = useMemo(() => normalizeGZ(yearGZ), [yearGZ]);
  const wolGz = useMemo(() => normalizeGZ(monthGZ), [monthGZ]);
  const ilGz  = useMemo(() => normalizeGZ(dayGZ), [dayGZ]);

  // 대운
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

  // 시주 예측
  const { manualHour } = useHourPredictionStore();
  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "야자시";

  // 1) props 정규화
  const solarKo = useMemo(() => normalizePillars(pillars), [pillars]);
  const lunarKo = useMemo(() => normalizePillars(lunarPillars), [lunarPillars]);

  // 2) 시주 예측 주입
  const solarKoWithHour = useMemo(() => {
    const arr = [...solarKo] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [solarKo, manualHour]);

  const lunarKoWithHour = useMemo(() => {
    const arr = [...lunarKo] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [lunarKo, manualHour]);

  // 3) props가 깨졌을 때 data로 연/월/일 Fallback (정오 기준)
  const computedFallback = useMemo<[string, string, string, string] | null>(() => {
    const y = Number(data.birthDay?.slice(0, 4));
    const m = Number(data.birthDay?.slice(4, 6));
    const d = Number(data.birthDay?.slice(6, 8));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const base = new Date(y, m - 1, d, 12, 0, 0, 0); // 정오
    const yn = normalizeGZLocal(getYearGanZhi(base) || "");
    const wl = normalizeGZLocal(getMonthGanZhi(base) || "");
    const il = normalizeGZLocal(getDayGanZhi(base, rule) || "");
    const si = ""; // 시간 미상
    return [yn, wl, il, si];
  }, [data.birthDay, rule]);

  const solarValid    = hasValidYmd(solarKoWithHour);
  const lunarValid    = hasValidYmd(lunarKoWithHour);
  //const fallbackValid = computedFallback ? hasValidYmd(computedFallback) : false;

  // 4) 최종 activePillars (우선순위: props→fallback) + 수동시주 재주입
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
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [effectiveBasis, solarValid, lunarValid, solarKoWithHour, lunarKoWithHour, computedFallback, manualHour]);

  // 시주 변경 트리거 키 (computePowerDataDetailed 요구)
  const hourKey = useMemo(() => (manualHour ? manualHour.stem + manualHour.branch : activePillars[3] || ""), [manualHour, activePillars]);

  // 설정
  const mode   = settings.hiddenStemMode === "classic" ? "classic" : "hgc";
  const hidden = settings.hiddenStem === "regular" ? "regular" : "all";

  // 운 입력
  const luckInput = useMemo(
    () => ({
      tab: blendTab as "원국" | "대운" | "세운" | "월운" | "일운",
      dae: blendTab !== "원국" ? daewoonGz || undefined : undefined,
      se:  blendTab === "세운" || blendTab === "월운" || blendTab === "일운" ? seGz || undefined : undefined,
      wol: blendTab === "월운" || blendTab === "일운" ? wolGz || undefined : undefined,
      il:  blendTab === "일운" ? ilGz || undefined : undefined,
    }),
    [blendTab, daewoonGz, seGz, wolGz, ilGz]
  );

  // 원국(운X)
  const detailedNatal = useMemo(() => {
    if (!hasValidYmd(activePillars)) return null;
    return computePowerDataDetailed({
      pillars: activePillars,
      dayStem: activePillars[2]?.charAt(0) ?? "",
      mode,
      hidden,
      debug: false,
      useHarmonyOverlay: false,
      criteriaMode,
      hourKey, // ✅ 필수 전달
    });
  }, [criteriaMode, activePillars, mode, hidden, hourKey]);

  // 운 반영(운O)
  const detailedLuck = useMemo(() => {
    if (!hasValidYmd(activePillars)) return null;
    return computePowerDataDetailed({
      pillars: activePillars,
      dayStem: activePillars[2]?.charAt(0) ?? "",
      mode,
      hidden,
      debug: false,
      useHarmonyOverlay: false,
      criteriaMode,
      luck: luckInput,
      hourKey, // ✅ 필수 전달
    });
  }, [criteriaMode, activePillars, mode, hidden, luckInput, hourKey]);

  // ── 원국 전용 값들 ──
  const totalsNatal = useMemo(() => detailedNatal?.totals ?? EMPTY_TOTALS, [detailedNatal]);
  const elementScoreNatal = detailedNatal?.elementScoreRaw ?? lightElementScoreFromPillars(activePillars);

  //const colorsMapNatal = getTenGodColors(activePillars[2]?.charAt(0));
  //const natalDataForChart = totalsNatal.map((d) => ({ ...d, color: colorsMapNatal[d.name as TenGod] }));

  const totalsMapNatal: Record<TenGod, number> = useMemo(() => {
    const m: Record<TenGod, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
    totalsNatal.forEach((t) => { m[t.name as TenGod] = t.value; });
    return m;
  }, [totalsNatal]);

  const multNatal: Record<TenGod, number> = useMemo(() => {
    const flags = detailedNatal?.deukFlags;
    if (!flags) return { 비겁: 1, 식상: 1, 재성: 1, 관성: 1, 인성: 1 };
    const W_L = 0.08, W_G = 0.05, W_S = 0.07;
    const out: Record<TenGod, number> = { 비겁: 1, 식상: 1, 재성: 1, 관성: 1, 인성: 1 };
    (Object.keys(flags) as TenGod[]).forEach((k) => {
      const f = flags[k];
      out[k] += (f.령 ? W_L : 0) + (f.지 ? W_G : 0) + (f.세 ? W_S : 0);
    });
    return out;
  }, [detailedNatal?.deukFlags]);

  const strengthPct = useMemo(() => {
    const numerator = (totalsMapNatal.비겁 ?? 0) * multNatal.비겁 + (totalsMapNatal.인성 ?? 0) * multNatal.인성;
    const denom =
      (totalsMapNatal.비겁 ?? 0) * multNatal.비겁 +
      (totalsMapNatal.식상 ?? 0) * multNatal.식상 +
      (totalsMapNatal.재성 ?? 0) * multNatal.재성 +
      (totalsMapNatal.관성 ?? 0) * multNatal.관성 +
      (totalsMapNatal.인성 ?? 0) * multNatal.인성;
    if (denom <= 0) {
      const sum =
        (totalsMapNatal.비겁 ?? 0) +
        (totalsMapNatal.식상 ?? 0) +
        (totalsMapNatal.재성 ?? 0) +
        (totalsMapNatal.관성 ?? 0) +
        (totalsMapNatal.인성 ?? 0) || 1;
      return (((totalsMapNatal.비겁 ?? 0) + (totalsMapNatal.인성 ?? 0)) / sum) * 100;
    }
    return (numerator / denom) * 100;
  }, [totalsMapNatal, multNatal]);

  const presentMap = useMemo(
    () => elementPresenceFromPillars(activePillars, { includeBranches: true }),
    [activePillars]
  );
  

  const hasAbsent = useMemo(
    () => (["목", "화", "토", "금", "수"] as Element[]).some((el) => !presentMap[el]),
    [presentMap]
  );
  const elemForFallback = elementScoreNatal ?? lightElementScoreFromPillars(activePillars);

  const mixed = blendElementStrength({
    natalElementScore: elementScoreNatal,
    daewoonGz: blendTab !== "원국" ? daewoonGz ?? undefined : undefined,
    sewoonGz: blendTab === "세운" || blendTab === "월운" || blendTab === "일운" ? seGz ?? undefined : undefined,
    wolwoonGz: blendTab === "월운" || blendTab === "일운" ? wolGz ?? undefined : undefined,
    ilwoonGz: blendTab === "일운" ? ilGz ?? undefined : undefined,
    tab: blendTab,
  });

  const chartData = useMemo(() => {
    const colors = getTenGodColors(activePillars[2]?.charAt(0));
    return (["비겁", "식상", "재성", "관성", "인성"] as TenGod[]).map((god) => {
      const value = (["목", "화", "토", "금", "수"] as Element[])
        .map((el) => (mapElementsToTenGods(el, activePillars[2][0]) === god ? mixed[el] : 0))
        .reduce((a, b) => a + b, 0);
      return { name: god, value, color: colors[god] };
    });
  }, [mixed, activePillars]);

  type ChartEntry = {
    a?: string | number;
    b?: string | number;
    aVal?: number | string;
    bVal?: number | string;
    비견?: number;
    겁재?: number;
    정재?: number;
    편재?: number;
    [key: string]: unknown;
  };
  type PerTenGod = Record<TenGod, ChartEntry>;

  const perTenGodForChart = useMemo<PerTenGod | undefined>(() => {
    if (!detailedLuck?.perTenGod) return undefined;
    const cloned: PerTenGod = JSON.parse(JSON.stringify(detailedLuck.perTenGod));
    (["비겁", "식상", "재성", "관성", "인성"] as TenGod[]).forEach((name) => {
      const target = chartData.find((d) => d.name === name)?.value ?? 0;
      const p = cloned[name];
      const sum = Number(p?.aVal ?? 0) + Number(p?.bVal ?? 0);
      const round1 = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10;
      if (sum > 0) {
        const aRaw = (target * Number(p.aVal ?? 0)) / sum;
        const a = round1(aRaw);
        const b = round1(target - a);
        p.aVal = a;
        p.bVal = b;
      } else {
        const a = round1(target / 2);
        const b = round1(target - a);
        p.aVal = a;
        p.bVal = b;
      }
    });
    return cloned;
  }, [detailedLuck, chartData]);

  const hourKeyForUi = useMemo(
    () => (manualHour ? manualHour.stem + manualHour.branch : activePillars[3] || ""),
    [manualHour, activePillars]
  );

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
    const subsSig = perTenGodForChart
      ? (["비겁", "식상", "재성", "관성", "인성"] as const)
          .map((k) => {
            const s = perTenGodForChart[k];
            const a = Number(s?.aVal ?? s?.비견 ?? s?.정재 ?? 0);
            const b = Number(s?.bVal ?? s?.겁재 ?? s?.편재 ?? 0);
            return `${k}:${a}|${b}`;
          })
          .join(",")
      : "none";
    const dataSig = chartData.map((d) => `${d.name}:${d.value}`).join(",");
    return `${luckKey}||${activePillars.join("")}||${dataSig}||${subsSig}`;
  }, [luckKey, activePillars, chartData, perTenGodForChart]);

  // 용신(원국 기준)
  const yongshinRaw: YongshinResult =
    typeof computeYongshin === "function"
      ? (computeYongshin(activePillars, detailedNatal?.totals) as YongshinResult)
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

  // 유효성(연·월·일 필수)
  if (!hasValidYmd(activePillars)) {
    return (
      <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-sm">
        간지를 인식할 수 없어요.
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-4">
      {/* 운 탭 */}
      <div className="flex gap-2 justify-center flex-wrap">
        {BLEND_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setBlendTab(t)}
            className={
              "px-2 py-1 text-xs rounded border cursor-pointer " +
              (blendTab === t
                ? "bg-yellow-500 text-black border-yellow-600"
                : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* 섹션 탭 */}
      <div className="flex gap-2 mb-2 justify-center flex-wrap">
        {["일간 · 오행 강약", "형충회합", "신살"].map((t) => (
          <button
            key={t}
            onClick={() => setBigTab(t as typeof bigTab)}
            className={
              "px-3 py-1 text-sm rounded border cursor-pointer " +
              (bigTab === t
                ? "bg-violet-500 text-white border-violet-600"
                : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* 형충회합 */}
      {bigTab === "형충회합" && (
        <HarmonyTagPanel
          key={`harm-${blendTab}-${hourKeyForUi}`}
          pillars={activePillars}
          daewoon={daewoonGz || undefined}
          sewoon={seGz || undefined}
          wolwoon={wolGz || undefined}
          ilwoon={ilGz || undefined}
          tab={blendTab}
        />
      )}

      {/* 일간강약 */}
      {bigTab === "일간 · 오행 강약" && (
        <div className="space-y-4">
          <div className="ml-auto flex justify-end items-center gap-1">
            <button
              type="button"
              aria-pressed={criteriaMode === "classic"}
              onClick={() => setCriteriaMode("classic")}
              className={
                "px-2 py-1 text-xs rounded border cursor-pointer " +
                (criteriaMode === "classic"
                  ? "bg-yellow-500 text-black border-yellow-600"
                  : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700")
              }
            >
              고전
            </button>
            <button
              type="button"
              aria-pressed={criteriaMode === "modern"}
              onClick={() => setCriteriaMode("modern")}
              className={
                "px-2 py-1 text-xs rounded border cursor-pointer " +
                (criteriaMode === "modern"
                  ? "bg-yellow-500 text-black border-yellow-600"
                  : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700")
              }
            >
              현대
            </button>
          </div>

          <PentagonChart
            key={`pentagon-${revKey}`}
            data={chartData}
            revKey={revKey}
            pillars={activePillars}
            daewoonGz={daewoonGz}
            sewoonGz={seGz}
            wolwoonGz={wolGz}
            ilwoonGz={ilGz}
            perStemElement={detailedLuck?.perStemElementScaled}
            dayStem={activePillars[2]?.charAt(0) ?? null}
          />

          <StrengthBar value={strengthPct} />

          <ClimateBars natal={activePillars} />

          <div className="w-full p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">용신 추천</div>
              {hasAbsent && (
                <button
                  type="button"
                  onClick={() => setDemoteAbsent((v) => !v)}
                  className={`text-xs px-2 py-1 rounded-lg border transition cursor-pointer
                    ${
                      demoteAbsent
                        ? "bg-violet-100 text-violet-800 border-violet-200 whitespace-nowrap dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800"
                        : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700"
                    }`}
                  aria-pressed={demoteAbsent}
                >
                  부재후순위: {demoteAbsent ? "ON" : "OFF"}
                </button>
              )}
            </div>

            <ul className="space-y-2">
              {yongshinList.map((it, idx) => (
                <li
                  key={it.elNorm ?? it.element}
                  className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {idx + 1}위
                    </span>
                    <span className="text-sm font-semibold">{it.element}</span>
                  </div>
                  <div className="flex-1">
                    <div className="mt-1 h-1.5 w-full rounded bg-neutral-300 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-1.5 rounded bg-white dark:bg-neutral-100"
                        style={{
                          width: `${
                            maxScore > 0
                              ? Math.max(2, Math.min(100, Math.round(((it.score ?? 0) / maxScore) * 100)))
                              : 12
                          }%`,
                        }}
                        title={`점수 ${it.score}`}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(it.reasons ?? []).map((r, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 신살 */}
      {bigTab === "신살" && (
        <ShinsalTagPanel
          key={`shin-${blendTab}-${hourKeyForUi}`}
          pillars={activePillars}
          daewoon={daewoonGz || undefined}
          sewoon={seGz || undefined}
          wolwoon={wolGz || undefined}
          ilwoon={ilGz || undefined}
          tab={blendTab}
        />
      )}
    </div>
  );
}
