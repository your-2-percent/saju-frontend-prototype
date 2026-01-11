import type { MyeongSik } from "@/shared/lib/storage";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";

export function addMyeongSik(payload: MyeongSik) {
  const store = useMyeongSikStore.getState();
  store.add(payload);
}
