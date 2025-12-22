import { GANJI_BRANCHES, buildHourMap, monthStemOf } from "./ganjiRules";
import type { Branch, HourRule, Pillars, Stem } from "../input/customSajuTypes";

export function isFilledAll(p: Pillars): p is Required<Pillars> {
  return !!(
    p.yearStem &&
    p.yearBranch &&
    p.monthStem &&
    p.monthBranch &&
    p.dayStem &&
    p.dayBranch &&
    p.hourStem &&
    p.hourBranch
  );
}

export function branchesForMonthStem(yearStem: Stem, monthStem: Stem): Branch[] {
  return GANJI_BRANCHES.filter((branch) => monthStemOf(yearStem, branch) === monthStem);
}

export function applyWoldu(
  p: Pillars,
  changed: keyof Pillars | undefined,
  useWoldu: boolean
): { next: Pillars; monthBranchChoices: Branch[] | null } {
  if (!useWoldu || !p.yearStem) return { next: p, monthBranchChoices: null };
  const next = { ...p };

  if (changed === "monthStem" && next.monthStem) {
    const hits = branchesForMonthStem(next.yearStem, next.monthStem);
    if (hits.length >= 2) {
      return { next, monthBranchChoices: hits.slice(0, 2) };
    }
    if (hits.length === 1) next.monthBranch = hits[0];
    return { next, monthBranchChoices: null };
  }

  if (changed === "monthBranch" && next.monthBranch) {
    next.monthStem = monthStemOf(next.yearStem, next.monthBranch);
    return { next, monthBranchChoices: null };
  }

  if (changed === "yearStem") {
    if (next.monthStem && !next.monthBranch) {
      const hits = branchesForMonthStem(next.yearStem, next.monthStem);
      if (hits.length >= 2) {
        return { next, monthBranchChoices: hits.slice(0, 2) };
      }
      if (hits.length === 1) next.monthBranch = hits[0];
    } else if (next.monthBranch && !next.monthStem) {
      next.monthStem = monthStemOf(next.yearStem, next.monthBranch);
    }
  }

  return { next, monthBranchChoices: null };
}

export function applySiju(
  p: Pillars,
  changed: keyof Pillars | undefined,
  useSiju: boolean,
  hourRule: HourRule
): Pillars {
  if (!useSiju || !p.dayStem) return p;
  const next = { ...p };

  const map = buildHourMap(p.dayStem, hourRule);
  const byStem = (s: Stem) =>
    (Object.entries(map) as [Branch, string][]).find(([, gz]) => gz.startsWith(s));
  const byBranch = (b: Branch) => map[b];

  if (changed === "hourStem" && next.hourStem) {
    const hit = byStem(next.hourStem);
    if (hit) next.hourBranch = hit[0];
    return next;
  }

  if (changed === "hourBranch" && next.hourBranch) {
    const gz = byBranch(next.hourBranch);
    if (gz) next.hourStem = gz.slice(0, 1) as Stem;
    return next;
  }

  if (changed === "dayStem") {
    if (next.hourStem && !next.hourBranch) {
      const hit = byStem(next.hourStem);
      if (hit) next.hourBranch = hit[0];
    } else if (next.hourBranch && !next.hourStem) {
      const gz = byBranch(next.hourBranch);
      if (gz) next.hourStem = gz.slice(0, 1) as Stem;
    }
  }

  return next;
}

export function violatesWoldu(p: Pillars, useWoldu: boolean): boolean {
  if (!useWoldu || !p.yearStem) return false;
  if (p.monthBranch && p.monthStem) {
    return monthStemOf(p.yearStem, p.monthBranch) !== p.monthStem;
  }
  return false;
}

export function violatesSiju(
  p: Pillars,
  useSiju: boolean,
  hourRule: HourRule
): boolean {
  if (!useSiju || !p.dayStem) return false;
  if (p.hourBranch && p.hourStem) {
    const map = buildHourMap(p.dayStem, hourRule);
    const gz = map[p.hourBranch];
    if (!gz) return false;
    return gz.slice(0, 1) !== p.hourStem;
  }
  return false;
}

export function hourStemFromBranch(
  dayStem: Stem,
  hourRule: HourRule,
  hourBranch: Branch
): Stem | null {
  const map = buildHourMap(dayStem, hourRule);
  const gz = map[hourBranch];
  return gz ? (gz.slice(0, 1) as Stem) : null;
}
