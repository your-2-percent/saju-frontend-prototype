// features/AnalysisReport/calc/yongshin/useLuckYongshin.ts
import { useMemo, useState } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { getYearGanZhi } from "@/shared/domain/ganji/common";
import { normalizeGZ } from "@/analysisReport/calc/logic/relations";
import { computeUnifiedPower, type LuckChain } from "@/analysisReport/calc/utils/unifiedPower";
import computeYongshin from "@/analysisReport/calc/yongshin";
import {
  coerceHiddenStemMode,
  getBranchDistMap,
  isBranchKey,
} from "@/analysisReport/calc/logic/gyeokguk/rules";
import type { Element } from "@/analysisReport/calc/utils/types";
import { HiddenStemMode } from "@/saju/input/useSajuSettingsStore";
import type { KoBranch } from "@/analysisReport/calc/logic/relations/groups"

import {
  buildMultiYongshin,
  normalizeElementLabel,
  type YongshinItem,
  type YongshinMultiResult,
} from "@/analysisReport/calc/yongshin/multi";

type DaeItem = { at: Date; gz: string };

function isValidDaeItem(v: unknown): v is DaeItem {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const at = o.at;
  const gz = o.gz;
  return at instanceof Date && !Number.isNaN(at.getTime()) && typeof gz === "string";
}

function safeGzAtYear(year: number): string {
  const dt = new Date(year, 1, 15, 12, 0, 0, 0);
  return normalizeGZ(getYearGanZhi(dt) || "");
}

type YongshinRaw = { ordered: Array<{ element: string; score?: number; reasons?: string[] }> } | null;

function buildEokbuListFromRaw(
  raw: YongshinRaw,
  elemPctFallback: Record<Element, number>
): YongshinItem[] {
  const arr = raw?.ordered ?? [];
  return arr.map((rec) => {
    const element = rec.element ?? "";
    const elNorm = normalizeElementLabel(element);
    const score =
      typeof rec.score === "number"
        ? rec.score
        : elNorm
          ? (elemPctFallback[elNorm] ?? 0)
          : 0;

    return {
      element,
      elNorm,
      score,
      reasons: Array.isArray(rec.reasons) ? rec.reasons : [],
    };
  });
}

// --- hidden stem 기반 presence/score (훅 내부 fallback용) ---

const STEM_EL: Record<string, Element> = {
  갑: "목", 을: "목",
  병: "화", 정: "화",
  무: "토", 기: "토",
  경: "금", 신: "금",
  임: "수", 계: "수",
};

function stemToEl(s: string): Element | null {
  return STEM_EL[s] ?? null;
}

function calcPresentMapByHiddenStems(
  pillars: [string, string, string, string],
  mode: HiddenStemMode
): Record<Element, boolean> {
  const map: Record<Element, boolean> = { 목: false, 화: false, 토: false, 금: false, 수: false };
  const distMap = getBranchDistMap(mode);

  for (const gz of pillars) {
    const stem = gz?.charAt(0) ?? "";
    const branch = gz?.charAt(1) ?? "";

    const se = stemToEl(stem);
    if (se) map[se] = true;

    if (isBranchKey(branch)) {
      const dist = distMap[branch as KoBranch];
      const nodes = [dist.초기, dist.중기, dist.정기].filter(Boolean) as Array<{ stem: string; w: number }>;
      for (const n of nodes) {
        const el = stemToEl(n.stem);
        if (el && n.w > 0) map[el] = true;
      }
    }
  }

  return map;
}

function lightElemPctFallbackByHiddenStems(
  pillars: [string, string, string, string],
  mode: HiddenStemMode
): Record<Element, number> {
  const distMap = getBranchDistMap(mode);
  const totals: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  // ✅ pillar당: stem 50 + branch(hidden dist) 50
  for (const gz of pillars) {
    const stem = gz?.charAt(0) ?? "";
    const branch = gz?.charAt(1) ?? "";

    const se = stemToEl(stem);
    if (se) totals[se] += 50;

    if (isBranchKey(branch)) {
      const dist = distMap[branch as KoBranch];
      const nodes = [dist.초기, dist.중기, dist.정기].filter(Boolean) as Array<{ stem: string; w: number }>;
      const sum = nodes.reduce((a, n) => a + (Number.isFinite(n.w) ? n.w : 0), 0);
      const denom = sum > 0 ? sum : 1;

      for (const n of nodes) {
        const el = stemToEl(n.stem);
        if (!el) continue;
        totals[el] += (50 * n.w) / denom;
      }
    }
  }

  const sumAll = totals.목 + totals.화 + totals.토 + totals.금 + totals.수;
  const denomAll = sumAll > 0 ? sumAll : 1;

  return {
    목: (totals.목 / denomAll) * 100,
    화: (totals.화 / denomAll) * 100,
    토: (totals.토 / denomAll) * 100,
    금: (totals.금 / denomAll) * 100,
    수: (totals.수 / denomAll) * 100,
  };
}

