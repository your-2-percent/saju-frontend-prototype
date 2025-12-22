import { useState, type Dispatch, type SetStateAction } from "react";
import type { MyeongsikRow, ProfileRow } from "@/app/admin/user/detail/model/types";

type AdminUserDetailInput = {
  profile: ProfileRow | null;
  setProfile: Dispatch<SetStateAction<ProfileRow | null>>;
  myeongsikList: MyeongsikRow[];
  setMyeongsikList: Dispatch<SetStateAction<MyeongsikRow[]>>;
  saving: boolean;
  setSaving: Dispatch<SetStateAction<boolean>>;
};

export function useAdminUserDetailInput(): AdminUserDetailInput {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [myeongsikList, setMyeongsikList] = useState<MyeongsikRow[]>([]);
  const [saving, setSaving] = useState(false);

  return {
    profile,
    setProfile,
    myeongsikList,
    setMyeongsikList,
    saving,
    setSaving,
  };
}
