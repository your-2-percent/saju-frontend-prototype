import type { Element, TenGod, PowerData } from "../../utils/types";
import { BRANCH_MAIN_ELEMENT, STEM_TO_ELEMENT } from "../../core/common";
import { SHENG_NEXT, SHENG_PREV, KE, KE_REV } from "../powerDataPrimitives";
import { BANDS, ELEMENTS, STRONG_STEPS, TARGET_PCT, ZERO_ELEMENT_SCORE } from "./tables";
import type { BasisBand, ElementPct, ElementScore } from "./types";

export function clamp01(v: number) { return Math.max(0, Math.min(100, v)); }
export function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

export function getBand(pct: number): BasisBand {
  const x = clamp01(pct);
  return (BANDS.find((b) => x >= b.min && x < b.max)?.name ?? "중화") as BasisBand;
}

export function dayElement(pillars: string[]): Element | null {
  const dayStem = pillars?.[2]?.charAt(0) ?? "";
  return STEM_TO_ELEMENT[dayStem as keyof typeof STEM_TO_ELEMENT] ?? null;
}

export function monthBranch(pillars: string[]): string | null {
  const mb = pillars?.[1]?.charAt(1) ?? "";
  return mb || null;
}

export function officerElement(target: Element): Element {
  return KE_REV[target];
}

export function primaryOfDay(dEl: Element | null) {
  if (!dEl) return null;
  return {
    peer: dEl,
    resource: SHENG_PREV[dEl],
    leak: SHENG_NEXT[dEl],
    wealth: KE[dEl],
    officer: officerElement(dEl),
  };
}

export function lightElementScore(pillars: string[]): ElementScore {
  const acc: ElementScore = { ...ZERO_ELEMENT_SCORE };
  for (const gz of pillars) {
    if (!gz) continue;
    const s = gz.charAt(0);
    const b = gz.charAt(1);
    const se = STEM_TO_ELEMENT[s as keyof typeof STEM_TO_ELEMENT];
    const be = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
    if (se) acc[se] += 10;
    if (be) acc[be] += 6;
  }
  return acc;
}

export function normalizePct(score: ElementScore): ElementPct {
  const sum = Object.values(score).reduce((a, b) => a + b, 0);
  if (sum <= 0) return { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 };
  const out: ElementPct = { ...ZERO_ELEMENT_SCORE };
  ELEMENTS.forEach((k) => { out[k] = (score[k] / sum) * 100; });
  return out;
}

export function overallFromTenGod(totals?: PowerData[]): number | null {
  if (!totals || totals.length === 0) return null;
  const sum = totals.reduce((a, b) => a + (b?.value ?? 0), 0) || 0;
  if (sum <= 0) return null;
  const get = (name: TenGod) => totals.find((t) => t.name === name)?.value ?? 0;
  return clamp01(((get("비겁") + get("인성")) / sum) * 100);
}

export function roleOf(dayEl: Element | null, el: Element | null): TenGod | null {
  if (!dayEl || !el) return null;
  if (el === dayEl) return "비겁";
  if (SHENG_NEXT[dayEl] === el) return "식상";
  if (KE[dayEl] === el) return "재성";
  if (officerElement(dayEl) === el) return "관성";
  if (SHENG_PREV[dayEl] === el) return "인성";
  return null;
}

export function strongPenaltyFactor(pct: number): number {
  for (const [min, f] of STRONG_STEPS) if (pct >= min) return f;
  return 1;
}

const deficitRatio = (el: Element, pct: ElementPct) =>
  clamp((TARGET_PCT - (pct[el] ?? 0)) / TARGET_PCT, 0, 1);
const surplusRatio = (el: Element, pct: ElementPct) =>
  clamp(((pct[el] ?? 0) - TARGET_PCT) / TARGET_PCT, 0, 1);

export function roleBiasPoints(
  dayEl: Element | null,
  overallPct: number,
  el: Element,
  pct: ElementPct
): number {
  const r = roleOf(dayEl, el);
  if (!dayEl || !r) return 0;

  const weakGap = clamp((50 - overallPct) / 50, 0, 1);
  const strongGap = clamp((overallPct - 50) / 50, 0, 1);

  const defEl = deficitRatio(el, pct);
  const surEl = surplusRatio(el, pct);
  const defDay = deficitRatio(dayEl, pct);
  const surDay = surplusRatio(dayEl, pct);

  const K = 6.5;
  let w = 0;

  if (weakGap > 0) {
    switch (r) {
      case "인성": w = +(0.30 + 0.40 * defDay + 0.15 * defEl) * weakGap; break;
      case "비겁": w = +(0.18 + 0.45 * defDay) * weakGap; break;
      case "관성": w = -(0.08 + 0.20 * (1 - defEl) + 0.10 * surDay) * weakGap; break;
      case "재성": w = -(0.22 + 0.25 * (1 - defEl) + 0.10 * (1 - defDay)) * weakGap; break;
      case "식상": w = -(0.35 + 0.25 * (1 - defEl) + 0.10 * (1 - defDay)) * weakGap; break;
    }
  } else if (strongGap > 0) {
    switch (r) {
      case "인성": w = -(0.25 + 0.25 * (1 - defEl) + 0.20 * surDay) * strongGap; break;
      case "비겁": w = -(0.28 + 0.20 * surDay) * strongGap; break;
      case "관성": w = +(0.18 + 0.20 * defEl + 0.15 * surDay) * strongGap; break;
      case "재성": w = +(0.22 + 0.25 * defEl + 0.10 * surDay) * strongGap; break;
      case "식상": w = +(0.20 + 0.20 * defEl) * strongGap; break;
    }
  } else {
    switch (r) {
      case "인성": w = +0.08 * (defDay + defEl); break;
      case "비겁": w = +0.05 * defDay - 0.03 * surDay; break;
      case "관성": w = +0.02 * defEl - 0.02 * surEl; break;
      case "재성": w = +0.01 * defEl - 0.06 * surEl; break;
      case "식상": w = -0.05 * (1 - defEl); break;
    }
  }
  return Math.round(K * w * 10) / 10; // Δ만 반환(이유 태그 X)
}
