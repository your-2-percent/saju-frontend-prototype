import type { PlanTier } from "@/shared/billing/entitlements";

export type ProfileRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
};

export type EntRow = {
  user_id: string;
  plan: PlanTier | null;
  starts_at: string | null;
  expires_at: string | null;

  // ✅ 묘운 뷰어 토글(플랜과 별개)
  can_use_myo_viewer: boolean | null;
};

export type EntRowRaw = {
  user_id: string;
  plan: unknown;
  starts_at: string | null;
  expires_at: string | null;

  // ✅ raw로 받아올 때 unknown 가능
  can_use_myo_viewer?: boolean | null;
};

export type MyeongsikRow = {
  user_id: string;
  created_at: string | null;
};

export type UserSummary = {
  user_id: string;
  profile: ProfileRow | null;
  myeongsikCount: number;
  lastCreatedAt: string | null;
  ent: EntRow | null;
  lastSeenAt: string | null;
  lastSeenPath: string | null;
};

export type MyoViewerFlag = "ON" | "OFF";

export type Draft = {
  plan: PlanTier;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  saving: boolean;
  lastSavedAt?: number;

  // ✅ 관리자에서 묘운 ON/OFF
  myoViewer: MyoViewerFlag;
};

export type PlanOption = { value: PlanTier; label: string };
export type PlanPreset = {
  plan: PlanTier;
  max_myeongsik: number;
  can_manage_myeongsik: boolean;
  can_use_luck_tabs: boolean;
  can_use_multi_mode: boolean;
  can_use_all_prompts: boolean;
};
