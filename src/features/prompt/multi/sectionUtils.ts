// features/prompt/multi/sectionUtils.ts
import type { Element } from "@/analysisReport/calc/utils/types";
import { elementToTenGod } from "../promptCore";
import { isPlainObject, pruneEmptyDeep, sectionPlain } from "../sectionFormat";

export { isPlainObject, pruneEmptyDeep, sectionPlain };

export type ShinsalScope = "대운" | "세운" | "월운" | "일운";
export type ShinsalGoodBad = {
  good?: Record<string, string[]>;
  bad?: Record<string, string[]>;
};

type ShinsalResultLike = {
  good?: Record<string, string[]>;
  bad?: Record<string, string[]>;
};

export const filterShinsalByScope = (
  raw: ShinsalResultLike | null | undefined,
  scope: ShinsalScope,
): ShinsalGoodBad => {
  if (!raw) return {};

  const targetWord = scope;

  const filterGroup = (group: Record<string, string[]> | undefined) => {
    if (!group) return undefined;
    const filtered: Record<string, string[]> = {};

    for (const [key, arr] of Object.entries(group)) {
      if (!Array.isArray(arr)) continue;
      const next = arr.filter((tag) => typeof tag === "string" && tag.includes(targetWord));
      if (next.length > 0) filtered[key] = next;
    }

    return Object.keys(filtered).length > 0 ? filtered : undefined;
  };

  const good = filterGroup(raw.good);
  const bad = filterGroup(raw.bad);

  const result: ShinsalGoodBad = {};
  if (good) result.good = good;
  if (bad) result.bad = bad;
  return result;
};

export const filterHarmonyTagsByScope = (
  rel: unknown,
  scope: ShinsalScope,
): Record<string, string[]> => {
  const result: Record<string, string[]> = {};
  if (!rel || typeof rel !== "object") return result;

  for (const [key, value] of Object.entries(rel)) {
    if (!Array.isArray(value)) continue;
    const filtered = Array.from(
      new Set(value.filter((tag) => typeof tag === "string" && tag.includes(scope))),
    );
    if (filtered.length > 0) result[key] = filtered;
  }

  return result;
};

export function elementPercentWithTenGodLabels(
  elementPercent: Record<string, number>,
  dayEl: Element,
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(elementPercent).map(([el, val]) => [
      `${el}(${elementToTenGod(dayEl, el as Element)})`,
      val,
    ]),
  );
}
