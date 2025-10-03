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
  const s = gz.charAt(0), b = gz.charAt(1);
  const se = STEM_TO_EL[s as keyof typeof STEM_TO_EL];
  const be = BRANCH_TO_EL[b as keyof typeof BRANCH_TO_EL];
  if (se) out[se] += 50;
  if (be) out[be] += 50;
  return out;
}

/* ─────────────────────────────────────────────────────────
 * 정규화: 합계 100(정수) — 해밀턴/최대잔여 배분
 * computePowerDataDetailed와 동일 전략
 * ───────────────────────────────────────────────────────── */
function normalizeTo100(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return values.map(() => 0);
  const pct = values.map(v => (v * 100) / sum);
  const rounded = pct.map(v => Math.floor(v));     // 바닥 깔고
  let rem = 100 - rounded.reduce((a, b) => a + b, 0);

  // 소수부 큰 순으로 +1
  const order = pct
    .map((v, i) => ({ i, frac: v - Math.floor(v) }))
    .sort((a, b) => b.frac - a.frac);

  for (let k = 0; k < order.length && rem > 0; k++) {
    rounded[order[k]!.i] += 1;
    rem -= 1;
  }
  return rounded;
}

/** 절대 스코어 → 퍼센트(합=100, 정수). ※ 기존 toPercent 대체 (누적 반올림 제거) */
export function toPercent(m: Record<Element, number>): Record<Element, number> {
  const arr = normalizeTo100([m.목 || 0, m.화 || 0, m.토 || 0, m.금 || 0, m.수 || 0]);
  return { 목: arr[0]!, 화: arr[1]!, 토: arr[2]!, 금: arr[3]!, 수: arr[4]! };
}

/** 원시 스코어 벡터끼리 가중합 (정규화는 나중에 한 번만) */
function mixRaw(
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
  used.forEach((x) => { x.w = x.w / wsum; });

  const out: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const { v, w } of used) {
    out.목 += (v.목 || 0) * w;
    out.화 += (v.화 || 0) * w;
    out.토 += (v.토 || 0) * w;
    out.금 += (v.금 || 0) * w;
    out.수 += (v.수 || 0) * w;
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

const ZERO: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

/**
 * 원시 스코어(절대값)를 섞고, 마지막에만 퍼센트(정수 합 100)로 변환.
 * - natalElementScore: 원국 절대 스코어(예: computePowerDataDetailed.elementScoreRaw 또는 elementScoreFromPillars 등)
 * - dae/se/wol/il: 간지 한 쌍의 절대 스코어 (elementScoreFromGZ 사용)
 */
export function blendElementStrength(params: {
  natalElementScore: Record<Element, number>;
  daewoonGz?: string | null;
  sewoonGz?: string | null;
  wolwoonGz?: string | null;
  ilwoonGz?: string | null;
  tab: BlendTab;
}): Record<Element, number> {
  const { natalElementScore, daewoonGz, sewoonGz, wolwoonGz, ilwoonGz, tab } = params;

  // 각 운은 "간지 절대 스코어"로 (퍼센트 아님)
  const natalRaw = natalElementScore || ZERO;
  const daeRaw   = daewoonGz ? elementScoreFromGZ(daewoonGz) : null;
  const seRaw    = sewoonGz ? elementScoreFromGZ(sewoonGz)   : null;
  const wolRaw   = wolwoonGz ? elementScoreFromGZ(wolwoonGz) : null;
  const ilRaw    = ilwoonGz ? elementScoreFromGZ(ilwoonGz)   : null;

  const w = BLEND_WEIGHTS[tab];
  const mixedRaw = mixRaw(
    natalRaw, w.natal ?? 0,
    daeRaw,   w.dae   ?? 0,
    seRaw,    w.se    ?? 0,
    wolRaw,   w.wol   ?? 0,
    ilRaw,    w.il    ?? 0
  );

  // 마지막에 한 번만 정규화(합 100 정수) — 누적 오차 제거
  return toPercent(mixedRaw);
}

/** 절대 스코어 누적(원국 전용) */
export function elementScoreFromPillars(
  pillars: Readonly<[string, string, string, string]> | ReadonlyArray<string>
): Record<Element, number> {
  const acc: Record<Element, number> = { ...ZERO };
  for (const gz of pillars) {
    if (!gz) continue;
    const v = elementScoreFromGZ(gz);
    acc.목 += v.목; acc.화 += v.화; acc.토 += v.토; acc.금 += v.금; acc.수 += v.수;
  }
  return acc;
}
