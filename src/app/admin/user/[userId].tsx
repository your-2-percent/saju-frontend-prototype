"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type BirthJson = {
  birthDay?: string;
  [key: string]: unknown;
};

type MyeongsikRow = {
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
  nickname?: string | null;
  email?: string | null;
  mgr_memo?: string | null;
  disabled_at?: string | null;
};

export default function AdminUserDetailPage({ params }: { params: { userId: string } }) {
  const userId = params.userId;

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [myeongsikList, setMyeongsikList] = useState<MyeongsikRow[]>([]);
  const [saving, setSaving] = useState(false);

  // ------------------------
  // Fetch profile
  // ------------------------
  const fetchProfile = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle() as unknown as { data: ProfileRow | null };

    setProfile(data);
  }, [userId]);

  // ------------------------
  // Fetch myeongsik
  // ------------------------
  const fetchMyeongsik = useCallback(async () => {
    const { data } = await supabase
      .from("myeongsik")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }) as unknown as {
      data: MyeongsikRow[] | null;
    };

    setMyeongsikList(data || []);
  }, [userId]);

  // ------------------------
  // Initial load
  // ------------------------
  useEffect(() => {
    fetchProfile();
    fetchMyeongsik();
  }, [fetchProfile, fetchMyeongsik]);

  // ------------------------
  // Create profile
  // ------------------------
  const handleCreateProfile = async () => {
    setSaving(true);
    await supabase.from("profiles").insert({
      user_id: userId,
      name: "",
      nickname: "",
      email: "",
      mgr_memo: "",
    });
    setSaving(false);
    fetchProfile();
  };

  // ------------------------
  // Save profile edits
  // ------------------------
  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);

    await supabase
      .from("profiles")
      .update({
        name: profile.name,
        nickname: profile.nickname,
        email: profile.email,
        mgr_memo: profile.mgr_memo,
      })
      .eq("user_id", userId);

    setSaving(false);
    fetchProfile();
  };

  // ------------------------
  // Toggle account disabled
  // ------------------------
  const toggleDisable = async () => {
    if (!profile) return;

    const nextDisabled = profile.disabled_at ? null : new Date().toISOString();

    await supabase
      .from("profiles")
      .update({ disabled_at: nextDisabled })
      .eq("user_id", userId);

    fetchProfile();
  };

  // ------------------------
  // Delete / Restore myeongsik
  // ------------------------
  const toggleDeleteMyeongsik = async (
    id: string,
    deleted: string | null | undefined
  ) => {
    const next = deleted ? null : new Date().toISOString();

    await supabase.from("myeongsik").update({ deleted_at: next }).eq("id", id);

    fetchMyeongsik();
  };

  // ------------------------
  // Navigation helper
  // ------------------------
  const goTo = (url: string) => {
    window.location.href = url;
  };

  // ------------------------
  // UI
  // ------------------------
  return (
    <div className="p-6 text-white">
      <button className="mb-4 underline" onClick={() => goTo("/admin/user")}>
        ← 유저목록으로 돌아가기
      </button>

      <h1 className="text-2xl font-bold mb-4">유저 정보</h1>

      {/* Profile Section */}
      <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">프로필</h2>
        </div>

        {!profile && (
          <button
            onClick={handleCreateProfile}
            className="px-3 py-2 bg-blue-600 rounded cursor-pointer"
            disabled={saving}
          >
            프로필 생성하기
          </button>
        )}

        {profile && (
          <div className="space-y-3">
            <div>
              <label>이름</label>
              <input
                className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
                value={profile.name ?? ""}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            <div>
              <label>닉네임</label>
              <input
                className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
                value={profile.nickname ?? ""}
                onChange={(e) => setProfile({ ...profile, nickname: e.target.value })}
              />
            </div>

            <div>
              <label>Email</label>
              <input
                className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
                value={profile.email ?? ""}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>

            <div>
              <label>관리자 메모</label>
              <textarea
                className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
                rows={3}
                value={profile.mgr_memo ?? ""}
                onChange={(e) => setProfile({ ...profile, mgr_memo: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSaveProfile}
                className="px-3 py-2 bg-green-600 rounded cursor-pointer"
                disabled={saving}
              >
                저장하기
              </button>

              <button
                onClick={toggleDisable}
                className={`px-3 py-2 rounded cursor-pointer ${
                  profile.disabled_at ? "bg-yellow-600" : "bg-gray-600"
                }`}
              >
                {profile.disabled_at ? "계정 활성화" : "계정 비활성화"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Myeongsik Section */}
      <div className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">명식 목록</h2>

        {myeongsikList.map((m) => (
          <div
            key={m.id}
            className="p-3 bg-neutral-800 border border-neutral-700 rounded mb-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">{m.name || "(no name)"}</div>
                <div className="text-sm text-neutral-400">
                  Birth: {m.birth_json?.birthDay ?? "-"} ·{" "}
                  {m.created_at ? new Date(m.created_at).toLocaleString() : "-"}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  className="px-2 py-1 border border-neutral-500 rounded cursor-pointer" 
                  onClick={() => goTo(`/admin/myeongsik/${m.id}`)}
                >
                  수정
                </button>

                <button
                  className={`px-2 py-1 rounded cursor-pointer ${
                    m.deleted_at ? "bg-green-600" : "bg-red-600"
                  }`}
                  onClick={() => toggleDeleteMyeongsik(m.id, m.deleted_at)}
                >
                  {m.deleted_at ? "복구" : "삭제"}
                </button>
              </div>
            </div>
          </div>
        ))}

        {myeongsikList.length === 0 && (
          <div className="text-neutral-400">명식이 없습니다.</div>
        )}
      </div>
    </div>
  );
}
