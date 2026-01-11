import type { Coin, LineDraw, LineValue, SajuContext, YinYang } from "@/iching/calc/ichingTypes";

export function isChanging(v: LineValue): boolean {
  return v === 6 || v === 9;
}

export function toYinYang(v: LineValue): YinYang {
  return v === 7 || v === 9 ? 1 : 0;
}

export function toChangedYinYang(v: LineValue): YinYang {
  if (v === 6) return 1;
  if (v === 9) return 0;
  return toYinYang(v);
}

export function lineLabel(v: LineValue): string {
  switch (v) {
    case 6:
      return "6(노음·변)";
    case 7:
      return "7(소양)";
    case 8:
      return "8(소음)";
    case 9:
      return "9(노양·변)";
    default:
      return String(v);
  }
}

export function cycleLine(v: LineValue): LineValue {
  if (v === 6) return 7;
  if (v === 7) return 8;
  if (v === 8) return 9;
  return 6;
}

/** 32-bit FNV-1a */
export function fnv1a32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h >>> 0;
}

/** Mulberry32 PRNG */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

export function safeNowISO(): string {
  return new Date().toISOString();
}

export function makeId(): string {
  const t = Date.now().toString(36);
  const r = Math.floor(Math.random() * 1e9).toString(36);
  return `ich_${t}_${r}`;
}

export function getChangingIndexes(linesBottomUp: readonly LineDraw[]): number[] {
  const idx: number[] = [];
  for (let i = 0; i < linesBottomUp.length; i += 1) {
    if (isChanging(linesBottomUp[i].value)) idx.push(i + 1);
  }
  return idx;
}

export function coinTossLine(rng: () => number): LineDraw {
  const coin = (): Coin => (rng() < 0.5 ? 2 : 3);
  const c1 = coin();
  const c2 = coin();
  const c3 = coin();
  const sum = c1 + c2 + c3;
  const value: LineValue = sum === 6 ? 6 : sum === 7 ? 7 : sum === 8 ? 8 : 9;
  return { value, source: "coin", coins: [c1, c2, c3] as const };
}

export function buildStableSajuSeedPart(saju?: SajuContext | null): string {
  if (!saju) return "";
  const parts = [
    saju.myeongSikId ? `id=${saju.myeongSikId}` : "",
    saju.pillarsText ? `pillars=${saju.pillarsText}` : "",
    saju.birthISO ? `birth=${saju.birthISO}` : "",
    saju.tz ? `tz=${saju.tz}` : "",
    saju.luck?.daeun ? `daeun=${saju.luck.daeun}` : "",
    saju.luck?.seun ? `seun=${saju.luck.seun}` : "",
    saju.luck?.wolun ? `wolun=${saju.luck.wolun}` : "",
    saju.luck?.ilun ? `ilun=${saju.luck.ilun}` : "",
  ].filter(Boolean);
  return parts.join("|");
}
