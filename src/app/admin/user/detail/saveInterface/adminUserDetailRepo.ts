import { supabase } from "@/lib/supabase";
import { logAudit } from "@/lib/audit";
import type { MyeongsikRow, ProfileRow } from "@/app/admin/user/detail/model/types";

type SingleProfileResult = { data: ProfileRow | null };

type MyeongsikListResult = { data: MyeongsikRow[] | null };

export const fetchProfile = async (userId: string): Promise<ProfileRow | null> => {
  const { data } = (await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle()) as unknown as SingleProfileResult;

  return data ?? null;
};

export const fetchMyeongsik = async (userId: string): Promise<MyeongsikRow[]> => {
  const { data } = (await supabase
    .from("myeongsik")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })) as unknown as MyeongsikListResult;

  return data ?? [];
};

export const createProfile = async (userId: string) => {
  await supabase.from("profiles").insert({
    user_id: userId,
    name: "",
    nickname: "",
    email: "",
    mgr_memo: "",
  });
};

export const updateProfile = async (userId: string, profile: ProfileRow) => {
  await supabase
    .from("profiles")
    .update({
      name: profile.name,
      nickname: profile.nickname,
      email: profile.email,
      mgr_memo: profile.mgr_memo,
    })
    .eq("user_id", userId);
};

export const setProfileDisabled = async (userId: string, disabledAt: string | null) => {
  await supabase.from("profiles").update({ disabled_at: disabledAt }).eq("user_id", userId);
};

export const restoreAccount = async (userId: string) => {
  await supabase.from("profiles").update({ disabled_at: null }).eq("user_id", userId);
  await supabase.from("myeongsik").update({ deleted_at: null }).eq("user_id", userId);
  await logAudit({
    action: "restore_account",
    targetUserId: userId,
    payload: { source: "admin_user_detail" },
  });
};

export const restoreAllMyeongsik = async (userId: string) => {
  await supabase.from("myeongsik").update({ deleted_at: null }).eq("user_id", userId);
  await logAudit({
    action: "restore_myeongsik_all",
    targetUserId: userId,
    payload: { source: "admin_user_detail" },
  });
};

export const setMyeongsikDeleted = async (
  userId: string,
  id: string,
  deletedAt: string | null
) => {
  await supabase.from("myeongsik").update({ deleted_at: deletedAt }).eq("id", id);
  await logAudit({
    action: deletedAt ? "delete_myeongsik" : "restore_myeongsik",
    targetUserId: userId,
    targetRecordId: id,
    payload: { deleted_at: deletedAt, source: "admin_user_detail" },
  });
};
