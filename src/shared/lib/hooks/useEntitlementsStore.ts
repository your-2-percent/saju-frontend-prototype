// src/shared/lib/hooks/useEntitlementsStore.ts
import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { PlanTier } from "@/shared/billing/entitlements";
import { parsePlanTier } from "@/shared/lib/plan/planTier";
import { getPlanCapabilities } from "@/shared/lib/plan/planCapabilities";

type EntitlementsRow = {
  plan: string;
  max_myeongsik: number;
  starts_at?: string | null;
  expires_at: string | null;

  // 묘운 뷰어 토글 (기본 OFF, true일 때만 ON)
  can_use_myo_viewer?: boolean | null;
};

type AddGateResult = { ok: true } | { ok: false; message: string };

type EntitlementsState = {
  loaded: boolean;
  loading: boolean;

  userId: string | null;

  // ✅ 여기 plan은 "실제 권한 기준(effective)"로 유지
  plan: PlanTier;
  maxMyeongsik: number;

  canManageMyeongsik: boolean;
  canUseLuckTabs: boolean;
  canUseMultiMode: boolean;
  canUseAllPrompts: boolean;

  canUseAdvancedReport: boolean;
  canRemoveAds: boolean;

  canUseMyoViewer: boolean;

  startsAt: Date | null;
  expiresAt: Date | null;

  reset: () => void;
  loadFromServer: () => Promise<void>;

  isActiveNow: () => boolean;
  getRemainingMs: (t: Date | null) => number | null;
  formatRemaining: (ms: number) => string;

  canAddMyeongsik: (currentCount: number) => AddGateResult;

  canManageNow: () => boolean;
  canUseLuckTabsNow: () => boolean;
  canUseMultiModeNow: () => boolean;
  canUseAllPromptsNow: () => boolean;

  canUseAdvancedReportNow: () => boolean;
  shouldShowAdsNow: () => boolean;
  canUseMyoViewerNow: () => boolean;
};

const DEFAULT: Pick<
  EntitlementsState,
  | "plan"
  | "maxMyeongsik"
  | "canManageMyeongsik"
  | "canUseLuckTabs"
  | "canUseMultiMode"
  | "canUseAllPrompts"
  | "canUseAdvancedReport"
  | "canRemoveAds"
  | "canUseMyoViewer"
  | "startsAt"
  | "expiresAt"
> = {
  plan: "FREE",
  maxMyeongsik: 1,

  canManageMyeongsik: true,
  canUseLuckTabs: true,
  canUseMultiMode: true,
  canUseAllPrompts: false,

  canUseAdvancedReport: false,
  canRemoveAds: false,

  canUseMyoViewer: false,

  startsAt: null,
  expiresAt: null,
};

function toInt(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? Math.floor(n) : fallback;
  }
  return fallback;
}

