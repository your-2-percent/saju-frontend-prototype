// shared/billing/entitlements.ts
import { canAddMyeongSik, getPlanCapabilities } from "@/shared/lib/plan/planCapabilities";

export type PlanTier = "FREE" | "BASIC" | "PRO";

export type Entitlements = {
  canAddMyeongsik: boolean;
  canUseMultiMode: boolean;
  canUseLuckTabs: boolean;
  canUseAllPrompts: boolean;

  // ✅ 새 멤버십 정책
  canUseAdvancedReport: boolean; // 격국/물상론/용신추천 묶음
  canRemoveAds: boolean; // Pro만 true
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
    canUseAdvancedReport: caps.canUseAdvancedReport,
    canRemoveAds: caps.canRemoveAds,
  };
}
