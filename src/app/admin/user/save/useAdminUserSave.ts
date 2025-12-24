// src/app/admin/user/save/useAdminUserSave.ts
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
import { fetchUserActivity } from "@/app/admin/user/save/repo/fetchUserActivity";

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
    } finally {
      setLoading(false);
    }
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

      const [profiles, msRows, entRows, activityRows] = await Promise.all([
        fetchProfiles(safeIds),
        fetchMyeongsikRows(safeIds),
        fetchEntitlements(safeIds), // EntRowRaw[]일 가능성 OK (calc에서 Raw로 받음)
        fetchUserActivity(safeIds),
      ]);

      const nextSummaries = buildUserSummaries({
        userIds: safeIds,
        profiles,
        myeongsikRows: msRows,
        entRows,
        activityRows,
      });

      setSummaries(nextSummaries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
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

        const can_use_myo_viewer = draft.myoViewer === "ON";

        const payload = {
          user_id: uid,
          ...preset,
          starts_at,
          expires_at,
          can_use_myo_viewer,
        };

        await upsertEntitlements(payload);

        // ✅ Draft.lastSavedAt가 number니까 숫자로 저장
        setDraft(uid, { saving: false, lastSavedAt: Date.now() });

        await refresh();
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
