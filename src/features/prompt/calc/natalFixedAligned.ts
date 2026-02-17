import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import type { Element } from "@/analysisReport/calc/utils/types";
import { adjustElementPercentByBranchBoost } from "@/analysisReport/calc/yongshin/multi";
import {
  STEM_TO_ELEMENT,
  mapStemToTenGodSub,
  normalizeTo100,
  toBareStemMap,
  type TenGodSubtype,
} from "@/features/prompt/promptCore";

const ELEMENTS: readonly Element[] = ["목", "화", "토", "금", "수"] as const;
const STEM_ORDER = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"] as const;
const STEM_PAIRS: Record<Element, readonly [string, string]> = {
  목: ["갑", "을"],
  화: ["병", "정"],
  토: ["무", "기"],
  금: ["경", "신"],
  수: ["임", "계"],
};
const TEN_GOD_SUBS: readonly TenGodSubtype[] = [
  "비견",
  "겁재",
  "식신",
  "상관",
  "정재",
  "편재",
  "정관",
  "편관",
  "정인",
  "편인",
] as const;

function rebalancePairToTarget(
  aVal: number,
  bVal: number,
  target: number
): [number, number] {
  const targetInt = Math.max(0, Math.round(target));
  const av = Math.max(0, Number(aVal ?? 0));
  const bv = Math.max(0, Number(bVal ?? 0));
  const sum = av + bv;

  if (targetInt <= 0) return [0, 0];
  if (sum <= 0) return [targetInt, 0];

  const ra = (av / sum) * targetInt;
  const rb = (bv / sum) * targetInt;
  let na = Math.floor(ra);
  let nb = Math.floor(rb);
  let rem = targetInt - (na + nb);

  if (rem > 0) {
    if (ra - na >= rb - nb) na += 1;
    else nb += 1;
    rem -= 1;
  }
  if (rem > 0) na += rem;

  return [na, nb];
}

export function computeAlignedNatalFixed(args: {
  natal: Pillars4;
  dayStem: string;
  perStemSource?: Record<string, number> | null;
}): {
  elementPercent100: Record<Element, number>;
  perStemBare100: Record<string, number>;
  totalsSub100: Record<TenGodSubtype, number>;
} {
  const { natal, dayStem, perStemSource } = args;
  const baseBare = toBareStemMap(perStemSource ?? {});

  const baseElemRaw: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const [stem, raw] of Object.entries(baseBare)) {
    const el = STEM_TO_ELEMENT[stem as keyof typeof STEM_TO_ELEMENT];
    if (!el) continue;
    baseElemRaw[el] += Math.max(0, Number(raw ?? 0));
  }

  const baseElemPct = normalizeTo100(baseElemRaw) as Record<Element, number>;
  const adjustedRaw = adjustElementPercentByBranchBoost(baseElemPct, natal[1] ?? "", natal);
  const elementPercent100 = normalizeTo100(adjustedRaw) as Record<Element, number>;

  const perStemBare100: Record<string, number> = {};
  for (const el of ELEMENTS) {
    const [s1, s2] = STEM_PAIRS[el];
    const [n1, n2] = rebalancePairToTarget(baseBare[s1] ?? 0, baseBare[s2] ?? 0, elementPercent100[el] ?? 0);
    perStemBare100[s1] = n1;
    perStemBare100[s2] = n2;
  }

  const totalsSub100 = Object.fromEntries(TEN_GOD_SUBS.map((k) => [k, 0])) as Record<TenGodSubtype, number>;
  for (const stem of STEM_ORDER) {
    const v = Math.max(0, Number(perStemBare100[stem] ?? 0));
    const sub = mapStemToTenGodSub(dayStem, stem);
    totalsSub100[sub] += v;
  }

  return { elementPercent100, perStemBare100, totalsSub100 };
}
