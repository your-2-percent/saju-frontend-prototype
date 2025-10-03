// features/AnalysisReport/logic/shinStrength.ts
export type ShinCategory =
  | "극약"
  | "태약"
  | "신약"
  | "중화신약"
  | "중화"
  | "중화신강"
  | "태강"
  | "극태강";

const BANDS: Array<{ name: ShinCategory; min: number; max: number }> = [
  { name: "극약",     min: 0,  max: 10 },
  { name: "태약",     min: 10, max: 20 },
  { name: "신약",     min: 20, max: 35 },
  { name: "중화신약", min: 35, max: 45 },
  { name: "중화",     min: 45, max: 55 },
  { name: "중화신강", min: 55, max: 65 },
  { name: "태강",     min: 65, max: 80 },
  { name: "극태강",   min: 80, max: 100.0001 },
];

export function clamp01(v: number) {
  return Math.max(0, Math.min(100, v));
}

export function getShinCategory(pct: number): ShinCategory {
  const x = clamp01(pct);
  const found = BANDS.find(b => x >= b.min && x < b.max);
  return (found?.name ?? "중화") as ShinCategory;
}
