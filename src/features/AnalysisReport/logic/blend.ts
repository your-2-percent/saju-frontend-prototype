// features/AnalysisReport/logic/blend.ts
import type { Element } from "../utils/types";
import {
  STEM_TO_ELEMENT as STEM_TO_EL,
  BRANCH_MAIN_ELEMENT as BRANCH_TO_EL,
} from "../utils/hiddenStem";

/** 간지 한 쌍에서 오행 점수(간:50, 지:50) — 절대값 100 내외 */
export function elementScoreFromGZ(gz: string): Record<Element, number> {
  const out: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  if (!gz || gz.length < 2) return out;
  const s = gz.charAt(0),
    b = gz.charAt(1);
  const se = STEM_TO_EL[s as keyof typeof STEM_TO_EL];
  const be = BRANCH_TO_EL[b];
  if (se) out[se] += 50;
  if (be) out[be] += 50;
  return out;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 절대 스코어 → 퍼센트(합=100, 소수1자리) */
export function toPercent(m: Record<Element, number>): Record<Element, number> {
  const sum = m.목 + m.화 + m.토 + m.금 + m.수 || 1;
  return {
    목: round1((m.목 / sum) * 100),
    화: round1((m.화 / sum) * 100),
    토: round1((m.토 / sum) * 100),
    금: round1((m.금 / sum) * 100),
    수: round1((m.수 / sum) * 100),
  };
}

/** 퍼센트 벡터끼리 가중합 */
function mixPercent(
  a: Record<Element, number>,
  wa: number,
  b: Record<Element, number> | null,
  wb: number,
  c: Record<Element, number> | null,
  wc: number,
  d: Record<Element, number> | null,
  wd: number,
  e: Record<Element, number> | null,
  we: number
): Record<Element, number> {
  // 실제 들어온 항목만으로 가중치 재정규화
  const used = [
    { v: a, w: wa },
    { v: b, w: wb },
    { v: c, w: wc },
    { v: d, w: wd },
    { v: e, w: we },
  ].filter((x) => x.v && x.w > 0) as Array<{ v: Record<Element, number>; w: number }>;
  const wsum = used.reduce((s, x) => s + x.w, 0) || 1;
  used.forEach((x) => {
    x.w = x.w / wsum;
  });

  const out: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const { v, w } of used) {
    out.목 += v.목 * w;
    out.화 += v.화 * w;
    out.토 += v.토 * w;
    out.금 += v.금 * w;
    out.수 += v.수 * w;
  }
  return out;
}

export type BlendTab = "원국" | "대운" | "세운" | "월운" | "일운";
export const BLEND_TABS: BlendTab[] = ["원국", "대운", "세운", "월운", "일운"];

type BlendWeight = {
  natal: number;
  dae?: number;
  se?: number;
  wol?: number;
  il?: number;
};

export const BLEND_WEIGHTS: Record<BlendTab, BlendWeight> = {
  원국: { natal: 1.0 },
  대운: { natal: 0.6, dae: 0.4 },
  세운: { natal: 0.5, dae: 0.3, se: 0.2 },
  월운: { natal: 0.4, dae: 0.3, se: 0.2, wol: 0.1 },
  일운: { natal: 0.4, dae: 0.3, se: 0.2, wol: 0.1, il: 0.03 },
};

export function blendElementStrength(params: {
  natalElementScore: Record<Element, number>;
  daewoonGz?: string | null;
  sewoonGz?: string | null;
  wolwoonGz?: string | null;
  ilwoonGz?: string | null;
  tab: BlendTab;
}): Record<Element, number> {
  const { natalElementScore, daewoonGz, sewoonGz, wolwoonGz, ilwoonGz, tab } =
    params;

  const natalPct = toPercent(natalElementScore);
  const daePct = daewoonGz ? toPercent(elementScoreFromGZ(daewoonGz)) : null;
  const sePct = sewoonGz ? toPercent(elementScoreFromGZ(sewoonGz)) : null;
  const wolPct = wolwoonGz ? toPercent(elementScoreFromGZ(wolwoonGz)) : null;
  const ilPct = ilwoonGz ? toPercent(elementScoreFromGZ(ilwoonGz)) : null;

  const w = BLEND_WEIGHTS[tab];
  return toPercent(
    mixPercent(
      natalPct,
      w.natal ?? 0,
      daePct,
      w.dae ?? 0,
      sePct,
      w.se ?? 0,
      wolPct,
      w.wol ?? 0,
      ilPct,
      w.il ?? 0
    )
  );
}
