import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { buildNatalPillarsFromMs } from "@/features/prompt/natalFromMs";
import { useLuckChain } from "@/features/prompt/useLuckChain";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

const isGZ = (s: unknown): s is string => typeof s === "string" && s.length >= 2;

const isValidPillars = (arr: unknown): arr is [string, string, string, string] =>
  Array.isArray(arr) && arr.length === 4 && arr.every(isGZ);

type UseMainAppCalcArgs = {
  list: MyeongSik[];
  currentId: string;
  settings: { sinsalBase: string };
  emptyMs: MyeongSik;
};

type MainAppCalc = {
  current: MyeongSik | undefined;
  hasCurrent: boolean;
  msForHooks: MyeongSik;
  natal: unknown;
  chain: ReturnType<typeof useLuckChain>;
  isValidPillars: (arr: unknown) => arr is [string, string, string, string];
  canAdd: boolean;
  voidBasis: "day" | "year";
  samjaeBasis: "day" | "year";
};

export function useMainAppCalc({
  list,
  currentId,
  settings,
  emptyMs,
}: UseMainAppCalcArgs): MainAppCalc {
  const current = useMemo(
    () => list.find((m) => m.id === currentId) ?? list[0],
    [list, currentId]
  );

  const hasCurrent = list.length > 0 && !!current && typeof current.birthDay === "string";
  const msForHooks = hasCurrent ? current : emptyMs;

  const natal = useMemo(() => buildNatalPillarsFromMs(msForHooks), [msForHooks]);
  const chain = useLuckChain(msForHooks);

  const canAdd = useEntitlementsStore((s) => s.canAddMyeongsik(list.length).ok);

  const voidBasis = settings.sinsalBase === "일" ? "day" : "year";
  const samjaeBasis = settings.sinsalBase === "일" ? "day" : "year";

  return {
    current,
    hasCurrent,
    msForHooks,
    natal,
    chain,
    isValidPillars,
    canAdd,
    voidBasis,
    samjaeBasis,
  };
}
