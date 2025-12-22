// shared/billing/entitlements.ts
import { canAddMyeongSik, getPlanCapabilities } from "@/shared/lib/plan/planCapabilities";

export type PlanTier =
  | "PROMPT_HIDDEN"
  | "PROMPT_LOCKED"
  | "PROMPT_FULL";

export type Entitlements = {
  canAddMyeongsik: boolean;
  canUseMultiMode: boolean;
  canUseLuckTabs: boolean;
  canUseAllPrompts: boolean;
};

export type EntitlementContext = {
  planTier: PlanTier;
  myeongsikCount: number;
};

export function getEntitlements(ctx: EntitlementContext): Entitlements {
  const { planTier, myeongsikCount } = ctx;
  const caps = getPlanCapabilities(planTier);

  return {
    canAddMyeongsik: canAddMyeongSik(myeongsikCount, caps.maxMyeongsik),
    canUseMultiMode: caps.canUseMultiMode,
    canUseLuckTabs: caps.canUseLuckTabs,
    canUseAllPrompts: caps.canUseAllPrompts,
  };
}
