import { formatLocalHM } from "@/shared/utils";

export function isUnknownTime(time?: string | null): boolean {
  if (!time) return true;
  if (time === "모름") return true;
  return !/^\d{4}$/.test(time);
}

export function formatBirthDisplay(yyyymmdd?: string, hhmm?: string): string {
  if (!yyyymmdd || !/^\d{8}$/.test(yyyymmdd)) return "";
  const y = yyyymmdd.slice(0, 4);
  const m = yyyymmdd.slice(4, 6);
  const d = yyyymmdd.slice(6, 8);
  const date = `${y}-${m}-${d}`;
  if (!hhmm || isUnknownTime(hhmm)) return date;
  return `${date} ${hhmm.slice(0, 2)}:${hhmm.slice(2, 4)}`;
}

export function formatCorrectedDisplay(
  correctedLocal: string | null | undefined,
  corrected: Date,
  unknownTime: boolean
): string {
  if (unknownTime) return "모름";
  const local = (correctedLocal ?? "").trim();
  if (local) return local;
  const dt = corrected instanceof Date ? corrected : new Date(corrected);
  if (Number.isNaN(dt.getTime())) return "모름";
  return formatLocalHM(dt);
}
