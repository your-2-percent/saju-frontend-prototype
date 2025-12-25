"use client";

import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickDisabledAtFromRpc(data: unknown): string | null {
  // get_my_account_status() 가 returns table(...)면 supabase-js는 배열로 줌
  if (!Array.isArray(data) || data.length === 0) return null;
  const row = data[0];
  if (!isRecord(row)) return null;
  const v = row.disabled_at;
  return typeof v === "string" ? v : null;
}

export default function AccountDisabledGate() {
  const nav = useNavigate();
  const loc = useLocation();
  const runningRef = useRef(false);

  useEffect(() => {
    const check = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const { data: sess } = await supabase.auth.getSession();
        const uid = sess.session?.user?.id ?? null;
        if (!uid) return;

        // ✅ 1순위: RPC (RLS 덜 타게)
        const { data: rpcData, error: rpcErr } = await supabase.rpc("get_my_account_status");
        if (!rpcErr) {
          const disabledAt = pickDisabledAtFromRpc(rpcData);
          const isDisabled = !!disabledAt;

          if (isDisabled && loc.pathname !== "/disabled") {
            nav("/disabled", { replace: true });
          }
          return;
        }

        // ✅ 2순위: fallback (정책 있으면 됨)
        const { data, error } = await supabase
          .from("profiles")
          .select("disabled_at")
          .eq("user_id", uid)
          .maybeSingle();

        if (error) return;

        const disabledAt = (data as { disabled_at?: string | null } | null)?.disabled_at ?? null;
        if (disabledAt && loc.pathname !== "/disabled") {
          nav("/disabled", { replace: true });
        }
      } finally {
        runningRef.current = false;
      }
    };

    // 초기 + 로그인 변화마다 체크
    void check();

    const { data } = supabase.auth.onAuthStateChange(() => {
      void check();
    });

    // 탭 다시 켜질 때도 체크
    const onVis = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      document.removeEventListener("visibilitychange", onVis);
      data.subscription.unsubscribe();
    };
  }, [nav, loc.pathname]);

  return null;
}
