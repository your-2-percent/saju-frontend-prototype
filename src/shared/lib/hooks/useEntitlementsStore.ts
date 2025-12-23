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

  // ✅ 새 컬럼 (없으면 기본 true로 취급)
  can_use_myo_viewer?: boolean | null;
};

type AddGateResult = { ok: true } | { ok: false; message: string };

type EntitlementsState = {
  loaded: boolean;
  loading: boolean;

  userId: string | null;

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

const ADMIN_UUIDS: string[] = (import.meta.env.VITE_ADMIN_UUIDS ?? "")
  .split(",")
  .map((v: string) => v.trim())
  .filter(Boolean);

const MANAGER_UUIDS: string[] = (import.meta.env.VITE_MANAGER_UUIDS ?? "")
  .split(",")
  .map((v: string) => v.trim())
  .filter(Boolean);

function isPrivilegedUserId(userId: string | null): boolean {
  if (!userId) return false;
  return ADMIN_UUIDS.includes(userId) || MANAGER_UUIDS.includes(userId);
}

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

  canUseMyoViewer: true,

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

async function fetchEntRow(
  userId: string
): Promise<{ row: Partial<EntitlementsRow> | null; hasMyoViewerCol: boolean }> {
  // ✅ can_use_myo_viewer 컬럼 추가 전/후 둘 다 살아남게 2트라이
  const withCol = await supabase
    .from("user_entitlements")
    .select("plan,max_myeongsik,starts_at,expires_at,can_use_myo_viewer")
    .eq("user_id", userId)
    .maybeSingle();

  if (!withCol.error && withCol.data) {
    return { row: withCol.data as Partial<EntitlementsRow>, hasMyoViewerCol: true };
  }

  const withoutCol = await supabase
    .from("user_entitlements")
    .select("plan,max_myeongsik,starts_at,expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (withoutCol.error || !withoutCol.data) {
    return { row: null, hasMyoViewerCol: false };
  }

  return { row: withoutCol.data as Partial<EntitlementsRow>, hasMyoViewerCol: false };
}

function resolveCanUseMyoViewer(row: Partial<EntitlementsRow> | null): boolean {
  if (!row) return true; // row 없으면 기본 true
  return typeof row.can_use_myo_viewer === "boolean" ? row.can_use_myo_viewer : true;
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

  loadFromServer: async () => {
    set({ loading: true });

    try {
      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr) {
        set({ loaded: true, loading: false, userId: null, ...DEFAULT });
        return;
      }

      const userId = userRes.user?.id ?? null;
      if (!userId) {
        set({ loaded: true, loading: false, userId: null, ...DEFAULT });
        return;
      }

      // ✅ ent row는 관리자든 아니든 한 번은 읽어둠 (묘운 뷰어 토글 존중하려고)
      const { row } = await fetchEntRow(userId);
      const canUseMyoViewer = resolveCanUseMyoViewer(row);

      // ✅ 관리자/매니저는 PRO 강제 (단, 묘운 뷰어는 DB 토글 존중)
      if (isPrivilegedUserId(userId)) {
        const caps = getPlanCapabilities("PRO");
        const maxFromCaps = caps.maxMyeongsik === null ? 9999 : caps.maxMyeongsik;

        set({
          loaded: true,
          loading: false,
          userId,
          plan: "PRO",
          maxMyeongsik: maxFromCaps,

          canManageMyeongsik: caps.canManageMyeongsik,
          canUseLuckTabs: caps.canUseLuckTabs,
          canUseMultiMode: caps.canUseMultiMode,
          canUseAllPrompts: caps.canUseAllPrompts,

          canUseAdvancedReport: caps.canUseAdvancedReport,
          canRemoveAds: caps.canRemoveAds,

          canUseMyoViewer, // ✅ 여기 중요

          startsAt: toDateOrNull(row?.starts_at ?? null),
          expiresAt: toDateOrNull(row?.expires_at ?? null),
        });
        return;
      }

      if (!row) {
        // ent row 없으면 FREE로 취급
        const caps = getPlanCapabilities("FREE");
        set({
          loaded: true,
          loading: false,
          userId,
          plan: "FREE",
          maxMyeongsik: caps.maxMyeongsik === null ? 9999 : caps.maxMyeongsik,

          canManageMyeongsik: caps.canManageMyeongsik,
          canUseLuckTabs: caps.canUseLuckTabs,
          canUseMultiMode: caps.canUseMultiMode,
          canUseAllPrompts: caps.canUseAllPrompts,

          canUseAdvancedReport: caps.canUseAdvancedReport,
          canRemoveAds: caps.canRemoveAds,

          canUseMyoViewer, // row 없으면 true

          startsAt: null,
          expiresAt: null,
        });
        return;
      }

      const plan = parsePlanTier(row.plan ?? null);
      const caps = getPlanCapabilities(plan);

      const maxFromCaps = caps.maxMyeongsik === null ? 9999 : caps.maxMyeongsik;
      const rawMax = toInt(row.max_myeongsik, maxFromCaps);
      const maxMyeongsik = Math.max(1, Math.max(rawMax, maxFromCaps));

      set({
        loaded: true,
        loading: false,
        userId,
        plan,
        maxMyeongsik,

        canManageMyeongsik: caps.canManageMyeongsik,
        canUseLuckTabs: caps.canUseLuckTabs,
        canUseMultiMode: caps.canUseMultiMode,
        canUseAllPrompts: caps.canUseAllPrompts,

        canUseAdvancedReport: caps.canUseAdvancedReport,
        canRemoveAds: caps.canRemoveAds,

        canUseMyoViewer,

        startsAt: toDateOrNull(row.starts_at ?? null),
        expiresAt: toDateOrNull(row.expires_at ?? null),
      });

      // ✅ 진단용 로그(원인 잡을 때만 잠깐 켜)
      // console.log("[ent] plan raw:", row.plan, "parsed:", plan, "max:", maxMyeongsik, "myo:", canUseMyoViewer);
    } finally {
      set({ loading: false });
    }
  },

  isActiveNow: () => {
    const { startsAt, expiresAt } = get();
    const now = Date.now();
    if (startsAt && startsAt.getTime() > now) return false;
    if (expiresAt && expiresAt.getTime() <= now) return false;
    return true;
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

  // ✅ 명식추가는 무조건 무한
  canAddMyeongsik: () => {
    const s = get();
    if (!s.loaded) return { ok: false, message: "권한 확인 중" };
    // 필요하면 로그인 여부까지 체크하고 싶으면 여기서 userId 확인만 추가
    return { ok: true };
  },

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

  canUseMyoViewerNow: () => {
    const s = get();
    return s.loaded && s.isActiveNow() && s.canUseMyoViewer;
  },
}));
