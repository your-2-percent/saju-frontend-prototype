// AdminPage.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type BirthJson = {
  birthDay?: string;
  [key: string]: unknown;
};

type AdminMsRow = {
  id: string;
  user_id: string;
  name: string | null;
  birth_json: BirthJson | null;
  created_at: string | null;
  deleted_at?: string | null;
};

type ProfileRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  email?: string | null;
  nickname?: string | null;
};

const ADMIN_UUIDS: string[] = (import.meta.env.VITE_ADMIN_UUIDS ?? "")
  .split(",")
  .map((v: string) => v.trim())
  .filter(Boolean)
  .concat(["15b517b3-3d97-41a6-ae17-563abd163a36"]);

const PAGE_SIZE = 20;

export default function AdminPage() {
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userIdList, setUserIdList] = useState<string[]>([]);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileRow>>({});
  const [msMap, setMsMap] = useState<Record<string, AdminMsRow[]>>({});

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  // ---------------------------------------------------------
  // Admin 체크
  // ---------------------------------------------------------
  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      setIsAdmin(!!uid && ADMIN_UUIDS.includes(uid));
      setAdminChecked(true);
    };
    void init();
  }, []);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(userIdList.length / PAGE_SIZE));
  }, [userIdList]);

  // ---------------------------------------------------------
  // 1단계: user_id DISTINCT 수집 (검색 포함)
  // ---------------------------------------------------------
  const fetchUserList = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase.from("myeongsik").select("user_id,name");

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(`name.ilike.${term},user_id.ilike.${term}`);
      }

      const { data, error: err } = await query as unknown as {
        data: { user_id: string; name: string | null }[] | null;
        error: { message: string } | null;
      };

      if (err) throw new Error(err.message);

      const ids = Array.from(
        new Set((data || []).map((r) => r.user_id).filter(Boolean))
      );

      setUserIdList(ids);
      setPage(1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    }

    setLoading(false);
  }, [search]); // ← search 변경 시만 다시 생성됨

  // ---------------------------------------------------------
  // 2단계: 페이징된 user_id 리스트 계산
  // ---------------------------------------------------------
  const pagedUserIds = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return userIdList.slice(start, start + PAGE_SIZE);
  }, [page, userIdList]);

  // ---------------------------------------------------------
  // 3단계: 페이징된 user_id의 프로필 + 명식 로드
  // ---------------------------------------------------------
  const fetchUserData = useCallback(async () => {
    if (!pagedUserIds.length) {
      setMsMap({});
      setProfileMap({});
      return;
    }

    setLoading(true);
    try {
      const safeIds = pagedUserIds.length ? pagedUserIds : ["__NO_MATCH__"];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,user_id,name,email,nickname")
        .in("user_id", safeIds) as unknown as {
        data: ProfileRow[] | null;
        error: { message: string } | null;
      };

      const pMap: Record<string, ProfileRow> = {};
      (profiles || []).forEach((p) => {
        const key = p.user_id || p.id;
        if (key) pMap[key] = p;
      });
      setProfileMap(pMap);

      const { data: msRows } = await supabase
        .from("myeongsik")
        .select("*")
        .in("user_id", safeIds)
        .order("created_at", { ascending: false }) as unknown as {
        data: AdminMsRow[] | null;
        error: { message: string } | null;
      };

      const mMap: Record<string, AdminMsRow[]> = {};
      (msRows || []).forEach((row) => {
        if (!mMap[row.user_id]) mMap[row.user_id] = [];
        mMap[row.user_id].push(row);
      });

      setMsMap(mMap);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setError(msg);
    }

    setLoading(false);
  }, [pagedUserIds]);


  useEffect(() => {
    if (isAdmin) fetchUserList();
  }, [isAdmin, fetchUserList]);

  useEffect(() => {
    if (isAdmin) fetchUserData();
  }, [fetchUserData, isAdmin]);

  // ---------------------------------------------------------
  // 렌더링
  // ---------------------------------------------------------
  const renderList = () => {
    if (loading) return <div className="text-neutral-400">Loading...</div>;
    if (!pagedUserIds.length) return <div className="text-neutral-400">No data.</div>;

    return pagedUserIds.map((uid) => {
      const profile = profileMap[uid];
      const msItems = msMap[uid] || [];
      const isCollapsed = collapsed[uid];

      const displayName =
        profile?.name || profile?.nickname || profile?.email || "(no profile name)";

      return (
        <div key={uid} className="rounded-xl border border-neutral-700 bg-neutral-900 shadow">
          {/* header */}
          <button
            onClick={() =>
              setCollapsed((prev) => ({ ...prev, [uid]: !prev[uid] }))
            }
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-neutral-850"
          >
            <div className="flex items-center gap-2">
              <div className="text-white font-semibold">
                {displayName}
                <span className="text-xs text-neutral-500 mx-2">{uid}</span>
                <span className="text-xs text-neutral-400">명식 {msItems.length}개</span>
              </div>
            </div>
            <span className="text-neutral-400">{isCollapsed ? "+" : "-"}</span>
          </button>

          {/* list */}
          {!isCollapsed && (
            <ul className="px-4 pb-4 space-y-2">
              {msItems.map((m) => {
                const birth = m.birth_json?.birthDay ?? "-";

                return (
                  <li
                    key={m.id}
                    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2"
                  >
                    <div className="text-white">{m.name || "(no name)"}</div>
                    <div className="text-xs text-neutral-500">
                      Birth: {birth} · Created:{" "}
                      {m.created_at
                        ? new Date(m.created_at).toLocaleString()
                        : "-"}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      );
    });
  };

  // ---------------------------------------------------------
  // 최종 UI
  // ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* top */}
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <input
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user"
          />
        </header>

        {!adminChecked && <div>Checking admin…</div>}
        {adminChecked && !isAdmin && <div>Not admin</div>}

        {isAdmin && (
          <>
            {error && (
              <div className="text-red-400 border border-red-500 p-2 rounded bg-red-500/10">
                {error}
              </div>
            )}

            <div className="space-y-4">{renderList()}</div>

            {/* pagination */}
            <div className="flex justify-center gap-2 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-3 py-1 border rounded"
              >
                ←
              </button>
              <span>
                {page} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={page >= totalPages}
                className="px-3 py-1 border rounded"
              >
                →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
