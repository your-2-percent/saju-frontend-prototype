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

type AdminUserDetailSave = {
  handleCreateProfile: () => Promise<void>;
  handleSaveProfile: () => Promise<void>;
  toggleDisable: () => Promise<void>;
  handleRestoreAccount: () => Promise<void>;
  handleRestoreAllMyeongsik: () => Promise<void>;

  // ✅ 추가: 명식 1개 복구
  handleRestoreMyeongsik: (id: string) => Promise<void>;

  handleViewAsUser: (myeongsikId?: string) => void;
  toggleDeleteMyeongsik: (id: string, deleted: string | null | undefined) => Promise<void>;
  goTo: (url: string) => void;
};

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
    setSaving(true);
    try {
      await createProfile(userId);
    } finally {
      setSaving(false);
    }
    await refreshProfile();
  }, [userId, setSaving, refreshProfile]);

  const handleSaveProfile = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await updateProfile(userId, profile);
    } finally {
      setSaving(false);
    }
    await refreshProfile();
  }, [profile, userId, setSaving, refreshProfile]);

  // ✅ 여기만 운영형 RPC로 교체
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
        console.error("admin_set_profile_disabled error:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return;
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
    setSaving(true);
    try {
      await restoreAccount(userId);
    } finally {
      setSaving(false);
    }
    await refreshProfile();
    await refreshMyeongsik();
  }, [userId, setSaving, refreshProfile, refreshMyeongsik]);

  const handleRestoreAllMyeongsik = useCallback(async () => {
    setSaving(true);
    try {
      await restoreAllMyeongsik(userId);
    } finally {
      setSaving(false);
    }
    await refreshMyeongsik();
  }, [userId, setSaving, refreshMyeongsik]);

  // ✅ 추가: 명식 1개 복구(= deleted_at null)
  const handleRestoreMyeongsik = useCallback(
    async (id: string) => {
      if (!userId) return;
      if (!id) return;

      setSaving(true);
      try {
        await setMyeongsikDeleted(userId, id, null);
      } finally {
        setSaving(false);
      }
      await refreshMyeongsik();
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
      const next = deleted ? null : new Date().toISOString();
      await setMyeongsikDeleted(userId, id, next);
      await refreshMyeongsik();
    },
    [userId, refreshMyeongsik]
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

    // ✅ 리턴에 꼭 포함
    handleRestoreMyeongsik,

    handleViewAsUser,
    toggleDeleteMyeongsik,
    goTo,
  };
}
