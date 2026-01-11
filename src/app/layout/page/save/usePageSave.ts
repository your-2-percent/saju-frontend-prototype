import { useAppDbSync } from "@/shared/lib/db/useAppDbSync";
import { useAuthState } from "@/app/layout/page/saveInterface/useAuthState";
import type { PageInput } from "@/app/layout/page/input/usePageInput";

export function usePageSave(input: PageInput) {
  useAuthState({
    setUserId: input.setUserId,
    setIsLoggedIn: input.setIsLoggedIn,
    setAuthChecked: input.setAuthChecked,
  });

  useAppDbSync(input.userId);
}
