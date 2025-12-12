"use client";

import { useEffect, useState } from "react";

type ProfileRow = {
  id: string;
  user_id?: string | null;
  name?: string | null;
  nickname?: string | null;
  email?: string | null;
  mgr_memo?: string | null;
  disabled_at?: string | null;
};

type BirthJson = { birthDay?: string; [key: string]: unknown };

type MyeongsikRow = {
  id: string;
  user_id: string;
  name: string | null;
  birth_json: BirthJson | null;
  created_at: string | null;
  deleted_at?: string | null;
  mgr_memo?: string | null;
};

// Resolve Edge Function endpoint (Vite 우선)
const getImpersonateApi = (): string | null => {
  const viteEnv =
    typeof import.meta !== "undefined" && typeof (import.meta as { env?: unknown }).env !== "undefined"
      ? (import.meta.env as {
          VITE_IMPERSONATE_API?: string;
          NEXT_PUBLIC_FUNCTION_IMPERSONATE_URL?: string;
          NEXT_PUBLIC_IMPERSONATE_API?: string;
          VITE_SUPABASE_ANON_KEY?: string;
          NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
        })
      : undefined;
  const nodeEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_FUNCTION_IMPERSONATE_URL ||
        process.env.NEXT_PUBLIC_IMPERSONATE_API ||
        process.env.VITE_IMPERSONATE_API
      : undefined;
  const fromVite =
    viteEnv?.VITE_IMPERSONATE_API ||
    viteEnv?.NEXT_PUBLIC_FUNCTION_IMPERSONATE_URL ||
    viteEnv?.NEXT_PUBLIC_IMPERSONATE_API;
  return fromVite || nodeEnv || null;
};

const getAnonKey = (): string | null => {
  const viteEnv =
    typeof import.meta !== "undefined" && typeof (import.meta as { env?: unknown }).env !== "undefined"
      ? (import.meta.env as {
          VITE_SUPABASE_ANON_KEY?: string;
          NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
        })
      : undefined;
  const nodeEnv =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
      : undefined;
  return viteEnv?.VITE_SUPABASE_ANON_KEY || viteEnv?.NEXT_PUBLIC_SUPABASE_ANON_KEY || nodeEnv || null;
};

export default function ImpersonateView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [myeongsikId, setMyeongsikId] = useState<string | null>(null);

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [myeongsik, setMyeongsik] = useState<MyeongsikRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const impersonateApi = getImpersonateApi();
  const anonKey = getAnonKey();

  useEffect(() => {
    if (typeof window !== "undefined") {
      // HashRouter 경로: #/impersonate?userId=...
      const hash = window.location.hash?.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash || "";
      const url = new URL(hash || "/", window.location.origin);
      const sp = url.searchParams;
      setUserId(sp.get("userId"));
      setMyeongsikId(sp.get("myeongsikId"));
    }
  }, []);

  useEffect(() => {
    if (!impersonateApi) {
      setError("임퍼소네이션 API URL이 설정되어 있지 않습니다. VITE_IMPERSONATE_API를 .env.local에 지정하세요.");
      return;
    }

    if (!userId) {
      setError("userId가 없습니다.");
      return;
    }

    const isEdgeFunction = impersonateApi.startsWith("http");

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const qs = new URLSearchParams({ userId });
        if (myeongsikId) qs.set("myeongsikId", myeongsikId);
        const headers: Record<string, string> | undefined =
          isEdgeFunction && anonKey
            ? {
                Authorization: `Bearer ${anonKey}`,
                apikey: anonKey,
              }
            : undefined;
        const res = await fetch(`${impersonateApi}?${qs.toString()}`, {
          cache: "no-store",
          headers,
        });
        if (!res.ok) {
          const t = await res.text();
          throw new Error(t || "fetch error");
        }
        const json = (await res.json()) as { profile: ProfileRow | null; myeongsik: MyeongsikRow[] };
        setProfile(json.profile);
        setMyeongsik(Array.isArray(json.myeongsik) ? json.myeongsik : []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, myeongsikId, impersonateApi, anonKey]);

  if (loading) return <div className="p-6 text-white">Loading...</div>;
  if (error) return <div className="p-6 text-white">Error: {error}</div>;
  if (!userId) return <div className="p-6 text-white">userId가 필요합니다.</div>;

  return (
    <div className="p-6 text-white space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">읽기 전용 임퍼소네이션</h1>
        <div className="text-sm text-neutral-400">userId: {userId}</div>
      </div>

      <div className="p-4 bg-neutral-900 border border-neutral-700 rounded">
        <h2 className="text-xl font-semibold mb-3">프로필</h2>
        {profile ? (
          <div className="space-y-1 text-sm text-neutral-200">
            <div>이름: {profile.name ?? "-"}</div>
            <div>닉네임: {profile.nickname ?? "-"}</div>
            <div>Email: {profile.email ?? "-"}</div>
            <div>관리자 메모: {profile.mgr_memo ?? "-"}</div>
            <div>비활성화: {profile.disabled_at ? profile.disabled_at : "활성"}</div>
          </div>
        ) : (
          <div className="text-neutral-400 text-sm">프로필이 없습니다.</div>
        )}
      </div>

      <div className="p-4 bg-neutral-900 border border-neutral-700 rounded">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">명식 목록</h2>
          {myeongsikId && <div className="text-xs text-neutral-400">myeongsikId: {myeongsikId}</div>}
        </div>

        {myeongsik.length === 0 ? (
          <div className="text-neutral-400 text-sm">명식이 없습니다.</div>
        ) : (
          <div className="space-y-3">
            {myeongsik.map((m) => (
              <div key={m.id} className="p-3 bg-neutral-800 border border-neutral-700 rounded">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{m.name || "(no name)"}</div>
                  {m.deleted_at && (
                    <span className="text-xs px-2 py-0.5 rounded bg-red-700 text-white">deleted</span>
                  )}
                </div>
                <div className="text-sm text-neutral-400">
                  Birth: {m.birth_json?.birthDay ?? "-"} ·{" "}
                  {m.created_at ? new Date(m.created_at).toLocaleString() : "-"}
                </div>
                {m.mgr_memo && (
                  <div className="text-sm text-neutral-300 whitespace-pre-wrap mt-1">메모: {m.mgr_memo}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
