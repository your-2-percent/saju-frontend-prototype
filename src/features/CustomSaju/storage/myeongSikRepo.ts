import type { MyeongSik } from "@/shared/lib/storage";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";

export function addMyeongSik(payload: MyeongSik) {
  const store = useMyeongSikStore.getState();
  store.add(payload);
}
