// features/AnalysisReport/logic/blend.ts
import type { Element } from "../utils/types";
import {
  STEM_TO_ELEMENT as STEM_TO_EL,
  BRANCH_MAIN_ELEMENT as BRANCH_TO_EL,
} from "../utils/hiddenStem";

// --- 한자 -> 한글 변환 헬퍼 ---
const STEM_KO_MAP: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계"
};
const BRANCH_KO_MAP: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해"
};

function toKoStem(s: string): string { return STEM_KO_MAP[s] ?? s; }
function toKoBranch(b: string): string { return BRANCH_KO_MAP[b] ?? b; }

/** 간지 한 쌍에서 오행 점수(간:50, 지:50) — 절대값 100 내외 */
export function elementScoreFromGZ(gz: string): Record<Element, number> {
  const out: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  if (!gz || gz.length < 2) return out;
  // ✅ 한자 처리 추가
  const s = toKoStem(gz.charAt(0));
  const b = toKoBranch(gz.charAt(1));
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

// --- Helper: 세력 보정 (합국/월지) ---
function getMonthBranchElement(monthGz: string | undefined): Element | null {
  const rawBranch = (monthGz || "").trim().slice(-1);
  const branch = toKoBranch(rawBranch); // ✅ 한자 처리
  if ("인묘寅卯".includes(branch)) return "목";
  if ("사오巳午".includes(branch)) return "화";
  if ("신유申酉".includes(branch)) return "금";
  if ("해자亥子".includes(branch)) return "수";
  if ("진술축미辰戌丑未".includes(branch)) return "토";
  return null;
}

function detectCombinations(pillars: (string | undefined)[]): { element: Element; score: number }[] {
  const branches = pillars.map((p) => (p && p.length > 1 ? toKoBranch(p[1]) : ""));
  const bSet = new Set(branches);
  const results: { element: Element; score: number }[] = [];

  // 1. 삼합 (Three Harmony) - 강력 (40점)
  if (bSet.has("인") && bSet.has("오") && bSet.has("술")) results.push({ element: "화", score: 20 });
  if (bSet.has("사") && bSet.has("유") && bSet.has("축")) results.push({ element: "금", score: 20 });
  if (bSet.has("신") && bSet.has("자") && bSet.has("진")) results.push({ element: "수", score: 20 });
  if (bSet.has("해") && bSet.has("묘") && bSet.has("미")) results.push({ element: "목", score: 20 });

  // 2. 반합 (Half Harmony) - 준강력 (20점)
  // 목
  if (bSet.has("해") && bSet.has("묘")) results.push({ element: "목", score: 12 });
  else if (bSet.has("묘") && bSet.has("미")) results.push({ element: "목", score: 8 });
  else if (bSet.has("해") && bSet.has("미")) results.push({ element: "목", score: 4 });
  // 화
  if (bSet.has("인") && bSet.has("오")) results.push({ element: "화", score: 12 });
  else if (bSet.has("오") && bSet.has("술")) results.push({ element: "화", score: 8 });
  else if (bSet.has("인") && bSet.has("술")) results.push({ element: "화", score: 4 });
  // 금
  if (bSet.has("사") && bSet.has("유")) results.push({ element: "금", score: 12 });
  else if (bSet.has("유") && bSet.has("축")) results.push({ element: "금", score: 8 });
  else if (bSet.has("사") && bSet.has("축")) results.push({ element: "금", score: 4 });
  // 수
  if (bSet.has("신") && bSet.has("자")) results.push({ element: "수", score: 12 });
  else if (bSet.has("자") && bSet.has("진")) results.push({ element: "수", score: 8 });
  else if (bSet.has("신") && bSet.has("진")) results.push({ element: "수", score: 4 });

  return results;
}

/** 절대 스코어 누적(원국 전용) */
export function elementScoreFromPillars(pillars: (string | undefined)[]): Record<Element, number> {
  const out: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const valid = pillars.filter((p): p is string => !!p && p.length >= 2);
  for (const gz of valid) {
    const sc = elementScoreFromGZ(gz);
    for (const el of Object.keys(out) as Element[]) {
      out[el] += sc[el];
    }
  }

  // ✅ 주수만큼 나누기 (시주 없으면 3으로 나눔)
  const divisor = valid.length;
  for (const el of Object.keys(out) as Element[]) {
    out[el] = +(out[el] / divisor).toFixed(1);
  }

  // ✅ 보정 로직 적용 (합국 + 월지 가중치)
  // pillars[1]이 월주라고 가정 (일반적인 [년, 월, 일, 시] 구조)
  if (pillars.length >= 2) {
    const monthGz = pillars[1];
    const monthEl = getMonthBranchElement(monthGz);
    if (monthEl) {
      out[monthEl] = (out[monthEl] ?? 0) + 10;
    }

    const combos = detectCombinations(pillars);
    for (const c of combos) {
      out[c.element] = (out[c.element] ?? 0) + c.score;
    }
  }

  return out;
}
