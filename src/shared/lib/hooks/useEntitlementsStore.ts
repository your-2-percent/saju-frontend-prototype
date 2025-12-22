import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type { PlanTier } from "@/shared/billing/entitlements";
import { parsePlanTier } from "@/shared/lib/plan/planTier";
import { getPlanCapabilities } from "@/shared/lib/plan/planCapabilities";

type EntitlementsRow = {
  plan: string; // ✅ DB에서 오는 원본 문자열
  max_myeongsik: number;
  can_manage_myeongsik: boolean;
  can_use_luck_tabs: boolean;
  can_use_multi_mode: boolean;
  can_use_all_prompts: boolean;
  expires_at: string | null;
  starts_at?: string | null;
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
  | "startsAt"
  | "expiresAt"
> = {
  plan: "PROMPT_LOCKED",
  maxMyeongsik: 9999,
  canManageMyeongsik: true,
  canUseLuckTabs: true,
  canUseMultiMode: true,
  canUseAllPrompts: false,
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

      // ✅ 관리자/매니저는 PROMPT_FULL 강제
      if (isPrivilegedUserId(userId)) {
        const caps = getPlanCapabilities("PROMPT_FULL");
        set({
          loaded: true,
          loading: false,
          userId,
          plan: "PROMPT_FULL",
          maxMyeongsik: 9999,
          canManageMyeongsik: caps.canManageMyeongsik,
          canUseLuckTabs: caps.canUseLuckTabs,
          canUseMultiMode: caps.canUseMultiMode,
          canUseAllPrompts: caps.canUseAllPrompts,
          startsAt: null,
          expiresAt: null,
        });
        return;
      }

      const { data, error } = await supabase
        .from("user_entitlements")
        .select("plan,max_myeongsik,starts_at,expires_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error || !data) {
        set({ loaded: true, loading: false, userId, ...DEFAULT });
        return;
      }

      // ✅ 여기서 row 먼저 만들고(plan 파싱은 그 다음) => row 못찾음 해결
      const row = data as Partial<EntitlementsRow>;
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
        startsAt: toDateOrNull(row.starts_at ?? null),
        expiresAt: toDateOrNull(row.expires_at ?? null),
      });
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

  canAddMyeongsik: (currentCount) => {
    const s = get();
    if (!s.loaded) return { ok: false, message: "권한 확인 중" };
    if (!s.isActiveNow()) return { ok: false, message: "플랜 만료 🔒" };

    if (currentCount >= s.maxMyeongsik) {
      return { ok: false, message: `현재 플랜은 명식 ${s.maxMyeongsik}개까지예요. 🔒` };
    }
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
}));
