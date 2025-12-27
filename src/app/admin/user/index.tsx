// src/app/admin/user/list/AdminUserListPage.tsx
import { useEffect, useMemo } from "react";
import { useAdminUserInput } from "./input/useAdminUserInput";
import { PAGE_SIZE, useAdminUserSave } from "./save/useAdminUserSave";
import { PLAN_OPTIONS, isPlanTier, planLabel } from "./calc/planUtils";
import type { Draft } from "./model/types";
import type { PlanTier } from "@/shared/billing/entitlements";

function formatLastSeen(lastSeenAt?: string | null): string {
  if (!lastSeenAt) return "기록 없음";
  const t = Date.parse(lastSeenAt);
  if (!Number.isFinite(t)) return "기록 없음";

  const diff = Date.now() - t;
  const sec = Math.floor(diff / 1000);
  if (sec < 15) return "방금";
  if (sec < 60) return `${sec}초 전`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  return `${day}일 전`;
}

function formatTotalActiveMs(ms?: number | null): string {
  if (!ms || ms <= 0) return "0분";

  const totalSec = Math.floor(ms / 1000);
  const day = Math.floor(totalSec / 86400);
  const hour = Math.floor((totalSec % 86400) / 3600);
  const min = Math.floor((totalSec % 3600) / 60);

  if (day >= 1) return `${day}일 ${hour}시간`;
  if (hour >= 1) return `${hour}시간 ${min}분`;
  return `${min}분`;
}

function toYMDInput(iso?: string | null): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  return new Date(t).toISOString().slice(0, 10);
}

function periodLabelFromRow(startsAt?: string | null, expiresAt?: string | null): string {
  const s = toYMDInput(startsAt);
  const e = toYMDInput(expiresAt);
  if (!s && !e) return "기간 없음";
  if (s && !e) return `${s} ~`;
  if (!s && e) return `~ ${e}`;
  return `${s} ~ ${e}`;
}

function initDraftsFromRows(
  prev: Record<string, Draft>,
  rows: Array<{
    user_id: string;
    plan: PlanTier | null;
    starts_at: string | null;
    expires_at: string | null;
    can_use_myo_viewer: boolean | null;
  }>
): Record<string, Draft> {
  const next: Record<string, Draft> = { ...prev };

  for (const r of rows) {
    const plan: PlanTier = r.plan ?? "FREE";
    const startDate = toYMDInput(r.starts_at);
    const endDate = toYMDInput(r.expires_at);
    const myoViewer: Draft["myoViewer"] = r.can_use_myo_viewer === true ? "ON" : "OFF";

    const cur = next[r.user_id];

    if (!cur) {
      next[r.user_id] = {
        plan,
        startDate,
        endDate,
        myoViewer,
        saving: false,
      };
      continue;
    }

    if (cur.saving) continue;

    if (cur.plan !== plan || cur.startDate !== startDate || cur.endDate !== endDate || cur.myoViewer !== myoViewer) {
      next[r.user_id] = { ...cur, plan, startDate, endDate, myoViewer };
    }
  }

  return next;
}

