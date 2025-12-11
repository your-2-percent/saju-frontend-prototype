// /admin/user/index.tsx
import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ---------- Types ----------
type ProfileRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
};

type UserSummary = {
  user_id: string;
  profile: ProfileRow | null;
  myeongsikCount: number;
  lastCreatedAt: string | null;
};

// ---------- Constants ----------
const PAGE_SIZE = 20;

// ---------- Component ----------
export default function AdminUserListPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [userIds, setUserIds] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<UserSummary[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------
  // ① DISTINCT user_id 목록 가져오기 (검색 포함)
  // -----------------------------
  const fetchUserIdList = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("myeongsik")
        .select("user_id,name");

      if (search.trim()) {
        const term = `%${search.trim()}%`;
        query = query.or(
          `name.ilike.${term},user_id.ilike.${term},birth_json->>birthDay.ilike.${term}`
        );
      }

      const { data, error: err } = await query as unknown as {
        data: { user_id: string; created_at: string | null }[] | null;
        error: { message: string } | null;
      };

      if (err) throw new Error(err.message);

      const ids = Array.from(new Set((data || []).map(r => r.user_id).filter(Boolean)));
      setUserIds(ids);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }

    setLoading(false);
  }, [search]);

  // -----------------------------
  // ② 페이징된 user_id 계산
  // -----------------------------
  const pagedUserIds = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return userIds.slice(start, start + PAGE_SIZE);
  }, [page, userIds]);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(userIds.length / PAGE_SIZE));
  }, [userIds]);

  // -----------------------------
  // ③ 유저 요약(summary) 가져오기
  // -----------------------------
  const fetchSummaries = useCallback(async () => {
    if (!pagedUserIds.length) {
      setSummaries([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const safeIds = pagedUserIds.length ? pagedUserIds : ["__NO_MATCH__"];

      // profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id,user_id,name,nickname,email")
        .in("user_id", safeIds) as unknown as {
        data: ProfileRow[] | null;
        error: { message: string } | null;
      };

      const profileMap: Record<string, ProfileRow | null> = {};
      (profiles || []).forEach((p) => {
        const key = p.user_id || p.id;
        if (key) profileMap[key] = p;
      });

      // myeongsik count + last created_at
      const { data: msRows } = await supabase
        .from("myeongsik")
        .select("user_id, created_at")
        .in("user_id", safeIds)
        .order("created_at", { ascending: false }) as unknown as {
        data: { user_id: string; created_at: string | null }[] | null;
      };

      const summaryMap: Record<string, UserSummary> = {};

      safeIds.forEach((uid) => {
        summaryMap[uid] = {
          user_id: uid,
          profile: profileMap[uid] || null,
          myeongsikCount: 0,
          lastCreatedAt: null
        };
      });

      (msRows || []).forEach((row) => {
        summaryMap[row.user_id].myeongsikCount++;
        if (!summaryMap[row.user_id].lastCreatedAt) {
          summaryMap[row.user_id].lastCreatedAt = row.created_at;
        }
      });

      setSummaries(Object.values(summaryMap));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }

    setLoading(false);
  }, [pagedUserIds]);

  // -----------------------------
  // Effects
  // -----------------------------
  useEffect(() => {
    fetchUserIdList();
  }, [fetchUserIdList]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  // -----------------------------
  // UI Rendering
  // -----------------------------
  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Users</h1>

      {/* Search */}
      <input
        className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded w-full max-w-sm mb-4"
        placeholder="Search user (name, email, birth, userId...)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && (
        <div className="text-red-400 mb-2">{error}</div>
      )}

      {loading && <div>Loading...</div>}

      {/* 리스트 */}
      <div className="space-y-3">
        {summaries.map((s) => {
          const displayName =
            s.profile?.name ||
            s.profile?.nickname ||
            s.profile?.email ||
            "(no profile)";

          return (
            <div
              key={s.user_id}
              className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg cursor-pointer hover:bg-neutral-800"
              onClick={() => location.href = `/admin/user/${s.user_id}`}
            >
              <div className="font-semibold text-lg flex items-center justify-between">
                <span className="text-nowrap mr-2">{displayName}</span>
                <span className="text-neutral-500 text-sm">{s.user_id}</span>
              </div>

              <div className="text-sm text-neutral-400 mt-1">
                명식 {s.myeongsikCount}개
                {s.lastCreatedAt && (
                  <> · 최근 생성 {new Date(s.lastCreatedAt).toLocaleString()}</>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          disabled={page <= 1}
          onClick={() => setPage(p => p - 1)}
          className="px-3 py-1 border border-neutral-700 rounded disabled:opacity-50"
        >
          ←
        </button>

        <span>{page} / {totalPages}</span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage(p => p + 1)}
          className="px-3 py-1 border border-neutral-700 rounded disabled:opacity-50"
        >
          →
        </button>
      </div>
    </div>
  );
}
