// utils/powerPercentSync.ts
import type { Element, PowerData, TenGod } from "./types";
import { mapElementsToTenGods } from "./tenGod";
import { getTenGodColors } from "./colors";

const TEN_ORDER: TenGod[] = ["비겁","식상","재성","관성","인성"];

function normalizeTo100(values: number[]): number[] {
  const sum = values.reduce((a,b)=>a+b,0);
  if (sum <= 0) return values.map(()=>0);
  const pct = values.map(v => (v*100)/sum);
  const rounded = pct.map(v => Math.round(v));
  let used = rounded.reduce((a,b)=>a+b,0);
  let i = 0;
  while (used < 100) {
    rounded[i % rounded.length]++;
    used++;
    i++;
  }
  return rounded;
}

export function buildPromptStyleTotals(
  elementScoreRaw: Record<Element, number>,
  dayStem: string
): PowerData[] {
  const acc: Record<TenGod, number> = { 비겁:0, 식상:0, 재성:0, 관성:0, 인성:0 };
  (Object.entries(elementScoreRaw) as [Element, number][]).forEach(([el,v])=>{
    acc[mapElementsToTenGods(el, dayStem)] += v;
  });
  const norm = normalizeTo100(TEN_ORDER.map(k => acc[k]));
  const colors = getTenGodColors(dayStem);
  return TEN_ORDER.map((name,i)=>({
    name,
    value: norm[i]!,
    color: colors[name],
  }));
}
