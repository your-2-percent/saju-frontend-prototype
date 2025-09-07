// features/AnalysisReport/logic/power.ts
import type { PowerData, TenGod, Element } from "../utils/types";
import { computePowerDataDetailed as coreCompute } from "../utils/computePowerData";
import { computeDeukFlags, type CriteriaMode } from "../utils/strength";
import { normalizeGZ } from "./relations";

/** 반환 타입 정리 */
export type PerTenGodSubtype = Record<TenGod, { a: string; b: string; aVal: number; bVal: number }>;
export type PowerDetailed = {
  totals: PowerData[];
  perTenGod: PerTenGodSubtype;
  elementScoreRaw: Record<Element, number>;
  deukFlags: ReturnType<typeof computeDeukFlags>["flags"];
};

/**
 * 기존 computePowerDataDetailed를 감싸서
 * - pillars를 한글 간지로 정규화
 * - 득령/득지/득세 플래그를 criteriaMode에 맞춰 재계산해서 보장
 */
export function computePowerDataDetailed(
  pillars: string[],
  mode: "hgc" | "classic" = "hgc",
  hiddenStemSetting: "all" | "regular" = "all",
  debug = false,
  useHarmonyOverlay = false,
  criteriaMode: CriteriaMode = "modern"
): PowerDetailed {
  const base = coreCompute({
    pillars,
    mode,
    hidden: hiddenStemSetting,
    debug,
    useHarmonyOverlay,
  });

  const ko: [string,string,string,string] = (pillars ?? [])
    .slice(0, 4)
    .map(normalizeGZ) as [string,string,string,string];

  const elScore = base.elementScoreRaw ?? { 목:0, 화:0, 토:0, 금:0, 수:0 };
  const { flags } = computeDeukFlags(ko, elScore, criteriaMode);

  return {
    totals: base.totals,
    perTenGod: base.perTenGod as PerTenGodSubtype,
    elementScoreRaw: elScore,
    deukFlags: flags,
  };
}
