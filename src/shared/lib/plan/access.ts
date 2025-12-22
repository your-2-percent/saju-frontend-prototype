import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { parsePlanTier } from "@/shared/lib/plan/planTier";
import type { PlanTier } from "@/shared/billing/entitlements";

export function getEffectivePlanTier(userId?: string | null): PlanTier {
  if (!userId) return "PROMPT_LOCKED";

  const s = useEntitlementsStore.getState();

  if (!s.loaded) {
    console.warn("[plan] entitlements not loaded yet");
    return "PROMPT_LOCKED";
  }

  if (s.userId !== userId) {
    console.warn("[plan] user mismatch", s.userId, userId);
    return "PROMPT_LOCKED";
  }

  return parsePlanTier(s.plan ?? null);
}
