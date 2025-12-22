import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";

export function useMyeongSikRepo() {
  const add = useMyeongSikStore((s) => s.add);
  return { add };
}
