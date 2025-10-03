// features/AnalysisReport/yongshin.ts
import type { Element, TenGod, PowerData } from "./types";

/* ────────────────────────────────────────────────────────────────────────────
 * 기본 테이블
 * ──────────────────────────────────────────────────────────────────────────── */

const STEM_TO_ELEMENT: Record<string, Element> = {
  갑: "목", 을: "목",
  병: "화", 정: "화",
  무: "토", 기: "토",
  경: "금", 신: "금",
  임: "수", 계: "수",
};

const BRANCH_MAIN_ELEMENT: Record<string, Element> = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
  오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};

const SHENG_NEXT: Record<Element, Element> = {
  목: "화", 화: "토", 토: "금", 금: "수", 수: "목",
};
const SHENG_PREV: Record<Element, Element> = {
  화: "목", 토: "화", 금: "토", 수: "금", 목: "수",
};
const KE: Record<Element, Element> = {
  목: "토", 화: "금", 토: "수", 금: "목", 수: "화",
};

type BasisBand =
  | "극약" | "태약" | "신약" | "중화신약"
  | "중화" | "중화신강" | "태강" | "극태강";

const BANDS: Array<{ name: BasisBand; min: number; max: number }> = [
  { name: "극약",     min: 0,  max: 10 },
  { name: "태약",     min: 10, max: 20 },
  { name: "신약",     min: 20, max: 35 },
  { name: "중화신약", min: 35, max: 45 },
  { name: "중화",     min: 45, max: 55 },
  { name: "중화신강", min: 55, max: 65 },
  { name: "태강",     min: 65, max: 80 },
  { name: "극태강",   min: 80, max: 100.0001 },
];

/** 월지(계절) 온습 성향 (간단 버전) */
const MONTH_BRANCH_CLIMATE: Record<
  string,
  { temp: "cold" | "hot" | "mild"; wet: "dry" | "wet" | "normal" }
> = {
  해: { temp: "cold", wet: "wet" },
  자: { temp: "cold", wet: "wet" },
  축: { temp: "cold", wet: "wet" },
  인: { temp: "mild", wet: "normal" },
  묘: { temp: "mild", wet: "normal" },
  진: { temp: "mild", wet: "wet" },
  사: { temp: "hot",  wet: "normal" },
  오: { temp: "hot",  wet: "dry" },
  미: { temp: "hot",  wet: "wet" },
  신: { temp: "mild", wet: "dry" },
  유: { temp: "mild", wet: "dry" },
  술: { temp: "mild", wet: "dry" },
};

/* ────────────────────────────────────────────────────────────────────────────
 * 타입
 * ──────────────────────────────────────────────────────────────────────────── */

export type YongshinType = "억부" | "조후" | "통관" | "병약";

export type YongshinCandidate = {
  element: Element;
  score: number;
  via: YongshinType[];
  reasons: string[];
  tenGodHints?: TenGod[];
};

export type YongshinResult = {
  chosenType: YongshinType;
  ordered: YongshinCandidate[];
  debug: {
    band: BasisBand;
    overallPct: number;                       // (비겁+인성)/합 * 100
    elementScore: Record<Element, number>;
    tenGodTotals?: Record<TenGod, number>;    // {비겁, 식상, 재성, 관성, 인성}
    monthBranch?: string;
  };
};

/* ────────────────────────────────────────────────────────────────────────────
 * 유틸
 * ──────────────────────────────────────────────────────────────────────────── */

function clamp01(v: number) { return Math.max(0, Math.min(100, v)); }
function clamp(n: number, min: number, max: number) { return Math.max(min, Math.min(max, n)); }

function getBand(pct: number): BasisBand {
  const x = clamp01(pct);
  return (BANDS.find(b => x >= b.min && x < b.max)?.name ?? "중화") as BasisBand;
}

function dayElement(pillars: string[]): Element | null {
  const dayStem = pillars?.[2]?.charAt(0) ?? "";
  return STEM_TO_ELEMENT[dayStem as keyof typeof STEM_TO_ELEMENT] ?? null;
}

