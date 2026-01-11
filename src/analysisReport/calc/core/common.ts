// analysisReport/core/common.ts - 리포트 형태(그래프/태그/요약) 코어 계산식
import type { Element } from "../utils/types";
import { BRANCH_H2K, STEM_H2K } from "@/shared/domain/ganji/const";
import { isYinUnified, toDisplayChar } from "@/shared/domain/ganji/convert";
import { normalizeGZ } from "@/analysisReport/calc/logic/relations/normalize"

export const STEM_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(STEM_H2K).map(([h,k]) => [k,h]));
export const BRANCH_K2H: Record<string, string> =
  Object.fromEntries(Object.entries(BRANCH_H2K).map(([h,k]) => [k,h]));
export { STEM_H2K, BRANCH_H2K };

/** 천간/지지 → 오행 */
export const STEM_TO_ELEMENT: Record<string, Element> = {
  갑:"목", 을:"목", 병:"화", 정:"화", 무:"토", 기:"토",
  경:"금", 신:"금", 임:"수", 계:"수",
};
export const BRANCH_MAIN_ELEMENT: Record<string, Element> = {
  자:"수", 축:"토", 인:"목", 묘:"목", 진:"토", 사:"화",
  오:"화", 미:"토", 신:"금", 유:"금", 술:"토", 해:"수",
};


export function normalizePillars(input?: string[] | null): string[] {
  const arr = Array.isArray(input) ? input.slice(0, 4) : [];
  while (arr.length < 4) arr.push("");
  return arr.map(normalizeGZ);
}
export function isValidPillars(p: string[]): p is [string,string,string,string] {
  return p.length === 4 && p.every((x) => x.length === 2);
}

export { toDisplayChar, isYinUnified };

/** 문자열 → 오행 라벨 정규화 */
export function normElLabel(raw?: unknown): Element | null {
  if (typeof raw !== "string") return null;
  if (/목|木|wood/i.test(raw)) return "목";
  if (/화|火|fire/i.test(raw)) return "화";
  if (/토|土|earth/i.test(raw)) return "토";
  if (/금|金|metal/i.test(raw)) return "금";
  if (/수|水|water/i.test(raw)) return "수";
  return null;
}

/** 안전 타입 체크 */
export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
