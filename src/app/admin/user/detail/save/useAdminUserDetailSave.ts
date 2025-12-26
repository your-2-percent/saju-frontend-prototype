import { useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { MyeongsikRow, ProfileRow } from "@/app/admin/user/detail/model/types";
import {
  createProfile,
  fetchMyeongsik,
  fetchProfile,
  restoreAccount,
  restoreAllMyeongsik,
  setMyeongsikDeleted,
  updateProfile,
} from "@/app/admin/user/detail/saveInterface/adminUserDetailRepo";

type UseAdminUserDetailSaveArgs = {
  userId: string;
  profile: ProfileRow | null;
  setProfile: (next: ProfileRow | null) => void;
  setMyeongsikList: (next: MyeongsikRow[]) => void;
  setSaving: (next: boolean) => void;
};

export type AdminUserDetailSave = {
  handleCreateProfile: () => Promise<void>;
  handleSaveProfile: () => Promise<void>;
  toggleDisable: () => Promise<void>;
  handleRestoreAccount: () => Promise<void>;
  handleRestoreAllMyeongsik: () => Promise<void>;

  handleRestoreMyeongsik: (id: string) => Promise<void>;

  handleViewAsUser: (myeongsikId?: string) => void;
  toggleDeleteMyeongsik: (id: string, deleted: string | null | undefined) => Promise<void>;
  goTo: (url: string) => void;
};

function logRpcError(tag: string, error: unknown) {
  // supabase-js error shape 대응(대충이라도 로그는 남김)
  if (error && typeof error === "object") {
    const e = error as { message?: string; details?: string; hint?: string; code?: string };
    console.error(tag, {
      message: e.message,
      details: e.details,
      hint: e.hint,
      code: e.code,
    });
    return;
  }
  console.error(tag, error);
}

export function useAdminUserDetailSave({
  userId,
  profile,
  setProfile,
  setMyeongsikList,
  setSaving,
}: UseAdminUserDetailSaveArgs): AdminUserDetailSave {
  const refreshProfile = useCallback(async () => {
    const data = await fetchProfile(userId);
    setProfile(data);
  }, [userId, setProfile]);

  const refreshMyeongsik = useCallback(async () => {
    const data = await fetchMyeongsik(userId);
    setMyeongsikList(data);
  }, [userId, setMyeongsikList]);

  useEffect(() => {
    void refreshProfile();
    void refreshMyeongsik();
  }, [refreshProfile, refreshMyeongsik]);

  const handleCreateProfile = useCallback(async () => {
    if (!userId) return;

    setSaving(true);
    try {
      await createProfile(userId);
      await refreshProfile();
    } catch (e) {
      console.error("handleCreateProfile failed:", e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [userId, setSaving, refreshProfile]);

  const handleSaveProfile = useCallback(async () => {
    if (!userId) return;
    if (!profile) return;

    setSaving(true);
    try {
      await updateProfile(userId, profile);
      await refreshProfile();
    } catch (e) {
      console.error("handleSaveProfile failed:", e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [userId, profile, setSaving, refreshProfile]);

  // ✅ 운영형 RPC
  const toggleDisable = useCallback(async () => {
    if (!userId) return;
    if (!profile) return;

    setSaving(true);
    try {
      const nextDisabled = profile.disabled_at == null;

      const { data, error } = await supabase.rpc("admin_set_profile_disabled", {
        p_target_user_id: userId,
        p_disabled: nextDisabled,
      });

      if (error) {
        logRpcError("admin_set_profile_disabled error:", error);
        throw error;
      }

      setProfile({
        ...profile,
        disabled_at: typeof data === "string" ? data : null,
      });
    } finally {
      setSaving(false);
    }
  }, [userId, profile, setProfile, setSaving]);

  const handleRestoreAccount = useCallback(async () => {
    if (!userId) return;

    setSaving(true);
    try {
      await restoreAccount(userId);
      await refreshProfile();
      await refreshMyeongsik();
    } catch (e) {
      console.error("handleRestoreAccount failed:", e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [userId, setSaving, refreshProfile, refreshMyeongsik]);

  const handleRestoreAllMyeongsik = useCallback(async () => {
    if (!userId) return;

    setSaving(true);
    try {
      await restoreAllMyeongsik(userId);
      await refreshMyeongsik();
    } catch (e) {
      console.error("handleRestoreAllMyeongsik failed:", e);
      throw e;
    } finally {
      setSaving(false);
    }
  }, [userId, setSaving, refreshMyeongsik]);

  // ✅ 명식 1개 복구 (= deleted_at null)
  const handleRestoreMyeongsik = useCallback(
    async (id: string) => {
      if (!userId) return;
      if (!id) return;

      setSaving(true);
      try {
        await setMyeongsikDeleted(userId, id, null);
        await refreshMyeongsik();
      } catch (e) {
        console.error("handleRestoreMyeongsik failed:", e);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [userId, setSaving, refreshMyeongsik]
  );

  const handleViewAsUser = useCallback(
    (myeongsikId?: string) => {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      const url = myeongsikId
        ? `${base}/impersonate?userId=${userId}&myeongsikId=${myeongsikId}`
        : `${base}/impersonate?userId=${userId}`;

      window.open(url, "_blank");
    },
    [userId]
  );

  const toggleDeleteMyeongsik = useCallback(
    async (id: string, deleted: string | null | undefined) => {
      if (!userId) return;
      if (!id) return;

      const next = deleted ? null : new Date().toISOString();

      setSaving(true);
      try {
        await setMyeongsikDeleted(userId, id, next);
        await refreshMyeongsik();
      } catch (e) {
        console.error("toggleDeleteMyeongsik failed:", e);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [userId, setSaving, refreshMyeongsik]
  );

  const goTo = useCallback((url: string) => {
    window.location.href = url;
  }, []);

  return {
    handleCreateProfile,
    handleSaveProfile,
    toggleDisable,
    handleRestoreAccount,
    handleRestoreAllMyeongsik,
    handleRestoreMyeongsik,
    handleViewAsUser,
    toggleDeleteMyeongsik,
    goTo,
  };
}
