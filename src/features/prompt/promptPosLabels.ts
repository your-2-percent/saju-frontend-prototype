// features/prompt/promptPosLabels.ts

import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/analysisReport/calc/logic/relations";

export type JuLabel = "연" | "월" | "일" | "시";

export function isUnknownTime(ms: MyeongSik): boolean {
  return !ms.birthTime || ms.birthTime === "모름";
}

/**
 * 출생시간 모름이면 무조건 시주 제외
 */
export function getActivePosLabels(_ms: MyeongSik, natal: Pillars4): JuLabel[] {
  if (natal[3]) return ["연", "월", "일", "시"];
  return ["연", "월", "일"];
}

export function compactNatalForLabels(posLabels: readonly JuLabel[], natal: Pillars4): string[] {
  return posLabels.map((_, idx) => natal[idx] ?? "");
}
