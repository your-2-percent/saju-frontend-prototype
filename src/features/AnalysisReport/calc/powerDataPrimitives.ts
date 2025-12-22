import type { Element, TenGod } from "../utils/types";
import {
  STEM_TO_ELEMENT as STEM_TO_ELEMENT_BASE,
  BRANCH_MAIN_ELEMENT as BRANCH_MAIN_ELEMENT_BASE,
} from "../utils/hiddenStem";
import { STEM_H2K, BRANCH_H2K } from "@/shared/domain/간지/const";

/* =========================
 * 한자↔한글 보정
 * ========================= */
const STEM_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(STEM_H2K).map(([h, k]) => [k, h]));
const BRANCH_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(BRANCH_H2K).map(([h, k]) => [k, h]));

const toKoStem = (ch: string) => STEM_H2K[ch] ?? ch;
const toKoBranch = (ch: string) => BRANCH_H2K[ch] ?? ch;
export function toKoGZ(raw: string): string {
  if (!raw || raw.length < 2) return "";
  return `${toKoStem(raw[0]!)}` + `${toKoBranch(raw[1]!)}`;
}

/* =========================
 * 안전 게터 (한자/한글 둘 다 대응)
 * ========================= */
export function STEM_EL(s: string): Element | undefined {
  return (STEM_TO_ELEMENT_BASE as Record<string, Element>)[s]
    ?? (STEM_TO_ELEMENT_BASE as Record<string, Element>)[STEM_K2H[s] ?? ""];
}
export function BRANCH_EL(b: string): Element | undefined {
  return (BRANCH_MAIN_ELEMENT_BASE as Record<string, Element>)[b]
    ?? (BRANCH_MAIN_ELEMENT_BASE as Record<string, Element>)[BRANCH_K2H[b] ?? ""];
}

/* =========================
 * 자리 가중치(현대/고전)
 * ========================= */
export type PillarPos = "year" | "month" | "day" | "hour";
export const PILLAR_ORDER: PillarPos[] = ["year", "month", "day", "hour"];

export const WEIGHTS_MODERN: Record<PillarPos, { stem: number; branch: number }> = {
  year: { stem: 10, branch: 10 },
  month: { stem: 15, branch: 30 },
  day: { stem: 25, branch: 25 },
  hour: { stem: 15, branch: 15 },
};

export const WEIGHTS_CLASSIC: Record<PillarPos, { stem: number; branch: number }> = {
  year: { stem: 10, branch: 10 },
  month: { stem: 15, branch: 45 },
  day: { stem: 25, branch: 40 },
  hour: { stem: 15, branch: 12.5 },
};

/* =========================
 * 음양
 * ========================= */
export type YinYang = "양" | "음";
const YIN_STEMS = new Set(["을", "정", "기", "신", "계"]);
const BRANCH_YANG = new Set(["자", "인", "진", "오", "신", "술"]);
const BRANCH_INVERT = new Set(["사", "오", "자", "해"]); // 반전 유지

export const stemPolarity = (s: string): YinYang => (YIN_STEMS.has(s) ? "음" : "양");
export const branchPolarity = (b: string): YinYang => {
  const base: YinYang = BRANCH_YANG.has(b) ? "양" : "음";
  return BRANCH_INVERT.has(b) ? (base === "양" ? "음" : "양") : base;
};

/* =========================
 * 정규화(합 100, 정수) ? 표준 유틸
 * ========================= */
export function normalizeTo100Strict(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return values.map(() => 0);
  const pct = values.map((v) => (v * 100) / sum);
  const base = pct.map((v) => Math.floor(v + 0.5));
  const diff = 100 - base.reduce((a, b) => a + b, 0);
  if (diff === 0) return base;

  const order = pct
    .map((v, i) => ({ i, frac: v - Math.floor(v + 0.5) }))
    .sort((a, b) => b.frac - a.frac);

  const out = base.slice();
  if (diff > 0) {
    for (let k = 0; k < diff; k++) out[order[k]!.i] += 1;
  } else {
    for (let k = 0; k < -diff; k++) out[order[order.length - 1 - k]!.i] -= 1;
  }
  return out;
}

/* =========================
 * 투출 가중
 * ========================= */
export function projectionPercent(dist: 0 | 1 | 2, samePol: boolean): number {
  if (dist === 0) return samePol ? 1.0 : 0.8;
  if (dist === 1) return samePol ? 0.6 : 0.5;
  return samePol ? 0.3 : 0.2;
}

/* =========================
 * 상생/상극 + 십신↔오행 매핑
 * ========================= */
type StrengthLevel = "왕" | "상" | "휴" | "수" | "사";
export const LV_ADJ: Record<StrengthLevel, number> = { 왕: +0.15, 상: +0.10, 휴: -0.15, 수: -0.20, 사: -0.25 };

export const SHENG_NEXT: Record<Element, Element> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
export const SHENG_PREV: Record<Element, Element> = { 화: "목", 토: "화", 금: "토", 수: "금", 목: "수" };
export const KE: Record<Element, Element> = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
export const KE_REV: Record<Element, Element> = { 토: "목", 금: "화", 수: "토", 목: "금", 화: "수" };

export function relationLevel(me: Element, nb: Element): StrengthLevel {
  if (me === nb) return "왕";
  if (SHENG_NEXT[nb] === me) return "상";
  if (SHENG_NEXT[me] === nb) return "휴";
  if (KE[me] === nb) return "수";
  if (KE[nb] === me) return "사";
  return "휴";
}

/* =========================
 * 유틸
 * ========================= */
export const gzStem = (gz: string) => (gz && gz.length >= 1 ? gz[0]! : "");
export const gzBranch = (gz: string) => (gz && gz.length >= 2 ? gz[1]! : "");

/* =========================
 * 해밀턴(최대잔여) 배분: totalUnits(정수) 를 weights 비율로 분배
 * ========================= */
export function allocateByLargestRemainder(weights: number[], totalUnits: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum <= 0 || totalUnits <= 0) return new Array(weights.length).fill(0);

  const quotas = weights.map((w) => (w / sum) * totalUnits);
  const floors = quotas.map((q) => Math.floor(q));
  let rem = totalUnits - floors.reduce((a, b) => a + b, 0);

  const order = quotas
    .map((q, i) => ({ i, frac: q - Math.floor(q) }))
    .sort((a, b) => b.frac - a.frac);

  const out = floors.slice();
  for (let k = 0; k < order.length && rem > 0; k++) {
    out[order[k]!.i] += 1;
    rem -= 1;
  }
  return out;
}

/* =========================
 * 대분류 → 오행 역매핑 (외부 재사용 가능)
 * ========================= */
export function elementOfGodMajor(god: TenGod, dEl: Element): Element {
  switch (god) {
    case "비겁":
      return dEl;
    case "식상":
      return SHENG_NEXT[dEl];
    case "재성":
      return KE[dEl];
    case "관성":
      return KE_REV[dEl];
    case "인성":
      return SHENG_PREV[dEl];
    default:
      return dEl;
  }
}

/* =========================
 * 지지 → 본기 천간(한글/한자 키 모두 지원)
 * ========================= */
export const BRANCH_MAIN_STEM: Record<string, string> = {
  자: "계",
  축: "기",
  인: "갑",
  묘: "을",
  진: "무",
  사: "병",
  오: "정",
  미: "기",
  신: "경",
  유: "신",
  술: "무",
  해: "임",
  子: "계",
  丑: "기",
  寅: "갑",
  卯: "을",
  辰: "무",
  巳: "병",
  午: "정",
  未: "기",
  申: "경",
  酉: "신",
  戌: "무",
  亥: "임",
};