function toDateOrNull(v: unknown): Date | null {
  if (typeof v !== "string" || v.trim() === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ✅ 기간 판정(공통)
function isActiveWithin(startsAt: Date | null, expiresAt: Date | null, nowMs = Date.now()): boolean {
  if (startsAt && startsAt.getTime() > nowMs) return false;
  if (expiresAt && expiresAt.getTime() <= nowMs) return false; // <= 가 핵심
  return true;
}

// ✅ 묘운 뷰어: 기본 OFF, true일 때만 ON
function resolveCanUseMyoViewer(row: Partial<EntitlementsRow> | null): boolean {
  if (!row) return false;
  return row.can_use_myo_viewer === true;
}

async function fetchEntRow(userId: string): Promise<Partial<EntitlementsRow> | null> {
  const { data, error } = await supabase
    .from("user_entitlements")
    .select("plan,max_myeongsik,starts_at,expires_at,can_use_myo_viewer")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return null;
  return (data ?? null) as Partial<EntitlementsRow> | null;
}

export const useEntitlementsStore = create<EntitlementsState>((set, get) => ({
  loaded: false,
  loading: false,

  userId: null,

  ...DEFAULT,

  reset: () => {
    set({
      loaded: false,
      loading: false,
      userId: null,
      ...DEFAULT,
    });
  },

  loadFromServer: async (opts?: { force?: boolean }) => {
    const st = get();
    if (st.loading) return; // 중복 호출 방지

    set({ loading: true });

    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      const userId = userRes.user?.id ?? null;

      // ✅ 로그인 유저 아니면: DEFAULT + loaded=true 로 마감 (순서 중요)
      if (userErr || !userId) {
        set({ ...DEFAULT, loaded: true, userId: null });
        return;
      }

      // ✅ 같은 유저로 이미 로드 끝났으면 스킵
      const st2 = get();
      if (!opts?.force && st2.loaded && st2.userId === userId) return;

      const row = await fetchEntRow(userId);

      if (!row) {
        const caps = getPlanCapabilities("FREE");
        set({
          loaded: true,
          userId,
          plan: "FREE",
          maxMyeongsik: caps.maxMyeongsik === null ? 9999 : caps.maxMyeongsik,

          canManageMyeongsik: caps.canManageMyeongsik,
          canUseLuckTabs: caps.canUseLuckTabs,
          canUseMultiMode: caps.canUseMultiMode,
          canUseAllPrompts: caps.canUseAllPrompts,

          canUseAdvancedReport: caps.canUseAdvancedReport,
          canRemoveAds: caps.canRemoveAds,

          canUseMyoViewer: false,

          startsAt: null,
          expiresAt: null,
        });
        return;
      }

      const startsAt = toDateOrNull(row.starts_at ?? null);
      const expiresAt = toDateOrNull(row.expires_at ?? null);

      const active = isActiveWithin(startsAt, expiresAt);
      const rawPlan = parsePlanTier(row.plan ?? null);

      const effectivePlan: PlanTier = active ? rawPlan : "FREE";
      const caps = getPlanCapabilities(effectivePlan);

      const maxFromCaps = caps.maxMyeongsik === null ? 9999 : caps.maxMyeongsik;
      const rawMax = toInt(row.max_myeongsik, maxFromCaps);
      const maxMyeongsik = Math.max(1, Math.max(rawMax, maxFromCaps));

      set({
        loaded: true,
        userId,
        plan: effectivePlan,
        maxMyeongsik,

        canManageMyeongsik: caps.canManageMyeongsik,
        canUseLuckTabs: caps.canUseLuckTabs,
        canUseMultiMode: caps.canUseMultiMode,
        canUseAllPrompts: caps.canUseAllPrompts,

        canUseAdvancedReport: caps.canUseAdvancedReport,
        canRemoveAds: caps.canRemoveAds,

        canUseMyoViewer: resolveCanUseMyoViewer(row),

        startsAt,
        expiresAt,
      });
    } catch (e) {
      console.error("loadFromServer(entitlements) exception:", e);
      // ✅ 예외여도 booting 무한루프 방지: loaded=true로 마감 (순서 중요)
      set({ ...DEFAULT, loaded: true, userId: null });
    } finally {
      set({ loading: false });
    }
  },


  isActiveNow: () => {
    const { startsAt, expiresAt } = get();
    return isActiveWithin(startsAt, expiresAt);
  },

  getRemainingMs: (t) => {
    if (!t) return null;
    const ms = t.getTime() - Date.now();
    return ms > 0 ? ms : 0;
  },

  formatRemaining: (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const sec = totalSec % 60;
    const totalMin = Math.floor(totalSec / 60);
    const min = totalMin % 60;
    const totalHour = Math.floor(totalMin / 60);
    const hour = totalHour % 24;
    const day = Math.floor(totalHour / 24);

    const parts: string[] = [];
    if (day > 0) parts.push(`${day}일`);
    if (hour > 0) parts.push(`${hour}시간`);
    if (day === 0 && min > 0) parts.push(`${min}분`);
    if (parts.length === 0) parts.push(`${sec}초`);
    return parts.join(" ");
  },

  canAddMyeongsik: () => {
    return { ok: true };
  },

  // ✅ 여기! 기간/권한 반영되게 원상복구
  canManageNow: () => {
    const s = get();
    return s.loaded && s.isActiveNow() && s.canManageMyeongsik;
  },

  canUseLuckTabsNow: () => {
    const s = get();
    return s.loaded && s.isActiveNow() && s.canUseLuckTabs;
  },

  canUseMultiModeNow: () => {
    const s = get();
    return s.loaded && s.isActiveNow() && s.canUseMultiMode;
  },

  canUseAllPromptsNow: () => {
    const s = get();
    return s.loaded && s.isActiveNow() && s.canUseAllPrompts;
  },

  canUseAdvancedReportNow: () => {
    const s = get();
    return s.loaded && s.isActiveNow() && s.canUseAdvancedReport;
  },

  shouldShowAdsNow: () => {
    const s = get();
    if (!s.loaded) return true;
    if (!s.isActiveNow()) return true;
    return !s.canRemoveAds;
  },

  // ✅ 묘운은 기간 영향 X, 활성/만료 상관없이 토글만
  canUseMyoViewerNow: () => {
    const s = get();
    return s.loaded && s.canUseMyoViewer;
  },
}));
