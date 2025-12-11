"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { RequireRole } from "../components/RequireRole";

type RoleRow = {
  user_id: string;
  role: "admin" | "operator" | "viewer";
};

type ProfileRow = {
  user_id: string;
  name: string | null;
  email: string | null;
};

export default function RoleManagePage() {
  const [list, setList] = useState<RoleRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);

    const { data: roles } = await supabase
      .from("admin_roles")
      .select("*") as unknown as { data: RoleRow[] | null };

    setList(roles || []);

    const ids = (roles || []).map((r) => r.user_id);

    const { data: pRows } = await supabase
      .from("profiles")
      .select("user_id,name,email")
      .in("user_id", ids) as unknown as { data: ProfileRow[] | null };

    const map: Record<string, ProfileRow> = {};
    (pRows || []).forEach((p) => {
      map[p.user_id] = p;
    });
    setProfiles(map);

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const updateRole = async (userId: string, role: RoleRow["role"]) => {
    await supabase
      .from("admin_roles")
      .update({ role })
      .eq("user_id", userId);

    fetchData();
  };

  return (
    <RequireRole allow={["admin"]}>
      <div className="p-6 text-white">
        <h1 className="text-2xl font-bold mb-4">관리자 권한 관리</h1>

        {loading && <div>Loading...</div>}

        <div className="space-y-3">
          {list.map((r) => {
            const p = profiles[r.user_id];
            const name = p?.name || p?.email || r.user_id;

            return (
              <div
                key={r.user_id}
                className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-semibold">{name}</div>
                    <div className="text-neutral-400">{r.user_id}</div>
                  </div>

                  <select
                    className="bg-neutral-800 border border-neutral-600 p-2 rounded"
                    value={r.role}
                    onChange={(e) =>
                      updateRole(r.user_id, e.target.value as RoleRow["role"])
                    }
                  >
                    <option value="admin">admin</option>
                    <option value="operator">operator</option>
                    <option value="viewer">viewer</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </RequireRole>
  );
}
