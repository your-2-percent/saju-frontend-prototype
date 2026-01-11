import type { Element, TenGod, PowerData } from "../utils/types";
import { SHENG_NEXT, SHENG_PREV, KE, KE_REV } from "../powerDataPrimitives";
import { ELEMENTS, STRONG_THRESHOLD_PCT, ZERO_ELEMENT_SCORE } from "./tables";
import type { BasisBand, YongshinCandidate, YongshinResult, YongshinType } from "./types";
import {
  clamp,
  dayElement,
  getBand,
  lightElementScore,
  monthBranch,
  normalizePct,
  overallFromTenGod,
  primaryOfDay,
  roleBiasPoints,
  strongPenaltyFactor,
} from "./helpers";
import {
  scoreByeongYak,
  scoreChoHu,
  scoreEokbu,
  scoreTongGwan,
} from "./scorers";

const createReasonsMap = () =>
  new Map<Element, string[]>(ELEMENTS.map((el) => [el, []]));

export function computeYongshin(
  pillars: string[],
  tenGodTotals?: PowerData[],
): YongshinResult {
  const dEl = dayElement(pillars);
  const mb = monthBranch(pillars);
  const elemScore = lightElementScore(pillars);
  const elemPct = normalizePct(elemScore);

  let overallPct = overallFromTenGod(tenGodTotals);
  if (overallPct == null) {
    if (!dEl) overallPct = 50;
    else {
      const peer = dEl, resource = SHENG_PREV[dEl];
      const sumAll = (Object.values(elemScore).reduce((a, b) => a + b, 0)) || 1;
      overallPct = Math.min(100, Math.max(0, ((elemScore[peer] ?? 0) + (elemScore[resource] ?? 0)) / sumAll * 100));
    }
  }
  const band = getBand(overallPct!);

  const score: Record<Element, number> = { ...ZERO_ELEMENT_SCORE };
  const reasons = createReasonsMap();

  // 1) 억부
  if (dEl) {
    const s1 = scoreEokbu(dEl, band, reasons);
    ELEMENTS.forEach((k) => { score[k] += s1[k] ?? 0; });
  }
  // 2) 조후
  const s2 = scoreChoHu(mb, reasons);
  ELEMENTS.forEach((k) => { score[k] += s2[k] ?? 0; });
  // 3) 통관
  const s3 = scoreTongGwan(elemScore, reasons);
  ELEMENTS.forEach((k) => { score[k] += s3[k] ?? 0; });
  // 4) 병약
  const s4 = scoreByeongYak(elemScore, reasons);
  ELEMENTS.forEach((k) => { score[k] += s4[k] ?? 0; });

  // 4.5) 중화권 보정
  const prim = primaryOfDay(dEl);
  const tgMap: Record<TenGod, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  if (Array.isArray(tenGodTotals)) {
    for (const t of tenGodTotals) {
      tgMap[t.name as TenGod] = t.value;
    }
  }

  const isNeutral = overallPct! >= 45 && overallPct! <= 55;
  if (isNeutral && prim) {
    const officerHeavy =
      tgMap["관성"] >= 30
      || tgMap["관성"] >= Math.max(tgMap["비겁"], tgMap["식상"], tgMap["재성"], tgMap["인성"]) + 5;
    if (overallPct! <= 50) {
      score[prim.resource] += 14; reasons.get(prim.resource)?.push("밸런스: 중화-약측");
      score[prim.peer] += 10; reasons.get(prim.peer)?.push("밸런스: 중화-약측");
      score[prim.leak] += 6; reasons.get(prim.leak)?.push("밸런스: 중화-약측");
      score[prim.wealth] += 3; reasons.get(prim.wealth)?.push("밸런스: 중화-약측");
      if (officerHeavy) {
        score[prim.officer] = Math.round(score[prim.officer] * 0.80 * 10) / 10;
        reasons.get(prim.officer)?.push("밸런스: 관성 과다 억제");
      }
    } else {
      score[prim.leak] += 14; reasons.get(prim.leak)?.push("밸런스: 중화-강측");
      score[prim.wealth] += 10; reasons.get(prim.wealth)?.push("밸런스: 중화-강측");
      score[prim.officer] += 6; reasons.get(prim.officer)?.push("밸런스: 중화-강측");
      score[prim.resource] += 3; reasons.get(prim.resource)?.push("밸런스: 중화-강측");
    }
  }

  // 4.6) 동적 역할가중(간소 태그)
  ELEMENTS.forEach((el) => {
    const delta = roleBiasPoints(dEl, overallPct!, el, elemPct);
    score[el] = clamp(Math.round((score[el] + delta) * 10) / 10, 0, 999);
  });

  // 4.7) 과다 패널티 (신약+일간오행 예외)
  const isWeakSide = overallPct! < 50;
  ELEMENTS.forEach((el) => {
    const pct = elemPct[el] ?? 0;
    const skip = isWeakSide && dEl === el;
    if (pct >= STRONG_THRESHOLD_PCT && !skip) {
      const f = strongPenaltyFactor(pct);
      score[el] = Math.round(score[el] * f * 10) / 10;
      const extra = Math.min(14, Math.max(0, Math.ceil((pct - STRONG_THRESHOLD_PCT) * 0.5))); // 최대 -14
      if (extra > 0) score[el] = clamp(score[el] - extra, 0, 999);
      reasons.get(el)?.push("강과 패널티(강화)");
    }
  });

  // 십성 힌트
  const tenHints: Record<Element, TenGod[]> = { 목: [], 화: [], 토: [], 금: [], 수: [] };
  if (dEl) {
    const leak = SHENG_NEXT[dEl];
    const wealth = KE[dEl];
    const officer = KE_REV[dEl];
    const peer = dEl;
    const resource = SHENG_PREV[dEl];
    tenHints[leak].push("식상");
    tenHints[wealth].push("재성");
    tenHints[officer].push("관성");
    tenHints[peer].push("비겁");
    tenHints[resource].push("인성");
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

  const baseViaChoHu = scoreChoHu(mb, createReasonsMap());
  const baseViaTong = scoreTongGwan(elemScore, createReasonsMap());
  const baseViaBy = scoreByeongYak(elemScore, createReasonsMap());

  const ordered: YongshinCandidate[] = ELEMENTS
    .map((el) => ({
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
  sTong: Record<Element, number>,
  sBy: Record<Element, number>,
): YongshinType[] {
  const via: YongshinType[] = [];
  if ((sChoHu[el] ?? 0) > 0) via.push("조후");
  if ((sTong[el] ?? 0) > 0) via.push("통관");
  if ((sBy[el] ?? 0) > 0) via.push("병약");
  if (via.length === 0) via.push("억부");
  return via;
}

function chooseType(
  band: BasisBand,
  sChoHu: Record<Element, number>,
  sTong: Record<Element, number>,
  sBy: Record<Element, number>,
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
