// features/AnalysisReport/logic/shinsal/core/labels.ts
import type { PosIndex, Source } from "../types";
import { idx, posKo } from "./pos";

export const srcKo = (s: Source): "대운" | "세운" | "월운" | "일운" =>
  s === "dae" ? "대운" : s === "se" ? "세운" : s === "wol" ? "월운" : "일운";

// (원국) 일간 × (지지 위치)
export const labelSB_at = (tag: string, atPos: PosIndex) => `#일간X${posKo(atPos)}_${tag}`;

// (원국) 위치 조합
export const labelPair_at = (tag: string, p1: PosIndex, p2: PosIndex) =>
  p1 === idx.month && p2 === idx.day
    ? `#월주X일주_${tag}`
    : p1 === idx.year && p2 === idx.month
      ? `#연주X월주_${tag}`
      : p1 === idx.year && p2 === idx.day
        ? `#연주X일주_${tag}`
        : p1 === idx.month && p2 === idx.hour
          ? `#월주X시주_${tag}`
          : p1 === idx.day && p2 === idx.hour
            ? `#일주X시주_${tag}`
            : `#${posKo(p1)}X${posKo(p2)}_${tag}`;

export const labelPos_at = (tag: string, atPos: PosIndex) => `#${posKo(atPos)}_${tag}`;

export const labelMonth_withPos = (tag: string, natalPos: PosIndex) => `#월주X${posKo(natalPos)}_${tag}`;

export const labelVoid_at = (basis: "day" | "year", atPos: PosIndex) =>
  `#공망(${basis === "day" ? "일" : "연"}공망)X${posKo(atPos)}_공망`;

export const labelIlju = (tag: string) => `#일주_${tag}`;

// (운) 대운/세운/월운/일운 라벨
export const labelLuck_SB = (tag: string, src: Source) => `#일간X${srcKo(src)}_${tag}`;
export const labelLuck_Month = (tag: string, src: Source) => `#월주X${srcKo(src)}_${tag}`;
export const labelLuck_SrcWithPos = (tag: string, src: Source, natPos: PosIndex) =>
  `#${posKo(natPos)}X${srcKo(src)}_${tag}`;
export const labelLuck_Void = (src: Source, basis: "day" | "year") =>
  `#공망(${basis === "day" ? "일" : "연"}공망)_${srcKo(src)}_공망`;
export const labelLuck_Samjae = (src: Source, basis: "day" | "year") =>
  `#삼재(${basis === "day" ? "일" : "연"}기준)X${srcKo(src)}_삼재`;
export const labelLuck_SangJoe = (src: Source, kind: "상문살" | "조객살") => `#연주X${srcKo(src)}_${kind}`;
