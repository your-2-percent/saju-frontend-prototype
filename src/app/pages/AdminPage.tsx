import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdminMsRow = {
  id: string;
  user_id: string;
  name: string | null;
  birth_json: Record<string, unknown> | null;
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

type StatCardProps = {
  label: string;
  value: string | number;
  hint?: string;
};

const PAGE_SIZE = 20;

function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="flex-1 min-w-[160px] rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-3 text-white shadow">
      <div className="text-sm text-neutral-400">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
      {hint && <div className="text-xs text-neutral-500 mt-1">{hint}</div>}
    </div>
  );
}

export default function AdminPage() {
  const [adminChecked, setAdminChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<AdminMsRow[]>([]);
  const [count, setCount] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profileMap, setProfileMap] = useState<Record<string, ProfileRow>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const totalPages = useMemo(() => {
    if (!count) return 1;
    return Math.max(1, Math.ceil(count / PAGE_SIZE));
  }, [count]);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      setIsAdmin(!!uid && ADMIN_UUIDS.includes(uid));
      setAdminChecked(true);
    };
    void init();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("myeongsik")
      .select("*", { count: "exact" })
      .order("user_id", { ascending: true })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (search.trim()) {
      const term = search.trim();
      query = query.or(
        [
          `name.ilike.%${term}%`,
          `user_id.ilike.%${term}%`,
          `birth_json->>birthDay.ilike.%${term}%`,
        ].join(","),
      );
    }

    const { data, error: err, count: cnt } = await query;

    if (err) {
      setError(err?.message ?? "Unknown error");
      setLoading(false);
      return;
    }

    const msRows = (data as unknown as AdminMsRow[]) ?? [];
    setRows(msRows);
    setCount(cnt ?? null);

    // profiles: user_id 기준으로만 조회 (id 타입 불일치 방지)
    const userIds = Array.from(new Set(msRows.map((m) => m.user_id))).filter(Boolean);
    if (userIds.length > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id,user_id,name,email,nickname")
        .in("user_id", userIds);

      if (!pErr && profiles) {
        const map: Record<string, ProfileRow> = {};
        (profiles as unknown as ProfileRow[]).forEach((p) => {
          const key = p.user_id || p.id;
          if (key) map[key] = p;
        });
        setProfileMap(map);
      } else {
        if (pErr && pErr.code !== "42P01" && pErr.code !== "42703") {
          setError(pErr.message ?? "Profile fetch error");
        }
        setProfileMap({});
      }
    } else {
      setProfileMap({});
    }

    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) void fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, includeDeleted, isAdmin]);

  const visibleRows = useMemo(
    () => (includeDeleted ? rows : rows.filter((r) => !r.deleted_at)),
    [rows, includeDeleted]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, AdminMsRow[]>();
    visibleRows.forEach((r) => {
      if (!map.has(r.user_id)) map.set(r.user_id, []);
      map.get(r.user_id)!.push(r);
    });
    return map;
  }, [visibleRows]);

  const uniqueUsers = Array.from(grouped.entries());

  const stats = useMemo(() => {
    const userCount = uniqueUsers.length;
    const msCount = visibleRows.length;
    const avgMs = userCount ? (msCount / userCount).toFixed(1) : "0";
    const recent = visibleRows
      .map((r) => r.created_at)
      .filter(Boolean)
      .sort()
      .slice(-1)[0];

    const deletedCount = rows.filter((r) => !!r.deleted_at).length;

    return {
      userCount,
      msCount,
      avgMs,
      recent: recent ? new Date(recent).toLocaleString() : "-",
      deletedCount,
    };
  }, [visibleRows, uniqueUsers.length, rows]);

  const onPageChange = (next: number) => {
    if (next < 1 || next > totalPages) return;
    setPage(next);
  };

  const renderList = () => {
    if (loading) return <div className="text-neutral-400 text-sm">Loading...</div>;
    if (!loading && uniqueUsers.length === 0) return <div className="text-neutral-400 text-sm">No data.</div>;

    return uniqueUsers.map(([userId, items]) => {
      const profile = profileMap[userId];
      const displayName = profile?.name || profile?.nickname || profile?.email || "(no profile name)";
      const emailText = profile?.email;
      const isCollapsed = collapsed[userId];

      return (
        <div key={userId} className="rounded-xl border border-neutral-800 bg-neutral-900 shadow">
          <button
            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-neutral-850"
            onClick={() => setCollapsed((prev) => ({ ...prev, [userId]: !prev[userId] }))}
          >
            <div className="flex flex-col gap-1">
              <div className="text-white font-semibold">
                {displayName}
                <span className="text-xs text-neutral-500 ml-2">{userId}</span>
              </div>
              <div className="text-xs text-neutral-400 flex flex-wrap gap-2">
                <span className="rounded-full bg-neutral-800 px-2 py-0.5 border border-neutral-700">명식 {items.length}개</span>
                {emailText && (
                  <span className="rounded-full bg-neutral-800 px-2 py-0.5 border border-neutral-700">{emailText}</span>
                )}
              </div>
            </div>
            <span className="text-neutral-400 text-sm">{isCollapsed ? "+" : "−"}</span>
          </button>

          {!isCollapsed && (
            <ul className="px-4 pb-4 space-y-2 text-sm">
              {items.map((m) => {
                const birthDay =
                  typeof m.birth_json === "object" && m.birth_json
                    ? (m.birth_json as Record<string, unknown>)["birthDay"]
                    : undefined;
                return (
                  <li
                    key={m.id}
                    className="rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 flex justify-between items-center"
                  >
                    <div className="space-y-1">
                      <div className="text-white">{m.name || "(no name)"}</div>
                      <div className="text-xs text-neutral-500">
                        Birth: {typeof birthDay === "string" ? birthDay : "-"} · Created: {m.created_at ? new Date(m.created_at).toLocaleString() : "-"}
                      </div>
                    </div>
                    {m.deleted_at && (
                      <span className="text-[11px] text-red-400 border border-red-400/50 rounded px-2 py-1">deleted</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      );
    });
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-4 py-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-neutral-400">Users grouped by myeongsik</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <label className="inline-flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={includeDeleted}
                onChange={(e) => {
                  setPage(1);
                  setIncludeDeleted(e.target.checked);
                }}
                className="h-4 w-4 rounded border-neutral-700 bg-neutral-900"
              />
              Include deleted
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              placeholder="Search: name / birth / user_id"
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </header>

        {!adminChecked && (
          <div className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-300">
            Checking admin account...
          </div>
        )}

        {adminChecked && !isAdmin && (
          <div className="rounded-md border border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-100">
            Not an admin account. Please log in with an admin UUID.
          </div>
        )}

        {isAdmin && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Users" value={stats.userCount} />
              <StatCard label="Myeongsik" value={stats.msCount} hint={`Avg per user ${stats.avgMs}`} />
              <StatCard label="Most recent" value={stats.recent} />
              <StatCard label="Deleted (all)" value={stats.deletedCount} />
            </div>

            {error && (
              <div className="rounded-md border border-red-500 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="space-y-4">{renderList()}</div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1 text-sm text-neutral-200 disabled:opacity-40"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
              >
                ←
              </button>
              <div className="text-sm text-neutral-400">
                {page} / {totalPages}
              </div>
              <button
                className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-1 text-sm text-neutral-200 disabled:opacity-40"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
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