function mkElemPctFallback(
  unifiedElemPct: Record<Element, number> | null | undefined,
  pillars: [string, string, string, string],
  mode: HiddenStemMode
): Record<Element, number> {
  if (unifiedElemPct) return unifiedElemPct;
  return lightElemPctFallbackByHiddenStems(pillars, mode);
}

export type LuckYongshinState = {
  daeIndex: number;
  setDaeIndex: (i: number) => void;
  seIndex: number | null;
  setSeIndex: (i: number | null) => void;

  dae10: DaeItem[];
  se10: Array<{ year: number; gz: string }>;

  chain: LuckChain;
  tab: "대운" | "세운";
  label: string;
  recommend: YongshinMultiResult | null;

  presentMap: Record<Element, boolean>;
  hasAbsent: boolean;
};

export function useLuckYongshin(args: {
  data: MyeongSik;
  pillars: [string, string, string, string];
  hourKey: string;
  demoteAbsent: boolean;
  hiddenStemMode?: string; // ✅ 추가
  gyeokgukList?: YongshinItem[] | null;
}): LuckYongshinState {
  const { data, pillars, hourKey, demoteAbsent, gyeokgukList, hiddenStemMode } = args;

  const mode = useMemo(() => coerceHiddenStemMode(hiddenStemMode), [hiddenStemMode]);

  const daeRaw = useDaewoonList(data, data?.mingSikType);
  const dae10 = useMemo(() => {
    if (!Array.isArray(daeRaw)) return [] as DaeItem[];
    return daeRaw.filter(isValidDaeItem).slice(0, 10);
  }, [daeRaw]);

  const [daeIndex, setDaeIndex] = useState(0);
  const [seIndex, setSeIndex] = useState<number | null>(0);

  const safeDaeIndex = Math.max(0, Math.min(dae10.length - 1, daeIndex));
  const dae = dae10[safeDaeIndex] ?? null;

  const se10 = useMemo(() => {
    if (!dae) return [] as Array<{ year: number; gz: string }>;
    const startYear = dae.at.getFullYear();
    return Array.from({ length: 10 }, (_, k) => {
      const year = startYear + k;
      return { year, gz: safeGzAtYear(year) };
    });
  }, [dae]);

  const safeSeIndex = seIndex == null ? null : Math.max(0, Math.min(se10.length - 1, seIndex));
  const se = safeSeIndex == null ? null : (se10[safeSeIndex] ?? null);

  const presentMap = useMemo(
    () => calcPresentMapByHiddenStems(pillars, mode),
    [pillars, mode]
  );

  const hasAbsent = useMemo(
    () => (["목", "화", "토", "금", "수"] as Element[]).some((el) => !presentMap[el]),
    [presentMap]
  );

  const chain = useMemo<LuckChain>(() => {
    const daeGz = dae ? normalizeGZ(dae.gz) : null;
    const seGz = se ? normalizeGZ(se.gz) : null;
    return { dae: daeGz || null, se: seGz || null, wol: null, il: null };
  }, [dae, se]);

  const tab: "대운" | "세운" = useMemo(() => (chain.se ? "세운" : "대운"), [chain.se]);

  const label = useMemo(() => {
    const daeLabel = dae ? `${dae.at.getFullYear()}~ ${normalizeGZ(dae.gz)}` : "대운 -";
    const seLabel = se ? ` / ${se.year} ${normalizeGZ(se.gz)}` : "";
    return `${daeLabel}${seLabel}`;
  }, [dae, se]);

  const recommend = useMemo<YongshinMultiResult | null>(() => {
    if (!dae) return null;

    const unified = computeUnifiedPower({
      natal: pillars,
      tab,
      chain,
      hourKey,
      // ✅ 여기까지는 훅에서 건드릴 수 없음.
      // computeUnifiedPower 내부가 classic 고정이면 최종 점수까지 완전 반영은 추가 패치 필요.
    });

    const elemPctFallback = mkElemPctFallback(unified?.elementPercent100, pillars, mode);

    const raw: YongshinRaw =
      typeof computeYongshin === "function"
        ? (computeYongshin(pillars, unified?.totals) as YongshinRaw)
        : null;

    const eokbuList = buildEokbuListFromRaw(raw, elemPctFallback);

    return buildMultiYongshin({
      eokbuList,
      monthGz: pillars[1] || "",
      elemPct: elemPctFallback,
      presentMap,
      demoteAbsent,
      gyeokgukList: Array.isArray(gyeokgukList) ? gyeokgukList : null,
    });
  }, [dae, pillars, tab, chain, hourKey, presentMap, demoteAbsent, gyeokgukList, mode]);

  return {
    daeIndex: safeDaeIndex,
    setDaeIndex,
    seIndex: safeSeIndex,
    setSeIndex,

    dae10,
    se10,

    chain,
    tab,
    label,
    recommend,

    presentMap,
    hasAbsent,
  };
}
