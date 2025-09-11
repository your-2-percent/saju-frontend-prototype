// features/AnalysisReport/AnalysisReport.tsx
import { useMemo, useState } from "react";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { computePowerDataDetailed } from "./utils/computePowerData";
import PentagonChart from "./PentagonChart";
import StrengthBar from "./StrengthBar";
import HarmonyTagPanel from "./HarmonyTagPanel";
import { getTenGodColors } from "./utils/colors";
import type { PowerData, Element, TenGod } from "./utils/types";
import * as YongshinMod from "./utils/yongshin";
import { normalizeGZ } from "./logic/relations";
import type { CriteriaMode } from "./utils/strength";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import type { MyeongSik } from "@/shared/lib/storage";
import { blendElementStrength, type BlendTab, BLEND_TABS } from "./logic/blend";
import { mapElementsToTenGods } from "./utils/tenGod";
import ShinsalTagPanel from "./ShinsalTagPanel";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";

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
  if (mHa) return `${STEM_H2K[mHa[1] as keyof typeof STEM_H2K]}${BRANCH_H2K[mHa[2] as keyof typeof BRANCH_H2K]}`;
  return "";
}
function normalizePillars(input?: string[] | null): string[] {
  const arr = Array.isArray(input) ? input.slice(0, 4) : [];
  while (arr.length < 4) arr.push("");
  return arr.map(normalizeGZLocal);
}
function isValidPillars(p: string[]): p is [string, string, string, string] {
  return p.length === 4 && p.every((x) => x.length === 2);
}
type Basis = "solar" | "lunar";

