// features/AnalysisReport/logic/shinGang.ts
import type { Pillars4 } from "./relations";
import { normalizeGZ } from "./relations";
import { toPercent, elementScoreFromPillars } from "../logic/blend";
import { computeDeukFlags, type CriteriaMode } from "../utils/strength";

export type Category = "극약" | "태약" | "신약" | "중화신약" | "중화" | "중화신강" | "태강" | "극태강";

export const BANDS: Array<{ name: Category; min: number; max: number }> = [
  { name: "극약",     min: 0,  max: 10 },
  { name: "태약",     min: 10, max: 20 },
  { name: "신약",     min: 20, max: 35 },
  { name: "중화신약", min: 35, max: 45 },
  { name: "중화",     min: 45, max: 55 },
  { name: "중화신강", min: 55, max: 65 },
  { name: "태강",     min: 65, max: 80 },
  { name: "극태강",   min: 80, max: 100.0001 },
];

type Element = "목" | "화" | "토" | "금" | "수";
const STEM_TO_ELEMENT: Record<string, Element> = {
  갑:"목", 을:"목", 병:"화", 정:"화", 무:"토", 기:"토", 경:"금", 신:"금", 임:"수", 계:"수",
};
//const gzStem = (gz: string) => (gz && gz.length >= 1 ? gz[0]! : "");

const round1 = (n: number) => Math.round(n * 10) / 10;

function simpleLabel(pct: number): "신약" | "중화" | "신강" {
  if (pct < 45) return "신약";
  if (pct > 55) return "신강";
  return "중화";
}

export function judgeShinGangFromPillars(natal: Pillars4, opts?: {
  criteriaMode?: CriteriaMode;           // 득령/득지 기준: "classic" | "modern"
  elementScoreRaw?: Record<Element, number>; // 있으면 이 값으로 퍼센트 계산 (없으면 원국 간단 추산)
}) {
  const pillarsKo = (natal ?? []).slice(0, 4).map(normalizeGZ);
  const dayS = pillarsKo[2]?.charAt(0) ?? "";
  const dayEl = STEM_TO_ELEMENT[dayS as keyof typeof STEM_TO_ELEMENT];

  // 1) 오행 퍼센트 (원국 기준)
  const score = opts?.elementScoreRaw ?? elementScoreFromPillars(pillarsKo);
  const pct = toPercent(score);
  const dayPct = dayEl ? pct[dayEl] : 0;

  // 2) 밴드/간단 라벨
  const band = BANDS.find(b => dayPct >= b.min && dayPct < b.max)?.name ?? "중화";
  const label = simpleLabel(dayPct);

  // 3) 득령/득지/득세 (득지는 '일간 글자 뿌리' 기준으로만)
  const { flags } = computeDeukFlags(pillarsKo, score);

  const reasons: string[] = [];
  if (flags.비겁.령) reasons.push("비겁 득령(+)");
  if (flags.비겁.지) reasons.push("비겁 득지(+)");
  if (flags.비겁.세) reasons.push("비겁 득세(+)");

  return {
    index: round1(dayPct),       // 일간 오행 비중(%)
    label,                       // 신약/중화/신강
    band,                        // 극약~극태강 밴드 라벨
    reasons,                     // 근거(양성만)
  };
}
