import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AdminRole = "admin" | "operator" | "viewer" | null;

type CacheEntry = { role: AdminRole; uid: string };
let roleCache: CacheEntry | null = null;

export function useAdminRole() {
  const [role, setRole] = useState<AdminRole>(roleCache?.role ?? null);
  const [loading, setLoading] = useState(roleCache === null);

  useEffect(() => {
    if (roleCache !== null) return;

    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
        roleCache = { role: null, uid: "" };
        setRole(null);
        setLoading(false);
        return;
      }

      const { data } = await supabase
        .from("admin_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle() as unknown as {
        data: { role: AdminRole } | null;
      };

      const resolved = data?.role ?? null;
      roleCache = { role: resolved, uid };
      setRole(resolved);
      setLoading(false);
    };

    load();
  }, []);

  return { role, loading };
}
