// features/AnalysisReport/logic/shinsal/core/find.ts
import type { Pillars4 } from "../../relations";
import type { PosIndex } from "../types";
import { idx, POS_WEIGHT } from "./pos";
import { getBranchAt, getStemAt, normBranchChar, normStemChar } from "./normalize";

export function findBestPosForBranch(
  branch: string,
  natal: Pillars4
): { pos: PosIndex; weight: number } | null {
  const want = normBranchChar(branch);
  const positions: PosIndex[] = [idx.day, idx.month, idx.hour, idx.year];
  for (const p of positions) {
    if (getBranchAt(natal[p]) === want) return { pos: p, weight: POS_WEIGHT[p] ?? 0 };
  }
  return null;
}

export function findExactPosForBranch(
  branch: string,
  natal: Pillars4,
  pos: PosIndex
): { pos: PosIndex; weight: number } | null {
  return getBranchAt(natal[pos]) === normBranchChar(branch) ? { pos, weight: POS_WEIGHT[pos] } : null;
}

export function findBestPosForStem(
  stem: string,
  natal: Pillars4
): { pos: PosIndex; weight: number } | null {
  const want = normStemChar(stem);
  const positions: PosIndex[] = [idx.day, idx.month, idx.hour, idx.year];
  for (const p of positions) {
    if (getStemAt(natal[p]) === want) return { pos: p, weight: POS_WEIGHT[p] ?? 0 };
  }
  return null;
}
