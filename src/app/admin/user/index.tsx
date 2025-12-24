// src/app/admin/user/AdminUserListPage.tsx
import { useEffect, useMemo } from "react";
import { useAdminUserInput } from "./input/useAdminUserInput";
import { useAdminUserSave } from "./save/useAdminUserSave";
import { getPagedUserIds, getTotalPages, initDrafts } from "./calc/adminUserCalc";
import { PLAN_OPTIONS, isPlanTier, periodLabel, planLabel } from "./calc/planUtils";

export default function AdminUserListPage() {
  const input = useAdminUserInput();
  const { search, setSearch, page, setPage, draftByUser, setDraftByUser, setDraft } = input;

  const { userIds, summaries, loading, error, fetchUserIdList, fetchSummaries, saveEntitlements } =
    useAdminUserSave();

  const pagedUserIds = useMemo(() => getPagedUserIds(userIds, page), [userIds, page]);
  const totalPages = useMemo(() => getTotalPages(userIds), [userIds]);

  useEffect(() => {
    fetchUserIdList(search, () => setPage(1));
  }, [fetchUserIdList, search, setPage]);

  useEffect(() => {
    fetchSummaries(pagedUserIds);
  }, [fetchSummaries, pagedUserIds]);

  useEffect(() => {
    setDraftByUser((prev) => initDrafts(prev, summaries));
  }, [summaries, setDraftByUser]);

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4">Users</h1>

      <input
        className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded w-full max-w-sm mb-4"
        placeholder="Search user (name, email, birth, userId...)"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {error && <div className="text-red-400 mb-2">{error}</div>}
      {loading && <div>Loading...</div>}

      <div className="space-y-3">
        {summaries.map((s) => {
          const displayName = s.profile?.name || s.profile?.nickname || "(no profile)";
          const email = s.profile?.email || "";

          const draft = draftByUser[s.user_id] ?? {
            plan: "FREE",
            startDate: "",
            endDate: "",
            myoViewer: "OFF" as const,
            saving: false,
            lastSavedAt: null as string | null,
          };

          const nowMs = Date.now();
          const active =
            (s.ent?.starts_at ? Date.parse(s.ent.starts_at) <= nowMs : true) &&
            (s.ent?.expires_at ? Date.parse(s.ent.expires_at) > nowMs : true);

          const effectivePlan = active ? s.ent?.plan : "FREE";

          // ✅ 묘운: 기간 영향 X
          const viewerNow = s.ent?.can_use_myo_viewer === true ? "ON" : "OFF";

          return (
            <div
              key={s.user_id}
              className="p-4 bg-neutral-900 border border-neutral-700 rounded-lg hover:bg-neutral-800"
            >
              <div className="font-semibold text-lg flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-nowrap mr-1">{displayName}</span>
                  {email ? (
                    <span className="text-sm text-neutral-400 truncate">({email})</span>
                  ) : null}
                </div>

                <span className="text-neutral-500 text-sm shrink-0">{s.user_id}</span>
              </div>

              <div className="text-sm text-neutral-400 mt-1">
                명식 {s.myeongsikCount}개
                {s.lastCreatedAt && <> · 최근 생성 {new Date(s.lastCreatedAt).toLocaleString()}</>}
              </div>

              <div className="text-sm text-neutral-400 mt-1">
                플랜 {planLabel(effectivePlan)} · {periodLabel(s.ent)} · 묘운 뷰어 {viewerNow}
                {!active && s.ent?.plan && s.ent.plan !== "FREE" ? " (만료됨)" : ""}
              </div>


              <div className="mt-3 flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs text-neutral-400">시작</label>
                  <input
                    type="date"
                    className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm"
                    value={draft.startDate}
                    onChange={(e) => setDraft(s.user_id, { startDate: e.target.value })}
                  />

                  <span className="text-neutral-500">~</span>

                  <label className="text-xs text-neutral-400">종료</label>
                  <input
                    type="date"
                    className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm"
                    value={draft.endDate}
                    onChange={(e) => setDraft(s.user_id, { endDate: e.target.value })}
                  />

                  <select
                    className="px-2 py-1 bg-neutral-800 border border-neutral-700 rounded text-sm"
                    value={draft.plan}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!isPlanTier(v)) return;
                      setDraft(s.user_id, { plan: v });
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
                    onChange={(e) => {
                      const v = e.target.value === "OFF" ? "OFF" : "ON";
                      setDraft(s.user_id, { myoViewer: v });
                    }}
                  >
                    <option value="ON">묘운 뷰어 ON</option>
                    <option value="OFF">묘운 뷰어 OFF</option>
                  </select>

                  <button
                    type="button"
                    disabled={draft.saving}
                    onClick={() =>
                      void saveEntitlements(s.user_id, draft, input.setDraft, () =>
                        fetchSummaries(pagedUserIds)
                      )
                    }
                    className="px-3 py-1 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 cursor-pointer"
                  >
                    {draft.saving ? "저장 중..." : "저장"}
                  </button>

                  <button
                    type="button"
                    onClick={() => (location.href = `/admin/user/${s.user_id}`)}
                    className="px-3 py-1 rounded bg-neutral-700 hover:bg-neutral-600 cursor-pointer"
                  >
                    상세
                  </button>
                </div>

                {draft.lastSavedAt ? (
                  <div className="text-xs text-emerald-400">
                    저장됨 · {new Date(draft.lastSavedAt).toLocaleString()}
                  </div>
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
          {page} / {totalPages}
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
