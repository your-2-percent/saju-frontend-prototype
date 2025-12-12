"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";

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
  mgr_memo?: string | null;
};

export default function MyeongsikEditPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const [ms, setMs] = useState<MyeongsikRow | null>(null);
  const [saving, setSaving] = useState(false);

  // ------------------------
  // Fetch myeongsik
  // ------------------------
  const fetchMs = useCallback(async () => {
    const { data } = await supabase
      .from("myeongsik")
      .select("*")
      .eq("id", id)
      .maybeSingle() as unknown as { data: MyeongsikRow | null };

    setMs(data);
  }, [id]);

  useEffect(() => {
    fetchMs();
  }, [fetchMs]);

  if (!ms) return <div className="p-6 text-white">Loading...</div>;

  // ------------------------
  // Save updates
  // ------------------------
  const handleSave = async () => {
    setSaving(true);

    await supabase
      .from("myeongsik")
      .update({
        name: ms.name,
        birth_json: ms.birth_json,
        created_at: ms.created_at,
        mgr_memo: ms.mgr_memo,
      })
      .eq("id", id);

    setSaving(false);
    fetchMs();
  };

  // ------------------------
  // Delete / Restore
  // ------------------------
  const toggleDelete = async () => {
    const next = ms.deleted_at ? null : new Date().toISOString();

    await supabase
      .from("myeongsik")
      .update({ deleted_at: next })
      .eq("id", id);

    await logAudit({
      action: next ? "delete_myeongsik" : "restore_myeongsik",
      targetUserId: ms.user_id,
      targetRecordId: id,
      payload: { deleted_at: next, source: "admin_myeongsik_detail" },
    });

    fetchMs();
  };

  return (
    <div className="p-6 text-white max-w-xl mx-auto">
      <button
        className="mb-4 underline"
        onClick={() => (window.location.href = `/admin/user/${ms.user_id}`)}
      >
        ← Back to user
      </button>

      <h1 className="text-2xl font-bold mb-6">명식 수정</h1>

      {/* Name */}
      <div className="mb-4">
        <label className="block mb-1">이름</label>
        <input
          className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
          value={ms.name ?? ""}
          onChange={(e) => setMs({ ...ms, name: e.target.value })}
        />
      </div>

      {/* Birth JSON */}
      <div className="mb-4">
        <label className="block mb-1">Birth Day</label>
        <input
          className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
          value={ms.birth_json?.birthDay ?? ""}
          onChange={(e) =>
            setMs({
              ...ms,
              birth_json: { ...ms.birth_json, birthDay: e.target.value },
            })
          }
        />
      </div>

      {/* Created At */}
      <div className="mb-4">
        <label className="block mb-1">생성일 (created_at)</label>
        <input
          type="datetime-local"
          className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
          value={
            ms.created_at
              ? new Date(ms.created_at).toISOString().slice(0, 16)
              : ""
          }
          onChange={(e) => {
            const local = new Date(e.target.value);
            setMs({ ...ms, created_at: local.toISOString() });
          }}
        />
      </div>

      {/* Manager Memo */}
      <div className="mb-4">
        <label className="block mb-1">관리자 메모</label>
        <textarea
          className="w-full p-2 bg-neutral-800 border border-neutral-600 rounded"
          rows={3}
          value={ms.mgr_memo ?? ""}
          onChange={(e) => setMs({ ...ms, mgr_memo: e.target.value })}
        />
      </div>

      {/* Delete Toggle */}
      <button
        onClick={toggleDelete}
        className={`px-3 py-2 rounded mb-4 ${
          ms.deleted_at ? "bg-green-600" : "bg-red-600"
        }`}
      >
        {ms.deleted_at ? "복구하기" : "삭제하기"}
      </button>

      {/* Save */}
      <div>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-blue-600 rounded"
          disabled={saving}
        >
          저장하기
        </button>
      </div>
    </div>
  );
}
