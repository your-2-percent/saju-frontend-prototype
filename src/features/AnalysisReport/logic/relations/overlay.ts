// features/AnalysisReport/logic/relations/overlay.ts

import type { Element } from "../../utils/types";
import { POS } from "./constants";
import { BANGHAP_GROUPS, SANHE_GROUPS, type KoBranch } from "./groups";
import { normalizeGZ, gzBranch } from "./normalize";
import type { HarmonyOptions, HarmonyResult, Pillars4, StrengthLevel } from "./types";

// ───────── 오행 상생/상극 맵 ─────────

import { KE, KE_INV, SHENG_NEXT, SHENG_PREV, LV_ADJ } from "./types";

function isClustered3(idx: number, indices: number[]) {
  const sorted = Array.from(new Set(indices)).sort((a, b) => a - b);
  if (sorted.length < 3) return false;
  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1];
    const c = sorted[i + 2];
    if (b == null || c == null) continue;
    if (c - a <= 2) {
      if (idx === a || idx === b || idx === c) return true;
    }
  }
  return false;
}

function strengthFromPos(indices: number[]): StrengthLevel {
  // 월 중심(득령) + 3개 이상이면 강
  const hasMonth = indices.includes(POS.month);
  const clustered3 = isClustered3(POS.month, indices) || indices.length >= 3;
  if (hasMonth && clustered3) return "강";
  if (hasMonth || indices.length >= 2) return "중";
  return "약";
}

function overlayElement(
  base: Record<Element, number>,
  from: Element,
  to: Element,
  strength: StrengthLevel,
) {
  const delta = strength === "강" ? 2 : strength === "중" ? 1 : 0.5;
  base[from] = (base[from] ?? 0) - delta;
  base[to] = (base[to] ?? 0) + delta;
}

export function applyHarmonyOverlay(
  natal: Pillars4,
  baseScore: Record<Element, number>,
  opts: HarmonyOptions = {},
): HarmonyResult {
  const { includeBanghap = true, includeSamhap = true } = opts;

  const natalKo: Pillars4 = [
    normalizeGZ(natal[0] ?? ""),
    normalizeGZ(natal[1] ?? ""),
    normalizeGZ(natal[2] ?? ""),
    normalizeGZ(natal[3] ?? ""),
  ];

  const branches = natalKo.map((gz) => gzBranch(gz) as KoBranch).filter(Boolean);

  const applied: Array<{ type: "삼합" | "방합"; name: string; out: Element; strength: StrengthLevel }> = [];
  const score: Record<Element, number> = { ...baseScore };

  const applyGroup = (type: "삼합" | "방합", g: { name: string; members: [KoBranch, KoBranch, KoBranch]; out: Element; wang: KoBranch }) => {
    const indices: number[] = [];
    for (let i = 0; i < natalKo.length; i++) {
      const b = gzBranch(natalKo[i] ?? "") as KoBranch;
      if (g.members.includes(b)) indices.push(i);
    }

    const present = g.members.every((m) => branches.includes(m));
    if (!present) return;

    const strength = strengthFromPos(indices);

    // 삼합/방합이 성립하면 해당 오행의 힘을 증폭(기본 점수에 overlay)
    // 단, "득령"(월지 왕) 포함 여부로 강약을 조절
    const to = g.out;
    const from = SHENG_PREV[to];

    // 상생 방향(이전 오행에서 결과 오행으로 이동)
    overlayElement(score, from, to, strength);
    applied.push({ type, name: g.name, out: g.out, strength });
  };

  if (includeSamhap) {
    for (const g of SANHE_GROUPS) applyGroup("삼합", g);
  }
  if (includeBanghap) {
    for (const g of BANGHAP_GROUPS) applyGroup("방합", g);
  }

  return {
    applied,
    score,
    strengthAdj: LV_ADJ,
    shengNext: SHENG_NEXT,
    shengPrev: SHENG_PREV,
    ke: KE,
    keInv: KE_INV,
  };
}
