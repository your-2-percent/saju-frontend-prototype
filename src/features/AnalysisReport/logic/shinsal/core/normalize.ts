// features/AnalysisReport/logic/shinsal/core/normalize.ts
import { hiddenStemMappingHGC, hiddenStemMappingClassic } from "@/shared/domain/hidden-stem/const";
import { STEMS_KO, BRANCHES_KO, STEM_H2K, BRANCH_H2K } from "@/shared/domain/간지/const";
import type { Pillars4 } from "../../relations";

const STEMS_HJ = new Set(Object.keys(STEM_H2K));
const BRANCHES_HJ = new Set(Object.keys(BRANCH_H2K));

const firstRaw = (s: string) => s.slice(0, 1);
const lastRaw = (s: string) => s.slice(-1);

export function normStemChar(ch: string): string {
  if (STEMS_KO.has(ch)) return ch;
  if (STEMS_HJ.has(ch)) return STEM_H2K[ch] ?? ch;
  return ch;
}

export function normBranchChar(ch: string): string {
  if (BRANCHES_KO.has(ch)) return ch;
  if (BRANCHES_HJ.has(ch)) return BRANCH_H2K[ch] ?? ch;
  return ch;
}

export function getStemAt(gz: string): string {
  return normStemChar(firstRaw(gz));
}

export function getBranchAt(gz: string): string {
  return normBranchChar(lastRaw(gz));
}

export function parseGZ(raw?: string | null): { stem: string; branch: string } | null {
  if (!raw) return null;
  const chars = Array.from(String(raw));
  let stem: string | null = null;
  let branch: string | null = null;
  for (const ch of chars) {
    if (!stem && (STEMS_KO.has(ch) || STEMS_HJ.has(ch))) stem = normStemChar(ch);
    if (BRANCHES_KO.has(ch) || BRANCHES_HJ.has(ch)) branch = normBranchChar(ch); // 마지막 지지 유지
  }
  return stem && branch ? { stem, branch } : null;
}

export function natalBranches(natal: Pillars4): string[] {
  return natal.map(getBranchAt);
}

export function hasStemOrHidden(
  target: string,
  ganZhi: string,
  mapping: "classic" | "hgc" = "classic"
): boolean {
  const stem = getStemAt(ganZhi);
  const branch = getBranchAt(ganZhi);
  const stems =
    (mapping === "hgc" ? hiddenStemMappingHGC : hiddenStemMappingClassic)[branch] ?? [];
  return [stem, ...stems].includes(target);
}
