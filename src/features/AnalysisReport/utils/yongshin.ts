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
  // 겨울: 한랭/습
  해: { temp: "cold", wet: "wet" },
  자: { temp: "cold", wet: "wet" },
  축: { temp: "cold", wet: "wet" },
  // 봄: 서늘→온난 / 보통~습
  인: { temp: "mild", wet: "normal" },
  묘: { temp: "mild", wet: "normal" },
  진: { temp: "mild", wet: "wet" },
  // 여름: 열/조습
  사: { temp: "hot",  wet: "normal" },
  오: { temp: "hot",  wet: "dry" },
  미: { temp: "hot",  wet: "wet" },
  // 가을: 서늘/건조
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

function clamp01(v: number) {
  return Math.max(0, Math.min(100, v));
}

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
  // x such that KE[x] === target
  const entries = Object.entries(KE) as Array<[Element, Element]>;
  for (const [x, y] of entries) if (y === target) return x;
  return "토"; // fallback(실제 도달 거의 없음)
}

/** 일간 기준 주요 오행 묶음 */
function primaryOfDay(dEl: Element | null) {
  if (!dEl) return null;
  return {
    peer: dEl,                         // 비겁
    resource: SHENG_PREV[dEl],         // 인성
    leak: SHENG_NEXT[dEl],             // 식상
    wealth: KE[dEl],                   // 재성
    officer: findOfficer(dEl),         // 관성 (x such that KE[x] === dEl)
  };
}

/** 매우 가벼운 오행 점수: 천간 10 + 지지 6 (튜닝 가능) */
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

/** 십성 합계에서 (비겁+인성)/합*100 → overallPct */
function overallFromTenGod(totals?: PowerData[]): number | null {
  if (!totals || totals.length === 0) return null;
  const sum = totals.reduce((a, b) => a + (b?.value ?? 0), 0) || 0;
  if (sum <= 0) return null;
  const get = (name: TenGod) => totals.find(t => t.name === name)?.value ?? 0;
  const bigyup = get("비겁");
  const inseong = get("인성");
  return clamp01(((bigyup + inseong) / sum) * 100);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 타입별 스코어러
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
    // 신강 → 설기/재/관
    const leak    = SHENG_NEXT[dEl];      // 식상
    const wealth  = KE[dEl];              // 재성(내가 극함)
    const officer = findOfficer(dEl);     // 관성(나를 극)

    base[leak]    += 28;
    base[wealth]  += 22;
    base[officer] += 20;

    reasons.get(leak   )?.push("억부: 일간이 강하여 설기(식상) 선호");
    reasons.get(wealth )?.push("억부: 일간이 강하여 재성으로 누설");
    reasons.get(officer)?.push("억부: 일간이 강하여 관성으로 절제");
  }

  if (weakSide) {
    // 신약 → 인/비
    const resource = SHENG_PREV[dEl];     // 인성(나를 생)
    const peer     = dEl;                 // 비겁

    base[resource] += 28;
    base[peer]     += 22;

    reasons.get(resource)?.push("억부: 일간이 약하여 인성 보강");
    reasons.get(peer    )?.push("억부: 일간이 약하여 비겁 보강");
  }

  return base;
}

