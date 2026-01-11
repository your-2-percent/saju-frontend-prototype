import type { DayBoundaryRule } from "@/shared/type";

const RULES = ["자시", "조자시/야자시", "인시"] as const;

export const DEFAULT_RULE = "조자시/야자시" as DayBoundaryRule;

export function normalizeDayBoundaryRule(
  value?: string | null,
  fallback?: DayBoundaryRule
): DayBoundaryRule {
  if (value && (RULES as readonly string[]).includes(value)) {
    return value as DayBoundaryRule;
  }
  if (fallback && (RULES as readonly string[]).includes(fallback as string)) {
    return fallback;
  }
  return DEFAULT_RULE;
}

export function isInsiRule(value?: string | null): boolean {
  return value === "인시";
}

export function normalizeSinsalBase(value?: string | null): "일지" | "연지" {
  return value === "연지" ? "연지" : "일지";
}

export function resolveExposureLevel(exposure?: string | null): number {
  switch (exposure) {
    case "대운":
      return 1;
    case "세운":
      return 2;
    case "월운":
      return 3;
    case "원국":
    default:
      return 0;
  }
}
