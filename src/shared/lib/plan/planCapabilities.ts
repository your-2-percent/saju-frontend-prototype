// src/shared/lib/plan/planCapabilities.ts
import type { PlanTier } from "@/shared/billing/entitlements";

export type PlanCapabilities = {
  maxMyeongsik: number | null; // null = 무제한
  canManageMyeongsik: boolean;
  canUseLuckTabs: boolean;
  canUseMultiMode: boolean;
  canUseAllPrompts: boolean;

  // ✅ 새 정책
  canUseAdvancedReport: boolean; // 격국/물상론/용신추천
  canRemoveAds: boolean; // Pro만 true
};

export function getPlanCapabilities(plan: PlanTier): PlanCapabilities {
  switch (plan) {
    case "FREE":
      return {
        maxMyeongsik: 1,
        canManageMyeongsik: true,
        canUseLuckTabs: true,
        canUseMultiMode: true,

        // ✅ Free 제한
        canUseAllPrompts: false,
        canUseAdvancedReport: false,
        canRemoveAds: false,
      };

    case "BASIC":
      return {
        maxMyeongsik: 9999,
        canManageMyeongsik: true,
        canUseLuckTabs: true,
        canUseMultiMode: true,

        canUseAllPrompts: true,
        canUseAdvancedReport: true,
        canRemoveAds: false, // ✅ 광고 ON
      };

    case "PRO":
      return {
        maxMyeongsik: null, // 무제한 취급
        canManageMyeongsik: true,
        canUseLuckTabs: true,
        canUseMultiMode: true,

        canUseAllPrompts: true,
        canUseAdvancedReport: true,
        canRemoveAds: true, // ✅ 광고 OFF
      };
  }
}

export function canAddMyeongSik(currentCount: number, max: number | null): boolean {
  if (max === null) return true;
  return currentCount < max;
}