function scoreChoHu(
  mb: string | null,
  reasons: Map<Element, string[]>,
): Record<Element, number> {
  if (!mb) return { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  const cli = MONTH_BRANCH_CLIMATE[mb] ?? { temp: "mild", wet: "normal" };
  const s: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  // 온도
  if (cli.temp === "cold") {
    s["화"] += 16; s["토"] += 6;
    reasons.get("화")?.push("조후: 한랭 → 화로 온난");
    reasons.get("토")?.push("조후: 한랭습 → 토로 제습/절한 보조");
  } else if (cli.temp === "hot") {
    s["수"] += 14; s["금"] += 6;
    reasons.get("수")?.push("조후: 염열 → 수로 청량");
    reasons.get("금")?.push("조후: 열조 → 금으로 제열 보조");
  }

  // 습/조
  if (cli.wet === "wet") {
    s["토"] += 8; s["화"] += 4;
    reasons.get("토")?.push("조후: 습함 → 토로 조습");
    reasons.get("화")?.push("조후: 습냉 보조 가온");
  } else if (cli.wet === "dry") {
    s["수"] += 8; s["목"] += 4;
    reasons.get("수")?.push("조후: 건조 → 수로 윤택");
    reasons.get("목")?.push("조후: 조열 보조 생발");
  }

  return s;
}

function scoreTongGwan(
  elemScore: Record<Element, number>,
  reasons: Map<Element, string[]>,
): Record<Element, number> {
  const s: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const order: Element[] = ["목", "화", "토", "금", "수"];

  // 모든 상극쌍 a克b에 대해 압력 = max(0, a-b)
  for (const a of order) {
    const b = KE[a];
    const pressure = Math.max(0, (elemScore[a] ?? 0) - (elemScore[b] ?? 0));
    if (pressure <= 0) continue;

    const mediator = SHENG_NEXT[a]; // a → (泄)mediator → (生)b
    const gain = Math.round(pressure * 0.35); // 35% 정도 배분 (튜닝 가능)

    if (gain > 0) {
      s[mediator] += gain;
      reasons.get(mediator)?.push(`통관: ${a}克${b} 완화(→${mediator})`);
    }
  }

  return s;
}

function scoreByeongYak(
  elemScore: Record<Element, number>,
  reasons: Map<Element, string[]>,
): Record<Element, number> {
  const s: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const entries = Object.entries(elemScore) as Array<[Element, number]>;
  const minVal = Math.min(...entries.map(([, v]) => v));
  const nearZero = entries.filter(([, v]) => v <= Math.max(6, minVal));

  for (const [el] of nearZero) {
    s[el] += 12;
    reasons.get(el)?.push("병약: 결핍 원소 보충");
  }
  return s;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 메인: 용신 계산
 * ──────────────────────────────────────────────────────────────────────────── */

export function computeYongshin(
  pillars: string[],
  tenGodTotals?: PowerData[],   // computePowerDataDetailed(...).totals
): YongshinResult {
  const dEl = dayElement(pillars);
  const mb  = monthBranch(pillars);
  const elemScore = lightElementScore(pillars);

  // overallPct: 십성 totals가 있으면 그것으로, 없으면 원소 근사
  let overallPct = overallFromTenGod(tenGodTotals);
  if (overallPct == null) {
    if (!dEl) overallPct = 50;
    else {
      const peer = dEl;
      const resource = SHENG_PREV[dEl];
      const sumAll = (Object.values(elemScore).reduce((a, b) => a + b, 0)) || 1;
      const est = ((elemScore[peer] ?? 0) + (elemScore[resource] ?? 0)) / sumAll * 100;
      overallPct = clamp01(est);
    }
  }

  const band = getBand(overallPct!);

  // 스코어 집계용
  const score: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const reasons = new Map<Element, string[]>(
    (["목", "화", "토", "금", "수"] as Element[]).map(k => [k, []]),
  );

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

  // === 4.5) 밸런스 우선 레이어 (Neutral zone 중심) =========================
  const prim = primaryOfDay(dEl);
  // 십성 합계 맵 (없으면 0)
  const tgMap: Record<TenGod, number> = { 비겁:0, 식상:0, 재성:0, 관성:0, 인성:0 };
  if (Array.isArray(tenGodTotals)) {
    for (const t of tenGodTotals) {
      tgMap[t.name] = t.value;
    }
  }

  const isNeutral = overallPct! >= 45 && overallPct! <= 55; // 중화권
  if (isNeutral && prim) {
    // 관성이 유독 강한가? (예: 30 이상이거나 타 대분류 대비 5 이상 우위)
    const officerHeavy =
      tgMap["관성"] >= 30 ||
      tgMap["관성"] >= Math.max(tgMap["비겁"], tgMap["식상"], tgMap["재성"], tgMap["인성"]) + 5;

    if (overallPct! <= 50) {
      // 약측 중화 → 인성 > 비겁 > 식상 > 재성 > 관성
      score[prim.resource] += 14; reasons.get(prim.resource)?.push("밸런스: 중화-약측 → 인성 우선");
      score[prim.peer]     += 10; reasons.get(prim.peer    )?.push("밸런스: 중화-약측 → 비겁 보강");
      score[prim.leak]     +=  6; reasons.get(prim.leak    )?.push("밸런스: 중화-약측 → 식상 보조");
      score[prim.wealth]   +=  3; reasons.get(prim.wealth  )?.push("밸런스: 중화-약측 → 재성 소량");
      // 관성 과다 억제
      if (officerHeavy && prim.officer) {
        score[prim.officer] = Math.round(score[prim.officer] * 0.80 * 10) / 10;
        reasons.get(prim.officer)?.push("밸런스: 관성 과다 → 감점(중화)");
      }
    } else {
      // 강측 중화 → 식상 > 재성 > 관성 > 인성 > 비겁
      score[prim.leak]     += 14; reasons.get(prim.leak   )?.push("밸런스: 중화-강측 → 식상 우선");
      score[prim.wealth]   += 10; reasons.get(prim.wealth )?.push("밸런스: 중화-강측 → 재성 보조");
      if (prim.officer) {
        score[prim.officer] += 6; reasons.get(prim.officer)?.push("밸런스: 중화-강측 → 관성 완충");
      }
      score[prim.resource] +=  3; reasons.get(prim.resource)?.push("밸런스: 중화-강측 → 인성 소량");
      // 강측에서는 비겁 추가 가점 없음(후순위)
    }

    // (요청) 토일간 + 관성 과다일 때, 원하는 정렬(화 > 토 > 금 > 수 > 목) 더 확실히
    if (dEl === "토" && overallPct! <= 50 && officerHeavy) {
      // 화(인성) 추가, 목(관성) 추가 감점
      score["화"] += 4;  reasons.get("화")?.push("밸런스: 토일간·관성강 → 화(인성) 추가 가점");
      score["목"]  = Math.round(score["목"] * 0.90 * 10) / 10;
      reasons.get("목")?.push("밸런스: 토일간·관성강 → 목(관성) 추가 감점");
    }
  }

  // 십성 힌트
  const tenHints: Record<Element, TenGod[]> = {
    목: [], 화: [], 토: [], 금: [], 수: [],
  };
  if (dEl) {
    const leak    = SHENG_NEXT[dEl];          // 식상
    const wealth  = KE[dEl];                  // 재성
    const officer = findOfficer(dEl);         // 관성
    const peer    = dEl;                      // 비겁
    const resource= SHENG_PREV[dEl];          // 인성

    tenHints[leak].push("식상");
    tenHints[wealth].push("재성");
    tenHints[officer].push("관성");
    tenHints[peer].push("비겁");
    tenHints[resource].push("인성");
  }

  // 최종 후보 배열
  const ordered: YongshinCandidate[] = (Object.keys(score) as Element[])
    .map(el => ({
      element: el,
      score: Math.round(score[el] * 10) / 10,
      via: collectVia(el, scoreChoHu(mb, new Map<Element, string[]>()), scoreTongGwan(elemScore, new Map<Element, string[]>()), scoreByeongYak(elemScore, new Map<Element, string[]>())),
      reasons: (reasons.get(el) ?? []).slice(),
      tenGodHints: tenHints[el],
    }))
    .sort((a, b) => b.score - a.score);

  // 대표 타입 결정
  const chosenType = chooseType(band, scoreChoHu(mb, new Map<Element, string[]>()), scoreTongGwan(elemScore, new Map<Element, string[]>()), scoreByeongYak(elemScore, new Map<Element, string[]>()));

  // debug.tenGodTotals를 타입 안전하게 구성
  const initTenGods: Record<TenGod, number> = {
    비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0,
  };
  const tgTotals: Record<TenGod, number> | undefined =
    tenGodTotals
      ? tenGodTotals.reduce((acc, t) => {
          acc[t.name] = t.value;
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

  const sum = (x: Record<Element, number>) =>
    Object.values(x).reduce((a, b) => a + b, 0);

  const c2 = sum(sChoHu);
  const c3 = sum(sTong);
  const c4 = sum(sBy);

  if (c2 > Math.max(c3, c4)) return "조후";
  if (c3 >= c4) return "통관";
  return "병약";
}

export default computeYongshin;
