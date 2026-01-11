import type { Element } from "../utils/types";
import type { BasisBand } from "./types";

export const ELEMENTS: Element[] = ["목", "화", "토", "금", "수"];
export const ZERO_ELEMENT_SCORE: Record<Element, number> = {
  목: 0, 화: 0, 토: 0, 금: 0, 수: 0,
};

export const BANDS: Array<{ name: BasisBand; min: number; max: number }> = [
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
export const MONTH_BRANCH_CLIMATE: Record<
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

export const STRONG_THRESHOLD_PCT = 24; // 24%↑ 과다

// 작을수록 강한 패널티
export const STRONG_STEPS: Array<[minStrength: number, factor: number]> = [
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

export const TARGET_PCT = 20;
