import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export type AdminRole = "admin" | "operator" | "viewer" | null;

export function useAdminRole() {
  const [role, setRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) {
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

      setRole(data?.role ?? null);
      setLoading(false);
    };

    load();
  }, []);

  return { role, loading };
}
