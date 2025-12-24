// features/sidebar/ui/myeongsikCard/input/useMyeongsikCardInput.ts
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

type MyeongsikCardInput = {
  canManage: boolean;
};

export const useMyeongsikCardInput = (): MyeongsikCardInput => {
  // ✅ zustand hook은 유지(훅 순서/개수 깨짐 방지)
  // ✅ 반환은 무조건 true로 고정 (플랜/만료 무시)
  const canManage = useEntitlementsStore(() => true);
  return { canManage };
};
