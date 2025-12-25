import { create } from "zustand";
import { supabase } from "@/lib/supabase";

type AccountStatusState = {
  loaded: boolean;
  loading: boolean;
  userId: string | null;
  disabledAt: string | null;

  reset: () => void;
  loadFromServer: (userId: string) => Promise<void>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickDisabledAtFromRpc(data: unknown): string | null {
  // get_my_account_status() returns rows(array)
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0];
  if (!isRecord(row)) return null;
  const v = row.disabled_at;
  return typeof v === "string" ? v : null;
}

export const useAccountStatusStore = create<AccountStatusState>((set, get) => ({
  loaded: false,
  loading: false,
  userId: null,
  disabledAt: null,

  reset: () => {
    set({ loaded: true, loading: false, userId: null, disabledAt: null });
  },

  loadFromServer: async (userId: string) => {
    const cur = get();
    if (cur.loading) return;

    set({ loading: true, userId });

    try {
      // ✅ 1순위: security definer RPC (RLS 영향 최소)
      const { data: rpcData, error: rpcErr } = await supabase.rpc("get_my_account_status");
      if (!rpcErr) {
        const disabledAt = pickDisabledAtFromRpc(rpcData);
        set({ loaded: true, loading: false, disabledAt });
        return;
      }

      // ✅ 2순위: 혹시 RPC가 아직 없을 때 fallback
      const { data, error } = await supabase
        .from("profiles")
        .select("disabled_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("[accountStatus] load error:", error);
        // 여기서 active로 치면 “너 지금 겪는 증상” 다시 남.
        // 그래서 unknown은 그냥 null 처리하되, 콘솔은 남김.
        set({ loaded: true, loading: false, disabledAt: null });
        return;
      }

      const v = (data as { disabled_at?: string | null } | null)?.disabled_at ?? null;
      set({ loaded: true, loading: false, disabledAt: typeof v === "string" ? v : null });
    } catch (e) {
      console.error("[accountStatus] exception:", e);
      set({ loaded: true, loading: false, disabledAt: null });
    }
  },
}));
