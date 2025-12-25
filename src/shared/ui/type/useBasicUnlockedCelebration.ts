// useBasicUnlockedCelebration.ts
import { useEffect, useMemo, useState } from "react";

export type PlanTier = "FREE" | "BASIC" | "PRO" | "PRO_SELECT" | "ADMIN";

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

function safeRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

function isPlanTier(v: string): v is PlanTier {
  return v === "FREE" || v === "BASIC" || v === "PRO" || v === "PRO_SELECT" || v === "ADMIN";
}

/**
 * ✅ "플랜이 BASIC 이상이 된 걸 처음 관측했을 때" open=true
 * - 서버에서 자동 승급돼도 OK
 * - 새로고침해서 처음 BASIC으로 들어와도 OK
 *
 * 주의: 딱 1번만 뜨게 하려고 userId 별로 localStorage 플래그 저장함
 */
export function useBasicUnlockedCelebration(args: {
  userId: string | null | undefined;
  loaded: boolean;
  currentPlan: PlanTier;
}): { open: boolean; close: () => void; resetForTest: () => void } {
  const { userId, loaded, currentPlan } = args;
  const [open, setOpen] = useState(false);

  const keys = useMemo(() => {
    const uid = userId ?? "anon";
    return {
      celebrated: `celebrated_basic:${uid}`,
      lastPlan: `seen_plan:${uid}`,
    };
  }, [userId]);

  useEffect(() => {
    if (!loaded) return;
    if (!userId) return;

    // 이미 한 번 축하했으면 끝
    const already = safeGet(keys.celebrated) === "1";
    if (already) {
      // lastPlan은 최신으로 계속 갱신해두면 디버깅에도 좋음
      safeSet(keys.lastPlan, currentPlan);
      return;
    }

    const prevRaw = safeGet(keys.lastPlan);
    const prev = prevRaw && isPlanTier(prevRaw) ? prevRaw : "FREE";

    // ✅ FREE(미만) -> BASIC(이상) "최초 관측"이면 오픈
    const crossed = planRank(currentPlan) >= planRank("BASIC") && planRank(prev) < planRank("BASIC");
    if (crossed) {
      setOpen(true);
      safeSet(keys.celebrated, "1"); // 한 번만 뜨게
    }

    safeSet(keys.lastPlan, currentPlan);
  }, [loaded, userId, currentPlan, keys]);

  const close = () => setOpen(false);

  // 테스트용: 다시 보고 싶으면 reset
  const resetForTest = () => {
    safeRemove(keys.celebrated);
    safeRemove(keys.lastPlan);
    setOpen(false);
  };

  return { open, close, resetForTest };
}
