// features/AnalysisReport/logic/relations/coreUtils.ts

import { POS_LABELS, type PosLabel } from "./constants";

export function labelForPair(
  table: Array<{ pair: [string, string]; label: string }>,
  a: string,
  b: string,
): string | null {
  for (const { pair: [x, y], label } of table) {
    if ((a === x && b === y) || (a === y && b === x)) return label;
  }
  return null;
}

export function pushUnique(arr: string[], tag: string) {
  if (!arr.includes(tag)) arr.push(tag);
}

export const posMask = (idxs: number[]) =>
  [...idxs]
    .sort((a, b) => a - b)
    .map((i) => POS_LABELS[i]!)
    .join("X");

export function selectAllPairs(posA: number[], posB: number[]): Array<[number, number]> {
  const raw: Array<[number, number]> = [];
  for (const i of posA) for (const j of posB) {
    if (i === j) continue;
    const a = Math.min(i, j);
    const b = Math.max(i, j);
    raw.push([a, b]);
  }
  return raw.sort((p, q) => {
    const d1 = Math.abs(p[0] - p[1]);
    const d2 = Math.abs(q[0] - q[1]);
    return d1 !== d2 ? d1 - d2 : 0;
  });
}

export function selectAllPairsSame(pos: number[]): Array<[number, number]> {
  const raw: Array<[number, number]> = [];
  const sorted = [...pos].sort((a, b) => a - b);
  for (let x = 0; x < sorted.length; x++) {
    for (let y = x + 1; y < sorted.length; y++) {
      const i = sorted[x]!;
      const j = sorted[y]!;
      raw.push([i, j]);
    }
  }
  return raw;
}

export const posToJuLabel = (pos: PosLabel): "연주" | "월주" | "일주" | "시주" => {
  switch (pos) {
    case "연":
      return "연주";
    case "월":
      return "월주";
    case "일":
      return "일주";
    case "시":
      return "시주";
  }
};
