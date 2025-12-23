// src/shared/lib/plan/access.ts
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import type { PlanTier } from "@/shared/billing/entitlements";

export function getEffectivePlanTier(userId?: string | null): PlanTier {
  if (!userId) return "FREE";

  const s = useEntitlementsStore.getState();

  if (!s.loaded) {
    console.warn("[plan] entitlements not loaded yet");
    return "FREE";
  }

  if (s.userId !== userId) {
    console.warn("[plan] user mismatch", s.userId, userId);
    return "FREE";
  }

  return s.plan;
}
