// features/prompt/formatBirth.ts
import type { MyeongSik } from "@/shared/lib/storage";
import { ensureSolarBirthDay } from "./promptCore";

export function formatBirthForPrompt(ms: MyeongSik, isUnknownTime: boolean): string {
  const ensured = ensureSolarBirthDay(ms);
  const rawDay = ensured.birthDay ?? "";
  const year = rawDay.slice(0, 4);
  const month = rawDay.slice(4, 6);
  const day = rawDay.slice(6, 8);

  let correctedTime = "";
  if (ensured.corrected instanceof Date && !Number.isNaN(ensured.corrected.getTime())) {
    const hh = String(ensured.corrected.getHours()).padStart(2, "0");
    const mm = String(ensured.corrected.getMinutes()).padStart(2, "0");
    correctedTime = isUnknownTime ? "모름" : `${hh}:${mm}`;
  }

  return `${year}년 ${month}월 ${day}일 보정시 ${correctedTime}`;
}
