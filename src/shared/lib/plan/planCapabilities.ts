import type { PlanTier } from "@/shared/billing/entitlements";

export type MaxMyeongSik = number | null; // null = unlimited

export type PlanCapabilities = {
  maxMyeongsik: MaxMyeongSik;
  canManageMyeongsik: boolean;
  canUseLuckTabs: boolean;
  canUseMultiMode: boolean;
  canUseAllPrompts: boolean;
  promptAccess: "hidden" | "locked" | "full";
};

export function getPlanCapabilities(tier: PlanTier): PlanCapabilities {
  switch (tier) {
    case "PROMPT_HIDDEN":
      return {
        maxMyeongsik: null,
        canManageMyeongsik: true,
        canUseLuckTabs: false,
        canUseMultiMode: false,
        canUseAllPrompts: false,
        promptAccess: "hidden",
      };

    case "PROMPT_LOCKED":
      return {
        maxMyeongsik: null,
        canManageMyeongsik: true,
        canUseLuckTabs: false,
        canUseMultiMode: false,
        canUseAllPrompts: false,
        promptAccess: "locked",
      };

    case "PROMPT_FULL":
      return {
        maxMyeongsik: null,
        canManageMyeongsik: true,
        canUseLuckTabs: true,
        canUseMultiMode: true,
        canUseAllPrompts: true,
        promptAccess: "full",
      };
  }
}

export function canAddMyeongSik(currentCount: number, max: MaxMyeongSik): boolean {
  if (max === null) return true;
  return currentCount < max;
}