function monthBranch(pillars: string[]): string | null {
  const mb = pillars?.[1]?.charAt(1) ?? "";
  return mb || null;
}

function findOfficer(target: Element): Element {
  const entries = Object.entries(KE) as Array<[Element, Element]>;
  for (const [x, y] of entries) if (y === target) return x;
  return "토";
}

function primaryOfDay(dEl: Element | null) {
  if (!dEl) return null;
  return {
    peer: dEl,
    resource: SHENG_PREV[dEl],
    leak: SHENG_NEXT[dEl],
    wealth: KE[dEl],
    officer: findOfficer(dEl),
  };
}

function lightElementScore(pillars: string[]): Record<Element, number> {
  const acc: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
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

function normalizePct(score: Record<Element, number>): Record<Element, number> {
  const sum = Object.values(score).reduce((a, b) => a + b, 0);
  if (sum <= 0) return { 목: 20, 화: 20, 토: 20, 금: 20, 수: 20 };
  const out: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  (Object.keys(score) as Element[]).forEach((k) => { out[k] = (score[k] / sum) * 100; });
  return out;
}

function overallFromTenGod(totals?: PowerData[]): number | null {
  if (!totals || totals.length === 0) return null;
  const sum = totals.reduce((a, b) => a + (b?.value ?? 0), 0) || 0;
  if (sum <= 0) return null;
  const get = (name: TenGod) => totals.find(t => t.name === name)?.value ?? 0;
  return clamp01(((get("비겁") + get("인성")) / sum) * 100);
}

function roleOf(dayEl: Element | null, el: Element | null): "비겁" | "식상" | "재성" | "관성" | "인성" | null {
  if (!dayEl || !el) return null;
  if (el === dayEl) return "비겁";
  if (SHENG_NEXT[dayEl] === el) return "식상";
  if (KE[dayEl] === el) return "재성";
  if (findOfficer(dayEl) === el) return "관성";
  if (SHENG_PREV[dayEl] === el) return "인성";
  return null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 과다/부재 처리 파라미터 (더 강한 버전)
 * ──────────────────────────────────────────────────────────────────────────── */

const STRONG_THRESHOLD_PCT = 24; // 24%↑ 과다

// 작을수록 강한 패널티
const STRONG_STEPS: Array<[minStrength: number, factor: number]> = [
  [60, 0.00], // 60%↑ → 제외급
  [55, 0.01],
  [50, 0.03],
  [45, 0.06],
  [40, 0.10],
  [35, 0.18],
  [30, 0.32],
  [27, 0.48],
  [24, 0.62],
];
function strongPenaltyFactor(pct: number): number {
  for (const [min, f] of STRONG_STEPS) if (pct >= min) return f;
  return 1;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 동적 역할가중 (절대순서 X) — 사유 태그는 간소화
 * ──────────────────────────────────────────────────────────────────────────── */

const TARGET_PCT = 20;
const deficitRatio = (el: Element, pct: Record<Element, number>) => clamp((TARGET_PCT - (pct[el] ?? 0)) / TARGET_PCT, 0, 1);
const surplusRatio = (el: Element, pct: Record<Element, number>) => clamp(((pct[el] ?? 0) - TARGET_PCT) / TARGET_PCT, 0, 1);

function roleBiasPoints(
  dayEl: Element | null,
  overallPct: number,
  el: Element,
  pct: Record<Element, number>
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

/* ────────────────────────────────────────────────────────────────────────────
 * 타입별 스코어러(기존 동일)
 * ──────────────────────────────────────────────────────────────────────────── */

function scoreEokbu(
  dEl: Element,
  band: BasisBand,
  _elemScore: Record<Element, number>,
  reasons: Map<Element, string[]>,
): Record<Element, number> {
  const strongSide = ["중화신강", "태강", "극태강"].includes(band);
  const weakSide   = ["극약", "태약", "신약", "중화신약"].includes(band);
  const base: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  if (strongSide) {
    const leak = SHENG_NEXT[dEl], wealth = KE[dEl], officer = findOfficer(dEl);
    base[leak] += 28; base[wealth] += 22; base[officer] += 20;
    reasons.get(leak)?.push("억부: 일간 강 → 설기(식상)");
    reasons.get(wealth)?.push("억부: 일간 강 → 재성 누설");
    reasons.get(officer)?.push("억부: 일간 강 → 관성 절제");
  }
  if (weakSide) {
    const resource = SHENG_PREV[dEl], peer = dEl;
    base[resource] += 28; base[peer] += 22;
    reasons.get(resource)?.push("억부: 일간 약 → 인성 보강");
    reasons.get(peer)?.push("억부: 일간 약 → 비겁 보강");
  }
  return base;
}

function scoreChoHu(mb: string | null, reasons: Map<Element, string[]>): Record<Element, number> {
  if (!mb) return { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const cli = MONTH_BRANCH_CLIMATE[mb] ?? { temp: "mild", wet: "normal" };
  const s: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  if (cli.temp === "cold") { s["화"] += 16; s["토"] += 6; reasons.get("화")?.push("조후: 한랭 → 화"); reasons.get("토")?.push("조후: 한랭습 보조"); }
  else if (cli.temp === "hot") { s["수"] += 14; s["금"] += 6; reasons.get("수")?.push("조후: 염열 → 수"); reasons.get("금")?.push("조후: 제열 보조"); }
  if (cli.wet === "wet") { s["토"] += 8; s["화"] += 4; reasons.get("토")?.push("조후: 습 → 토"); reasons.get("화")?.push("조후: 습냉 가온"); }
  else if (cli.wet === "dry") { s["수"] += 8; s["목"] += 4; reasons.get("수")?.push("조후: 건조 → 수"); reasons.get("목")?.push("조후: 생발 보조"); }
  return s;
}

function scoreTongGwan(elemScore: Record<Element, number>, reasons: Map<Element, string[]>): Record<Element, number> {
  const s: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const order: Element[] = ["목", "화", "토", "금", "수"];
  for (const a of order) {
    const b = KE[a];
    const pressure = Math.max(0, (elemScore[a] ?? 0) - (elemScore[b] ?? 0));
    if (pressure <= 0) continue;
    const mediator = SHENG_NEXT[a];
    const gain = Math.round(pressure * 0.35);
    if (gain > 0) { s[mediator] += gain; reasons.get(mediator)?.push(`통관: ${a}극${b} 완화`); }
  }
  return s;
}

function scoreByeongYak(elemScore: Record<Element, number>, reasons: Map<Element, string[]>): Record<Element, number> {
  const s: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const entries = Object.entries(elemScore) as Array<[Element, number]>;
  const minVal = Math.min(...entries.map(([, v]) => v));
  const nearZero = entries.filter(([, v]) => v <= Math.max(6, minVal));
  for (const [el] of nearZero) { s[el] += 12; reasons.get(el)?.push("병약: 결핍 보충"); }
  return s;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 메인
 * ──────────────────────────────────────────────────────────────────────────── */

export function computeYongshin(
  pillars: string[],
  tenGodTotals?: PowerData[],
): YongshinResult {
  const dEl = dayElement(pillars);
  const mb  = monthBranch(pillars);
  const elemScore = lightElementScore(pillars);
  const elemPct = normalizePct(elemScore);

  let overallPct = overallFromTenGod(tenGodTotals);
  if (overallPct == null) {
    if (!dEl) overallPct = 50;
    else {
      const peer = dEl, resource = SHENG_PREV[dEl];
      const sumAll = (Object.values(elemScore).reduce((a, b) => a + b, 0)) || 1;
      overallPct = clamp01(((elemScore[peer] ?? 0) + (elemScore[resource] ?? 0)) / sumAll * 100);
    }
  }
  const band = getBand(overallPct!);

  const score: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const reasons = new Map<Element, string[]>((["목","화","토","금","수"] as Element[]).map(k => [k, []]));

  // 1) 억부
  if (dEl) {
    const s1 = scoreEokbu(dEl, band, elemScore, reasons);
    (Object.keys(score) as Element[]).forEach(k => { score[k] += s1[k] ?? 0; });
  }
  // 2) 조후
  const s2 = scoreChoHu(mb, reasons);
  (Object.keys(score) as Element[]).forEach(k => { score[k] += s2[k] ?? 0; });
  // 3) 통관
  const s3 = scoreTongGwan(elemScore, reasons);
  (Object.keys(score) as Element[]).forEach(k => { score[k] += s3[k] ?? 0; });
  // 4) 병약
  const s4 = scoreByeongYak(elemScore, reasons);
  (Object.keys(score) as Element[]).forEach(k => { score[k] += s4[k] ?? 0; });

  // 4.5) 중화권 보정
  const prim = primaryOfDay(dEl);
  const tgMap: Record<TenGod, number> = { 비겁:0, 식상:0, 재성:0, 관성:0, 인성:0 };
  if (Array.isArray(tenGodTotals)) {
    for (const t of tenGodTotals) {
      tgMap[t.name as TenGod] = t.value;
    }
  }

  const isNeutral = overallPct! >= 45 && overallPct! <= 55;
  if (isNeutral && prim) {
    const officerHeavy = tgMap["관성"] >= 30 || tgMap["관성"] >= Math.max(tgMap["비겁"], tgMap["식상"], tgMap["재성"], tgMap["인성"]) + 5;
    if (overallPct! <= 50) {
      score[prim.resource] += 14; reasons.get(prim.resource)?.push("밸런스: 중화-약측");
      score[prim.peer]     += 10; reasons.get(prim.peer)?.push("밸런스: 중화-약측");
      score[prim.leak]     +=  6; reasons.get(prim.leak)?.push("밸런스: 중화-약측");
      score[prim.wealth]   +=  3; reasons.get(prim.wealth)?.push("밸런스: 중화-약측");
      if (officerHeavy && prim.officer) {
        score[prim.officer] = Math.round(score[prim.officer] * 0.80 * 10) / 10;
        reasons.get(prim.officer)?.push("밸런스: 관성 과다 억제");
      }
    } else {
      score[prim.leak]     += 14; reasons.get(prim.leak)?.push("밸런스: 중화-강측");
      score[prim.wealth]   += 10; reasons.get(prim.wealth)?.push("밸런스: 중화-강측");
      if (prim.officer) { score[prim.officer] += 6; reasons.get(prim.officer)?.push("밸런스: 중화-강측"); }
      score[prim.resource] += 3; reasons.get(prim.resource)?.push("밸런스: 중화-강측");
    }
  }

  // 4.6) 동적 역할가중(간소 태그)
  (["목","화","토","금","수"] as Element[]).forEach((el) => {
    const delta = roleBiasPoints(dEl, overallPct!, el, elemPct);
    score[el] = clamp(Math.round((score[el] + delta) * 10) / 10, 0, 999);
    //if (delta !== 0) reasons.get(el)?.push("역할가중");
  });

  // 4.7) 과다 패널티 — 훨씬 강하게 (신약+일간오행 예외)
  const isWeakSide = overallPct! < 50;
  (["목","화","토","금","수"] as Element[]).forEach((el) => {
    const pct = elemPct[el] ?? 0;
    const skip = isWeakSide && dEl === el;
    if (pct >= STRONG_THRESHOLD_PCT && !skip) {
      const f = strongPenaltyFactor(pct);
      score[el] = Math.round(score[el] * f * 10) / 10;
      const extra = Math.min(14, Math.max(0, Math.ceil((pct - STRONG_THRESHOLD_PCT) * 0.5))); // 최대 -14
      if (extra > 0) score[el] = clamp(score[el] - extra, 0, 999);
      reasons.get(el)?.push("강과 패널티(강화)");
    } else if (pct >= STRONG_THRESHOLD_PCT && skip) {
      //reasons.get(el)?.push("신약 예외");
    }
  });

  // 십성 힌트
  const tenHints: Record<Element, TenGod[]> = { 목: [], 화: [], 토: [], 금: [], 수: [] };
  if (dEl) {
    const leak = SHENG_NEXT[dEl], wealth = KE[dEl], officer = findOfficer(dEl), peer = dEl, resource = SHENG_PREV[dEl];
    tenHints[leak].push("식상"); tenHints[wealth].push("재성"); tenHints[officer].push("관성"); tenHints[peer].push("비겁"); tenHints[resource].push("인성");
  }

  // 5) 정렬: 일반(0) → 부재(1) → 약과다(2) → 강과다(3) → 극과다(4)
  const present: Record<Element, boolean> = {
    목: (elemScore["목"] ?? 0) > 0,
    화: (elemScore["화"] ?? 0) > 0,
    토: (elemScore["토"] ?? 0) > 0,
    금: (elemScore["금"] ?? 0) > 0,
    수: (elemScore["수"] ?? 0) > 0,
  };
  const bucketOf = (el: Element): 0 | 1 | 2 | 3 | 4 => {
    const pct = elemPct[el] ?? 0;
    const strong = pct >= STRONG_THRESHOLD_PCT && !(isWeakSide && dEl === el);
    if (strong) {
      if (pct >= 55) return 4;       // 극과다
      if (pct >= 45) return 3;       // 강과다
      return 2;                      // 약과다
    }
    if (!present[el]) return 1;      // 부재
    return 0;                        // 일반
  };

  const baseViaChoHu = scoreChoHu(mb, new Map<Element, string[]>());
  const baseViaTong  = scoreTongGwan(elemScore, new Map<Element, string[]>());
  const baseViaBy    = scoreByeongYak(elemScore, new Map<Element, string[]>());

  const ordered: YongshinCandidate[] = (Object.keys(score) as Element[])
    .map(el => ({
      element: el,
      score: Math.round(score[el] * 10) / 10,
      via: collectVia(el, baseViaChoHu, baseViaTong, baseViaBy),
      reasons: (reasons.get(el) ?? []).slice(),
      tenGodHints: tenHints[el],
    }))
    .sort((a, b) => {
      const ab = bucketOf(a.element), bb = bucketOf(b.element);
      if (ab !== bb) return ab - bb;
      if (b.score !== a.score) return b.score - a.score;
      return a.element.localeCompare(b.element);
    });

  const chosenType = chooseType(band, baseViaChoHu, baseViaTong, baseViaBy);

  const initTenGods: Record<TenGod, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const tgTotals: Record<TenGod, number> | undefined =
  tenGodTotals
    ? tenGodTotals.reduce((acc, t) => {
        acc[t.name as TenGod] = t.value;
        return acc;
      }, { ...initTenGods })
    : undefined;

  return {
    chosenType,
    ordered,
    debug: {
      band,
      overallPct: overallPct!,
      elementScore: elemScore,
      tenGodTotals: tgTotals,
      monthBranch: mb ?? undefined,
    },
  };
}

function collectVia(
  el: Element,
  sChoHu: Record<Element, number>,
  sTong:  Record<Element, number>,
  sBy:    Record<Element, number>,
): YongshinType[] {
  const via: YongshinType[] = [];
  if ((sChoHu[el] ?? 0) > 0) via.push("조후");
  if ((sTong[el]  ?? 0) > 0) via.push("통관");
  if ((sBy[el]    ?? 0) > 0) via.push("병약");
  if (via.length === 0) via.push("억부");
  return via;
}

function chooseType(
  band: BasisBand,
  sChoHu: Record<Element, number>,
  sTong:  Record<Element, number>,
  sBy:    Record<Element, number>,
): YongshinType {
  const eokbuFirst = ["극약", "태약", "태강", "극태강"].includes(band);
  if (eokbuFirst) return "억부";
  const sum = (x: Record<Element, number>) => Object.values(x).reduce((a, b) => a + b, 0);
  const c2 = sum(sChoHu), c3 = sum(sTong), c4 = sum(sBy);
  if (c2 > Math.max(c3, c4)) return "조후";
  if (c3 >= c4) return "통관";
  return "병약";
}

export default computeYongshin;