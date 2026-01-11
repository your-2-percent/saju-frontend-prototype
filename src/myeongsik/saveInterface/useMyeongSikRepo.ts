import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";

export function useMyeongSikRepo() {
  const add = useMyeongSikStore((s) => s.add);
  return { add };
}
