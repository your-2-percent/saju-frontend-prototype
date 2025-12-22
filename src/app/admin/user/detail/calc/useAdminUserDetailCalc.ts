import type { ProfileRow } from "@/app/admin/user/detail/model/types";

type AdminUserDetailCalc = {
  isDisabled: boolean;
  hasProfile: boolean;
};

export function useAdminUserDetailCalc(profile: ProfileRow | null): AdminUserDetailCalc {
  return {
    isDisabled: !!profile?.disabled_at,
    hasProfile: !!profile,
  };
}
