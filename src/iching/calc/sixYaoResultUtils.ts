import type { PeriodPayload } from "@/iching/calc/period";

export function safeJSONStringify(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return "";
  }
}

export function pickPeriodPayload(viewMeta?: Record<string, unknown>): PeriodPayload | null {
  const v = viewMeta?.period;
  if (!v || typeof v !== "object") return null;
  const tab = (v as { tab?: unknown }).tab;
  const baseDateYMD = (v as { baseDateYMD?: unknown }).baseDateYMD;
  if (tab !== "seun" && tab !== "wolun" && tab !== "ilun") return null;
  if (typeof baseDateYMD !== "string") return null;
  return v as PeriodPayload;
}
