// shared/billing/entitlements.ts
import { canAddMyeongSik, getPlanCapabilities } from "@/shared/lib/plan/planCapabilities";

export type PlanTier = "FREE" | "BASIC" | "PRO";

// ---------- Rows ----------
export type ProfileRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
};

export type MyeongsikRow = {
  id: string;
  user_id: string;
  created_at?: string | null;
};

// fetchEntitlements에서 넘어오는 Raw (plan이 unknown이라 여기서도 unknown)
export type EntRowRaw = {
  user_id: string;
  plan: unknown;
  starts_at?: string | null;
  expires_at?: string | null;
  can_use_myo_viewer?: unknown;
};

// 앱에서 쓰는 정규화 엔트 타입
export type EntRow = {
  user_id: string;
  plan: PlanTier | null;
  starts_at: string | null;
  expires_at: string | null;
  can_use_myo_viewer: boolean | null;
};

// ---------- Draft ----------
export type Draft = {
  plan: PlanTier;
  startDate: string; // YYYY-MM-DD (input date)
  endDate: string; // YYYY-MM-DD (input date)
  myoViewer: "ON" | "OFF";

  saving: boolean;
  lastSavedAt?: number; // ✅ number(밀리초). null 금지.
};

// ---------- Summary ----------
export type UserSummary = {
  user_id: string;
  profile: ProfileRow | null;

  myeongsikCount: number;
  lastCreatedAt: string | null;

  ent: EntRow | null;

  // ✅ 추가: 마지막 접속/활동
  lastSeenAt: string | null;
  lastSeenPath: string | null;
};

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
