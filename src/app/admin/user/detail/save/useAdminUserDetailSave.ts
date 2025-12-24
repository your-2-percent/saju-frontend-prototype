import { useCallback, useEffect } from "react";
import type { MyeongsikRow, ProfileRow } from "@/app/admin/user/detail/model/types";
import {
  createProfile,
  fetchMyeongsik,
  fetchProfile,
  restoreAccount,
  restoreAllMyeongsik,
  setMyeongsikDeleted,
  setProfileDisabled,
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
    await createProfile(userId);
    setSaving(false);
    await refreshProfile();
  }, [userId, setSaving, refreshProfile]);

  const handleSaveProfile = useCallback(async () => {
    if (!profile) return;
    setSaving(true);
    await updateProfile(userId, profile);
    setSaving(false);
    await refreshProfile();
  }, [profile, userId, setSaving, refreshProfile]);

  const toggleDisable = useCallback(async () => {
    if (!profile) return;
    const nextDisabled = profile.disabled_at ? null : new Date().toISOString();
    await setProfileDisabled(userId, nextDisabled);
    await refreshProfile();
  }, [profile, userId, refreshProfile]);

  const handleRestoreAccount = useCallback(async () => {
    setSaving(true);
    await restoreAccount(userId);
    setSaving(false);
    await refreshProfile();
    await refreshMyeongsik();
  }, [userId, setSaving, refreshProfile, refreshMyeongsik]);

  const handleRestoreAllMyeongsik = useCallback(async () => {
    setSaving(true);
    await restoreAllMyeongsik(userId);
    setSaving(false);
    await refreshMyeongsik();
  }, [userId, setSaving, refreshMyeongsik]);

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
    handleViewAsUser,
    toggleDeleteMyeongsik,
    goTo,
  };
}