interface YongshinItem {
  element: string;
  elNorm: Element | null;
  score: number;
  reasons: string[];
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
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function pickYongshinFn(mod: unknown) {
  if (!isRecord(mod)) return null;
  if (typeof (mod)["computeYongshin"] === "function")
    return (mod)["computeYongshin"] as (
      p: [string, string, string, string],
      tenGodTotals?: PowerData[],
      opts?: {
        elementScore?: Record<Element, number>;
        prefer?: "elements" | "ten";
        demoteIfAbsent?: boolean;
        demoteFactor?: number;
      }
    ) => unknown;
  if (isRecord((mod).default) && typeof (mod).default.computeYongshin === "function") {
    return ((mod).default.computeYongshin) as (
      p: [string, string, string, string],
      tenGodTotals?: PowerData[],
      opts?: {
        elementScore?: Record<Element, number>;
        prefer?: "elements" | "ten";
        demoteIfAbsent?: boolean;
        demoteFactor?: number;
      }
    ) => unknown;
  }
  return null;
}
function toNum(v: unknown, d = 0): number {
  if (v == null) return d;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : d;
  }
  if (typeof v === "object") {
    const any = v as Record<string, unknown>;
    for (const k of ["value", "val", "score", "amount"]) {
      if (k in any) return toNum(any[k], d);
    }
  }
  return d;
}

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
  const DEBUG = true;

  const [basis] = useState<Basis>("solar");
  const [demoteAbsent, setDemoteAbsent] = useState(true);
  const [criteriaMode, setCriteriaMode] = useState<CriteriaMode>("modern");

  // 섹션 탭
  const [bigTab, setBigTab] = useState<"일간 · 오행 강약" | "형충회합" | "신살">("일간 · 오행 강약");
  // 운 탭(원국/대운/세운/월운)
  const [blendTab, setBlendTab] = useState<BlendTab>("원국");

  // 전역 피커
  const { date, yearGZ, monthGZ } = useLuckPickerStore();
  const seGz = useMemo(() => normalizeGZ(yearGZ), [yearGZ]);     // 세운
  const wolGz = useMemo(() => normalizeGZ(monthGZ), [monthGZ]);  // 월운

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

  // 원국/음력 처리
  const solarKo = useMemo(() => normalizePillars(pillars), [pillars]);
  const lunarKo = useMemo(() => normalizePillars(lunarPillars), [lunarPillars]);
  const solarValid = isValidPillars(solarKo);
  const lunarValid = isValidPillars(lunarKo);
  const effectiveBasis: Basis =
    basis === "lunar" ? (lunarValid ? "lunar" : "solar") : (solarValid ? "solar" : "lunar");
  const activePillars = (effectiveBasis === "lunar" ? lunarKo : solarKo) as [string, string, string, string];

  // 설정
  const mode = settings.hiddenStemMode === "classic" ? "classic" : "hgc";
  const hidden = settings.hiddenStem === "regular" ? "regular" : "all";

  // 탭별 운 입력(필터링)
  const luckInput = useMemo(
    () => ({
      tab: blendTab as "원국" | "대운" | "세운" | "월운",
      dae: blendTab !== "원국" ? daewoonGz || undefined : undefined,
      se: blendTab === "세운" || blendTab === "월운" ? seGz || undefined : undefined,
      wol: blendTab === "월운" ? wolGz || undefined : undefined,
    }),
    [blendTab, daewoonGz, seGz, wolGz]
  );

  // 원국만(운X): 신약/신강/용신/부재
  const detailedNatal = useMemo(() => {
    if (!solarValid && !lunarValid) return null;
    return computePowerDataDetailed({
      pillars: activePillars,
      dayStem: activePillars?.[2]?.charAt(0),
      mode,
      hidden,
      debug: DEBUG,
      useHarmonyOverlay: false,
      criteriaMode,
    });
  }, [criteriaMode, activePillars, mode, hidden, DEBUG, solarValid, lunarValid]);

  // 탭 반영(운O): 펜타곤/perTenGod
  const detailedLuck = useMemo(() => {
    if (!solarValid && !lunarValid) return null;
    return computePowerDataDetailed({
      pillars: activePillars,
      dayStem: activePillars?.[2]?.charAt(0),
      mode,
      hidden,
      debug: DEBUG,
      useHarmonyOverlay: false,
      criteriaMode,
      luck: luckInput,
    });
  }, [criteriaMode, activePillars, mode, hidden, DEBUG, solarValid, lunarValid, luckInput]);

  // ── 원국 전용 값들 ──
  const totalsNatal = useMemo(() => detailedNatal?.totals ?? EMPTY_TOTALS, [detailedNatal]);
  const elementScoreNatal = detailedNatal?.elementScoreRaw ?? lightElementScoreFromPillars(activePillars);

  const colorsMapNatal = getTenGodColors(activePillars[2]?.charAt(0));
  const natalDataForChart = totalsNatal.map((d) => ({ ...d, color: colorsMapNatal[d.name as TenGod] }));

  const totalsMapNatal: Record<TenGod, number> = useMemo(() => {
    const m: Record<TenGod, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
    for (const t of totalsNatal) m[t.name as TenGod] = t.value;
    return m;
  }, [totalsNatal]);

  const multNatal: Record<TenGod, number> = useMemo(() => {
    const flags = detailedNatal?.deukFlags;
    if (!flags) return { 비겁: 1, 식상: 1, 재성: 1, 관성: 1, 인성: 1 };
    const W_L = 0.08, W_G = 0.05, W_S = 0.07;
    const out: Record<TenGod, number> = { 비겁: 1, 식상: 1, 재성: 1, 관성: 1, 인성: 1 };
    (Object.keys(flags) as TenGod[]).forEach((k) => {
      const f = (flags)[k];
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

  // ── 운 반영 혼합 점수 (펜타곤) ──
  const mixed = useMemo(
    () =>
      blendElementStrength({
        natalElementScore: elementScoreNatal,
        daewoonGz: blendTab !== "원국" ? daewoonGz ?? undefined : undefined,
        sewoonGz: blendTab === "세운" || blendTab === "월운" ? seGz ?? undefined : undefined,
        wolwoonGz: blendTab === "월운" ? wolGz ?? undefined : undefined,
        tab: blendTab,
      }),
    [elementScoreNatal, daewoonGz, seGz, wolGz, blendTab]
  );

  // ── PentagonChart 데이터 ──
  const chartData = useMemo(() => {
    const colors = getTenGodColors(activePillars[2]?.charAt(0));
    return (["비겁", "식상", "재성", "관성", "인성"] as TenGod[]).map((god) => {
      const value = (["목", "화", "토", "금", "수"] as Element[])
        .map((el) => (mapElementsToTenGods(el, activePillars[2][0]) === god ? mixed[el] : 0))
        .reduce((a, b) => a + b, 0);
      return { name: god, value, color: colors[god] };
    });
  }, [mixed, activePillars]);

  // perTenGod: detailedLuck 기준으로 재스케일
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
      const sum = toNum(p?.aVal, 0) + toNum(p?.bVal, 0);
      const round1 = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10;
      if (sum > 0) {
        const aRaw = (target * toNum(p.aVal, 0)) / sum;
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

  // 그래프 리마운트 키
  const luckKey = useMemo(
    () =>
      [
        blendTab,
        daewoonGz ?? "",
        seGz ?? "",
        wolGz ?? "",
        date?.toISOString?.() ?? "",
      ].join("|"),
    [blendTab, daewoonGz, seGz, wolGz, date]
  );
  const revKey = useMemo(() => {
    const subsSig = perTenGodForChart
      ? (["비겁", "식상", "재성", "관성", "인성"] as const)
          .map((k) => {
            const s = perTenGodForChart[k];
            const a = s?.aVal ?? s?.비견 ?? s?.정재 ?? 0;
            const b = s?.bVal ?? s?.겁재 ?? s?.편재 ?? 0;
            return `${k}:${Number(a)}|${Number(b)}`;
          })
          .join(",")
      : "none";
    const dataSig = chartData.map((d) => `${d.name}:${d.value}`).join(",");
    return `${luckKey}||${activePillars.join("")}||${dataSig}||${subsSig}`;
  }, [luckKey, activePillars, chartData, perTenGodForChart]);

  // 용신(원국 기준)
  const ysFn = pickYongshinFn(YongshinMod);
  const yongshin = ysFn ? ysFn(activePillars, natalDataForChart, { elementScore: elementScoreNatal }) : null;

  const yongshinList = useMemo(() => {
    const raw =
      isRecord(yongshin) && Array.isArray((yongshin).ordered)
        ? (((yongshin).ordered as Array<Record<string, unknown>>))
        : [];
    const list: YongshinItem[] = raw.map((rec) => {
      const elementU = rec["element"];
      const scoreU = rec["score"];
      const reasonsU = rec["reasons"];
      const element = typeof elementU === "string" ? elementU : "";
      const elNorm = (() => {
        if (/목|木|wood/i.test(element)) return "목";
        if (/화|火|fire/i.test(element)) return "화";
        if (/토|土|earth/i.test(element)) return "토";
        if (/금|金|metal/i.test(element)) return "금";
        if (/수|水|water/i.test(element)) return "수";
        return null;
      })();
      const score =
        typeof scoreU === "number"
          ? scoreU
          : elNorm
          ? elemForFallback[elNorm] ?? 0
          : 0;
      const reasons = Array.isArray(reasonsU) ? (reasonsU as string[]) : [];
      return { element, elNorm, score, reasons };
    });

    // 부재 후순위(0점)
    const demoted = demoteAbsent
      ? list.map((it) =>
          it.elNorm && !presentMap[it.elNorm]
            ? {
                ...it,
                score: 0,
                reasons: [...it.reasons, "부재후순위: 원국(천간) 부재 → 0점"],
              }
            : it
        )
      : list;

    demoted.sort((a, b) => {
      if (demoteAbsent) {
        const ap = a.elNorm && presentMap[a.elNorm] ? 1 : 0;
        const bp = b.elNorm && presentMap[b.elNorm] ? 1 : 0;
        if (ap !== bp) return bp - ap;
      }
      if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
      return (a.elNorm ?? a.element).localeCompare(b.elNorm ?? b.element);
    });

    return demoted;
  }, [yongshin, presentMap, demoteAbsent, elemForFallback]);

  const maxScore = useMemo(
    () => Math.max(0, ...yongshinList.map((it) => (Number.isFinite(it.score) ? (it.score as number) : 0))),
    [yongshinList]
  );

  // 유효성 체크
  if (!solarValid && !lunarValid) {
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
          pillars={activePillars}
          daewoon={daewoonGz || undefined}
          sewoon={seGz || undefined}
          wolwoon={wolGz || undefined}
          //tab={blendTab}
        />
      )}

      {/* 일간강약(원국 기준) */}
      {bigTab === "일간 · 오행 강약" && (
        <div className="space-y-4">
          <div className="ml-auto flex items-center gap-1">
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

          <StrengthBar value={strengthPct} />

          <PentagonChart
            data={chartData}
            perTenGod={perTenGodForChart}
            revKey={revKey}
            pillars={activePillars}
            daewoonGz={daewoonGz}
            sewoonGz={seGz}
            wolwoonGz={wolGz}
          />

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

      {/* 신살(전역 피커 운 반영) */}
      {bigTab === "신살" && (
        <ShinsalTagPanel
          pillars={activePillars}
          daewoon={daewoonGz || undefined}
          sewoon={seGz || undefined}
          wolwoon={wolGz || undefined}
        />
      )}
    </div>
  );
}
