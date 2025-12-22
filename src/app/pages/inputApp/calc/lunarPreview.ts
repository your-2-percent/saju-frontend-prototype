import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import type { CalendarType } from "@/shared/type";

export function buildLunarPreview(calendarType?: CalendarType, birthDay?: string) {
  if (calendarType !== "lunar") return null;
  if (!birthDay || birthDay.length !== 8) return null;
  try {
    const y = Number(birthDay.slice(0, 4));
    const m = Number(birthDay.slice(4, 6));
    const d = Number(birthDay.slice(6, 8));
    const out = lunarToSolarStrict(y, m, d);
    return `양력 ${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, "0")}-${String(
      out.getDate()
    ).padStart(2, "0")}`;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : undefined;
    return `변환 실패${msg ? `: ${msg}` : ""}`;
  }
}
