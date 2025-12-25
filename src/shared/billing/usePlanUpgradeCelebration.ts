import { useEffect, useRef } from "react";

export type PlanTier = "FREE" | "BASIC" | "PRO" | "PRO_SELECT" | "ADMIN";

type FireworksFn = () => void;

function planRank(plan: PlanTier | null | undefined): number {
  switch (plan) {
    case "FREE":
    case null:
    case undefined:
      return 0;
    case "BASIC":
      return 1;
    case "PRO":
    case "PRO_SELECT":
      return 2;
    case "ADMIN":
      return 3;
    default:
      return 0;
  }
}

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function isPlanTier(v: string): v is PlanTier {
  return v === "FREE" || v === "BASIC" || v === "PRO" || v === "PRO_SELECT" || v === "ADMIN";
}

/**
 * ✅ "플랜이 올라간 걸 처음 '관측'했을 때" 폭죽 터뜨림.
 * - 백그라운드에서 자동 승급돼도 OK
 * - 새로고침해서 처음 BASIC이 보여도 OK
 */
export function usePlanUpgradeCelebration(args: {
  userId: string | null | undefined;
  loaded: boolean;
  currentPlan: PlanTier; // 이미 effective 계산된 값 넣어
  onFireworks: FireworksFn;
}): void {
  const { userId, loaded, currentPlan, onFireworks } = args;

  const didRunRef = useRef(false);

  useEffect(() => {
    if (!loaded) return;
    if (!userId) return;

    // 같은 세션에서 중복 폭죽 방지(불필요한 난사 방지)
    if (didRunRef.current) return;
    didRunRef.current = true;

    const key = `seen_plan:${userId}`;
    const prevRaw = safeGet(key);
    const prev = prevRaw && isPlanTier(prevRaw) ? prevRaw : "FREE";

    // ✅ 플랜이 상승한 순간/최초 관측 시 폭죽
    if (planRank(currentPlan) > planRank(prev)) {
      onFireworks();
    }

    safeSet(key, currentPlan);
  }, [userId, loaded, currentPlan, onFireworks]);
}
