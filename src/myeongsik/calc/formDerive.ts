import type { MyeongSik } from "@/shared/lib/storage";
import type { CalendarType } from "@/shared/type";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import type { FormState } from "../model/types";

export function buildInitialForm(item: MyeongSik): FormState {
  return {
    ...item,
    calendarType: (item.calendarType as CalendarType) ?? "solar",
  };
}

export function getUnknownTime(item: MyeongSik): boolean {
  return !item.birthTime || item.birthTime === "모름";
}

export function getUnknownPlace(item: MyeongSik): boolean {
  return !item.birthPlace || item.birthPlace.name === "모름";
}

export function formatLunarPreview(birthDay?: string, calendarType?: CalendarType): string | null {
  if (calendarType !== "lunar") return null;
  if (!birthDay || birthDay.length !== 8) return null;
  try {
    const y = Number(birthDay.slice(0, 4));
    const m = Number(birthDay.slice(4, 6));
    const d = Number(birthDay.slice(6, 8));
    const out = lunarToSolarStrict(y, m, d);
    const mm = String(out.getMonth() + 1).padStart(2, "0");
    const dd = String(out.getDate()).padStart(2, "0");
    return `→ 양력 ${out.getFullYear()}-${mm}-${dd}`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : undefined;
    return `→ 변환 실패${msg ? `: ${msg}` : ""}`;
  }
}
