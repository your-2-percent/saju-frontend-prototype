"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import AdminModal from "../components/AdminModal";

type AuditLog = {
  id: string;
  action: string;
  actor_admin_id: string;
  target_user_id: string | null;
  target_record_id: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

const PAGE_SIZE = 50;

export default function AdminAuditPage() {
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [page, setPage] = useState(1);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(false);

  const deleteLog = useCallback(
    async (id: string) => {
      await supabase.from("audit_logs").delete().eq("id", id);
      setLogs((prev) => prev.filter((log) => log.id !== id));
    },
    []
  );

  const fetchLogs = useCallback(async () => {
    setLoading(true);

    const fromDate = new Date();
    if (dateRange !== "all") {
      fromDate.setDate(fromDate.getDate() - Number(dateRange));
    }

    let query = supabase
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    // 날짜 필터
    if (dateRange !== "all") {
      query = query.gte("created_at", fromDate.toISOString());
    }

    // 액션 필터
    if (actionFilter !== "all") {
      query = query.eq("action", actionFilter);
    }

    // 관리자 필터
    if (adminFilter !== "all") {
      query = query.eq("actor_admin_id", adminFilter);
    }

    const { data } = await query;

    let filtered = (data || []) as AuditLog[];

    // 검색 필터(JSON payload 포함)
    if (search.trim() !== "") {
      const term = search.toLowerCase();
      filtered = filtered.filter((log) => {
        const str =
          JSON.stringify(log).toLowerCase() +
          (log.payload ? JSON.stringify(log.payload).toLowerCase() : "");
        return str.includes(term);
      });
    }

    setLogs(filtered);
    setLoading(false);
  }, [page, actionFilter, adminFilter, dateRange, search]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-6">Audit Logs</h1>

      {/* --------------------- FILTER UI --------------------- */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">

        {/* Action Filter */}
        <select
          className="p-2 bg-neutral-800 rounded border border-neutral-600"
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
        >
          <option value="all">전체 Action</option>
          <option value="delete_myeongsik">명식 삭제</option>
          <option value="restore_myeongsik">명식 복구</option>
          <option value="update_profile">프로필 수정</option>
          <option value="impersonate_user">임퍼소네이션</option>
        </select>

        {/* Admin Filter */}
        <select
          className="p-2 bg-neutral-800 rounded border border-neutral-600"
          value={adminFilter}
          onChange={(e) => setAdminFilter(e.target.value)}
        >
          <option value="all">전체 관리자</option>
          <option value="나현">나현</option>
          <option value="system">System</option>
        </select>

        {/* 날짜 필터 */}
        <select
          className="p-2 bg-neutral-800 rounded border border-neutral-600"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="1">24시간</option>
          <option value="7">7일</option>
          <option value="30">30일</option>
          <option value="all">전체</option>
        </select>

        {/* 검색 */}
        <input
          className="p-2 bg-neutral-800 rounded border border-neutral-600"
          placeholder="검색 (payload 포함)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* --------------------- LOG LIST ---------------------- */}

      {loading ? (
        <div>Loading...</div>
      ) : (
        logs.map((log) => (
          <div
            key={log.id}
            className="p-4 bg-neutral-900 border border-neutral-700 rounded mb-4 cursor-pointer hover:bg-neutral-800"
            onClick={() => {
              setSelected(log);
              setModalOpen(true);
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-lg">{log.action}</div>
              <button
                className="px-2 py-1 text-xs bg-red-700 hover:bg-red-600 rounded cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  void deleteLog(log.id);
                }}
              >
                삭제
              </button>
            </div>

            <div className="text-sm mt-1 text-neutral-400">
              <div>Actor: {log.actor_admin_id}</div>
              <div>Target User: {log.target_user_id || "-"}</div>
              <div>Target Record: {log.target_record_id || "-"}</div>
              <div>Time: {new Date(log.created_at).toLocaleString()}</div>
            </div>

            {log.payload && (
              <pre className="mt-3 text-xs bg-neutral-800 p-2 rounded">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            )}
          </div>
        ))
      )}

      {/* --------------------- Pagination --------------------- */}
      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          className="px-3 py-1 bg-neutral-800 border border-neutral-600 rounded disabled:opacity-40 cursor-pointer"
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ← 이전으로
        </button>

        <span className="text-neutral-400">Page {page}</span>

        <button
          className="px-3 py-1 bg-neutral-800 border border-neutral-600 rounded cursor-pointer"
          onClick={() => setPage((p) => p + 1)}
        >
          다음으로 →
        </button>
      </div>

      <AdminModal open={modalOpen} onClose={() => setModalOpen(false)}>
        {selected && (
          <div>
            <h2 className="text-xl font-bold mb-3">{selected.action}</h2>

            <div className="text-sm text-neutral-400 space-y-1 mb-4">
              <div>Actor: {selected.actor_admin_id}</div>
              <div>Target User: {selected.target_user_id ?? "-"}</div>
              <div>Target Record: {selected.target_record_id ?? "-"}</div>
              <div>
                Time: {new Date(selected.created_at).toLocaleString()}
              </div>
            </div>

            <h3 className="text-lg font-semibold mb-2">Payload</h3>

            <pre className="text-xs bg-neutral-800 p-3 rounded whitespace-pre-wrap">
              {JSON.stringify(selected.payload, null, 2)}
            </pre>
          </div>
        )}
      </AdminModal>

    </div>
  );
}
