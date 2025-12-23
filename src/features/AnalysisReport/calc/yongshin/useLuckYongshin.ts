// features/AnalysisReport/calc/yongshin/useLuckYongshin.ts
import { useMemo, useState } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { getYearGanZhi } from "@/shared/domain/간지/공통";
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import { computeUnifiedPower, type LuckChain } from "@/features/AnalysisReport/utils/unifiedPower";
import computeYongshin from "@/features/AnalysisReport/calc/yongshin";

import type { Element } from "@/features/AnalysisReport/utils/types";
import {
  elementPresenceFromPillars,
  lightElementScoreFromPillars,
} from "@/features/AnalysisReport/calc/reportCalc";

import {
  buildMultiYongshin,
  normalizeElementLabel,
  type YongshinItem,
  type YongshinMultiResult,
} from "@/features/AnalysisReport/calc/yongshin/multi";

type DaeItem = { at: Date; gz: string };

function isValidDaeItem(v: unknown): v is DaeItem {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  const at = o.at;
  const gz = o.gz;
  return at instanceof Date && !Number.isNaN(at.getTime()) && typeof gz === "string";
}

function safeGzAtYear(year: number): string {
  // 입춘 경계 흔들림 줄이려고 2/15 정오 고정
  const dt = new Date(year, 1, 15, 12, 0, 0, 0);
  return normalizeGZ(getYearGanZhi(dt) || "");
}

function mkElemPctFallback(
  unifiedElemPct: Record<Element, number> | null | undefined,
  pillars: [string, string, string, string]
): Record<Element, number> {
  if (unifiedElemPct) return unifiedElemPct;
  return lightElementScoreFromPillars(pillars);
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

export type LuckYongshinState = {
  // UI 상태
  daeIndex: number;
  setDaeIndex: (i: number) => void;
  seIndex: number | null;
  setSeIndex: (i: number | null) => void;

  // 데이터
  dae10: DaeItem[];
  se10: Array<{ year: number; gz: string }>;

  // 결과
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
  // 필요하면 나중에 격국용신 주입 가능
  gyeokgukList?: YongshinItem[] | null;
}): LuckYongshinState {
  const { data, pillars, hourKey, demoteAbsent, gyeokgukList } = args;

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

  const safeSeIndex =
    seIndex == null ? null : Math.max(0, Math.min(se10.length - 1, seIndex));
  const se = safeSeIndex == null ? null : (se10[safeSeIndex] ?? null);

  const presentMap = useMemo(
    () => elementPresenceFromPillars(pillars, { includeBranches: true }),
    [pillars]
  );
  const hasAbsent = useMemo(
    () => (["목", "화", "토", "금", "수"] as Element[]).some((el) => !presentMap[el]),
    [presentMap]
  );

  const chain = useMemo<LuckChain>(() => {
    const daeGz = dae ? normalizeGZ(dae.gz) : null;
    const seGz = se ? normalizeGZ(se.gz) : null;

    // “대운만”을 원하면 seIndex를 null로 만들면 됨
    return {
      dae: daeGz || null,
      se: seGz || null,
      wol: null,
      il: null,
    };
  }, [dae, se]);

  const tab: "대운" | "세운" = useMemo(() => {
    return chain.se ? "세운" : "대운";
  }, [chain.se]);

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
    });

    const elemPctFallback = mkElemPctFallback(unified?.elementPercent100, pillars);

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
  }, [dae, pillars, tab, chain, hourKey, presentMap, demoteAbsent, gyeokgukList]);

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
