import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AdminRole = "admin" | "operator" | "viewer" | null;

type CacheEntry = { role: AdminRole; uid: string };
let roleCache: CacheEntry | null = null;

async function loadRole(): Promise<CacheEntry> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return { role: null, uid: "" };

  const { data } = await supabase
    .from("admin_roles")
    .select("role")
    .eq("user_id", uid)
    .maybeSingle() as unknown as {
    data: { role: AdminRole } | null;
  };

  return { role: data?.role ?? null, uid };
}

export function useAdminRole() {
  const [role, setRole] = useState<AdminRole>(roleCache?.role ?? null);
  const [loading, setLoading] = useState(roleCache === null);

  useEffect(() => {
    // 초기 로드
    if (roleCache === null) {
      loadRole().then((entry) => {
        roleCache = entry;
        setRole(entry.role);
        setLoading(false);
      });
    }

    // 로그인/로그아웃 시 roleCache 클리어 후 재로드 (두 번 뜨는 문제 방지)
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      roleCache = null;
      setLoading(true);
      loadRole().then((entry) => {
        roleCache = entry;
        setRole(entry.role);
        setLoading(false);
      });
    });

    return () => data.subscription.unsubscribe();
  }, []);

  return { role, loading };
}
