import { useCallback, useState } from "react";
import type { Draft, UserSummary } from "../model/types";
import { buildUserSummaries } from "../calc/adminUserCalc";
import { getPreset, toKstIsoFromDateInput } from "../calc/planUtils";
import {
  fetchEntitlements,
  fetchMyeongsikRows,
  fetchProfiles,
  fetchUserIds,
  upsertEntitlements,
} from "../saveInterface/adminUserRepo";

export function useAdminUserSave() {
  const [userIds, setUserIds] = useState<string[]>([]);
  const [summaries, setSummaries] = useState<UserSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUserIdList = useCallback(async (search: string, onResetPage: () => void) => {
    setLoading(true);
    setError(null);
    try {
      const ids = await fetchUserIds(search);
      setUserIds(ids);
      onResetPage();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
    setLoading(false);
  }, []);

  const fetchSummaries = useCallback(async (pagedUserIds: string[]) => {
    if (!pagedUserIds.length) {
      setSummaries([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const safeIds = pagedUserIds.length ? pagedUserIds : ["__NO_MATCH__"];
      const [profiles, msRows, entRows] = await Promise.all([
        fetchProfiles(safeIds),
        fetchMyeongsikRows(safeIds),
        fetchEntitlements(safeIds), // ✅ entRows에 can_use_myo_viewer도 포함되게 repo 수정 필요
      ]);

      const nextSummaries = buildUserSummaries({
        userIds: safeIds,
        profiles,
        myeongsikRows: msRows,
        entRows,
      });

      setSummaries(nextSummaries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    }

    setLoading(false);
  }, []);

  const saveEntitlements = useCallback(
    async (
      uid: string,
      draft: Draft | undefined,
      setDraft: (uid: string, patch: Partial<Draft>) => void,
      refresh: () => Promise<void>
    ) => {
      if (!draft) return;
      setDraft(uid, { saving: true });

      try {
        const preset = getPreset(draft.plan);

        const starts_at = draft.startDate ? toKstIsoFromDateInput(draft.startDate, false) : null;
        const expires_at = draft.endDate ? toKstIsoFromDateInput(draft.endDate, true) : null;

        // saveEntitlements 안에서 payload 만들 때
        const can_use_myo_viewer = draft.myoViewer === "ON";

        const payload = {
          user_id: uid,
          ...preset,
          starts_at,
          expires_at,
          can_use_myo_viewer, // ✅ 추가
        };

        await upsertEntitlements(payload);
        setDraft(uid, { saving: false, lastSavedAt: Date.now() });
        await refresh();

        await upsertEntitlements(payload);
      } catch (e) {
        setDraft(uid, { saving: false });
        setError(e instanceof Error ? e.message : "저장 실패");
      }

      
    },
    []
  );

  return {
    userIds,
    summaries,
    loading,
    error,
    setError,
    fetchUserIdList,
    fetchSummaries,
    saveEntitlements,
  };
}
