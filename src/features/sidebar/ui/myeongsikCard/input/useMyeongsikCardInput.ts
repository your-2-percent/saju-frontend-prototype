import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

type MyeongsikCardInput = {
  canManage: boolean;
};

export const useMyeongsikCardInput = (): MyeongsikCardInput => {
  const canManage = useEntitlementsStore((s) => {
    if (!s.loaded) return false;
    if (!s.isActiveNow()) return false;
    return s.canManageMyeongsik;
  });

  return { canManage };
};