export default function AdminUserListPage() {
  const input = useAdminUserInput();
  const { search, setSearch, tab, setTab, sort, setSort, page, setPage, draftByUser, setDraftByUser, setDraft } =
    input;

  const { rows, totalCount, loading, error, fetchList, saveEntitlements } = useAdminUserSave();

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);

  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, sort]);

  useEffect(() => {
    void fetchList({ search, tab, sort, page });
  }, [fetchList, search, tab, sort, page]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages, setPage]);

  useEffect(() => {
    setDraftByUser((prev) => initDraftsFromRows(prev, rows));
  }, [rows, setDraftByUser]);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Users</h1>

      <div className="flex flex-col md:flex-row gap-2 md:items-center mb-4">
        <input
          className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded w-full max-w-sm"
          placeholder="Search (name, email, userId...)"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />

        <div className="flex gap-2">
          <select
            className="px-2 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
            value={tab}
            onChange={(e) => {
              const v = e.target.value;
              setTab(v === "DISABLED" ? "DISABLED" : v === "ALL" ? "ALL" : "ACTIVE");
            }}
          >
            <option value="ACTIVE">활성</option>
            <option value="DISABLED">비활성</option>
            <option value="ALL">전체</option>
          </select>

          <select
            className="px-2 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm"
            value={sort}
            onChange={(e) => {
              const v = e.target.value;
              if (
                v === "LAST_SEEN_DESC" ||
                v === "LAST_SEEN_ASC" ||
                v === "CREATED_DESC" ||
                v === "CREATED_ASC" ||
                v === "PLAN_DESC" ||
                v === "ONLINE_ACTIVE_MS_DESC" ||
                v === "TOTAL_ACTIVE_MS_DESC"
              ) {
                setSort(v);
              }
            }}
          >
            <option value="LAST_SEEN_DESC">최근 접속순</option>
            <option value="CREATED_DESC">가입 최신순</option>
            <option value="PLAN_DESC">등급순</option>
            <option value="ONLINE_ACTIVE_MS_DESC">접속중+누적시간순</option>
            <option value="TOTAL_ACTIVE_MS_DESC">누적시간순</option>
            <option value="LAST_SEEN_ASC">오래전 접속순</option>
            <option value="CREATED_ASC">가입 오래된순</option>
          </select>
        </div>
      </div>

      {error && <div className="text-red-400 mb-2">{error}</div>}
      {loading && <div>Loading...</div>}

      <div className="space-y-3">
        {rows.map((r) => {
          const displayName = r.name || r.nickname || "(no profile)";
          const email = r.email || "";

          const draft = draftByUser[r.user_id] ?? {
            plan: "FREE",
            startDate: "",
            endDate: "",
            myoViewer: "OFF" as const,
            saving: false,
            lastSavedAt: undefined,
          };

          const nowMs = Date.now();
          const active =
            (r.starts_at ? Date.parse(r.starts_at) <= nowMs : true) &&
            (r.expires_at ? Date.parse(r.expires_at) > nowMs : true);

          // ✅ 여기 핵심: string 금지. PlanTier로 확정
          const rawPlan: PlanTier = r.plan ?? "FREE";
          const effectivePlan: PlanTier = active ? rawPlan : "FREE";

          const viewerNow = r.can_use_myo_viewer === true ? "ON" : "OFF";
          const lastSeenAt = r.last_seen_at ?? null;
          const online = r.online === true;
          const totalActiveMs = r.total_active_ms ?? null;

          return (
            <div key={r.user_id} className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg hover:bg-neutral-800">
              <div className="font-semibold text-lg flex flex-col desk:flex-row item-start desk:items-center justify-between gap-3">
                <div className="min-w-0 flex flex-col desk:flex-row item-start desk:items-center gap-2">
                  <span className="text-nowrap mr-1">{displayName}</span>
                  {email ? <span className="text-sm text-neutral-400">({email})</span> : null}

                  <div className="flex items-center gap-1">
                    <span
                      className={`text-[11px] px-2 py-0.5 rounded-full border ${
                        online
                          ? "bg-emerald-900/40 border-emerald-700 text-emerald-300"
                          : "bg-neutral-800 border-neutral-700 text-neutral-300"
                      }`}
                      title={lastSeenAt ? new Date(lastSeenAt).toLocaleString() : "기록 없음"}
                    >
                      {online ? "온라인" : "오프라인"} · {formatLastSeen(lastSeenAt)}
                    </span>

                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full border bg-neutral-800 border-neutral-700 text-neutral-300"
                      title="누적 접속시간"
                    >
                      누적 {formatTotalActiveMs(totalActiveMs)}
                    </span>
                  </div>
                </div>

                <span className="text-neutral-500 text-sm shrink-0">{r.user_id}</span>
              </div>

              <div className="text-sm text-neutral-400 mt-1">
                명식 {r.myeongsik_count ?? 0}개
                {lastSeenAt ? <> · 마지막 접속 {new Date(lastSeenAt).toLocaleString()}</> : <> · 마지막 접속 기록 없음</>}
                <> · 누적 {formatTotalActiveMs(totalActiveMs)}</>
              </div>

              <div className="text-sm text-neutral-400 mt-1">
                플랜 {planLabel(effectivePlan)} · {periodLabelFromRow(r.starts_at, r.expires_at)} · 묘운 뷰어 {viewerNow}
                {!active && r.plan && r.plan !== "FREE" ? " (만료됨)" : ""}
              </div>

              <div className="mt-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="mb-1">
                    
                    <input
                      type="date"
                      className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm"
                      value={draft.startDate}
                      onChange={(e) => setDraft(r.user_id, { startDate: e.target.value })}
                    />

                    <span className="text-neutral-500 mx-1">~</span>

                    <input
                      type="date"
                      className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm"
                      value={draft.endDate}
                      onChange={(e) => setDraft(r.user_id, { endDate: e.target.value })}
                    />
                  </div>

                  <select
                    className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm"
                    value={draft.plan}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!isPlanTier(v)) return;
                      setDraft(r.user_id, { plan: v });
                    }}
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>

                  <select
                    className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm"
                    value={draft.myoViewer}
                    onChange={(e) => setDraft(r.user_id, { myoViewer: e.target.value === "ON" ? "ON" : "OFF" })}
                  >
                    <option value="ON">묘운 뷰어 ON</option>
                    <option value="OFF">묘운 뷰어 OFF</option>
                  </select>

                  <button
                    type="button"
                    disabled={draft.saving}
                    onClick={() => void saveEntitlements(r.user_id, draft, input.setDraft, () => fetchList({ search, tab, sort, page }))}
                    className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 cursor-pointer"
                  >
                    {draft.saving ? "저장 중..." : "저장"}
                  </button>

                  <button
                    type="button"
                    onClick={() => (location.href = `/admin/user/${r.user_id}`)}
                    className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 cursor-pointer"
                  >
                    상세
                  </button>
                </div>

                {draft.lastSavedAt != null ? (
                  <div className="text-xs text-emerald-400">저장됨 · {new Date(draft.lastSavedAt).toLocaleString()}</div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3 mt-6">
        <button
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
          className="px-3 py-1 border border-neutral-700 rounded disabled:opacity-50"
        >
          이전
        </button>

        <span>
          {page} / {totalPages} (총 {totalCount}명)
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-1 border border-neutral-700 rounded disabled:opacity-50"
        >
          다음
        </button>
      </div>
    </div>
  );
}
