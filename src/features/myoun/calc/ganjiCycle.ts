﻿import type { Direction } from "@/shared/type";
import { 천간, 지지 } from "@/shared/domain/ganji/const";

const SIXTY: readonly string[] = (() => {
  const arr: string[] = [];
  for (let i = 0; i < 60; i += 1) arr.push(`${천간[i % 10]}${지지[i % 12]}`);
  return arr;
})();

const gzIndex = (gz: string): number => {
  const i = SIXTY.indexOf(gz);
  if (i < 0) throw new Error(`Unknown 간지: ${gz}`);
  return i;
};

export const stepGZ = (gz: string, dir: Direction, step = 1): string => {
  const i = gzIndex(gz);
  const d = dir === "forward" ? step : -step;
  return SIXTY[(i + d + 60 * 1000) % 60];
};
