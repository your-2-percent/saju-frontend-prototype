import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import UserActivityHeartbeat from "@/shared/activity/UserActivityHeartbeat";
import FloatingKakaoChatButton from "@/shared/ui/FloatingKakaoChatButton";
import BasicUnlockedCelebration from "@/shared/ui/BasicUnlockedCelebration";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

type PlanUpper = "FREE" | "BASIC" | "PRO";

function normalizePlanUpper(v: unknown): PlanUpper {
  if (typeof v !== "string") return "FREE";
  const up = v.toUpperCase();
  if (up === "BASIC") return "BASIC";
  if (up === "PRO") return "PRO";
  return "FREE";
}

export default function HeartbeatGate() {
  const location = useLocation();
  const path = location.pathname + location.search;

  // ✅ 클라(일반 유저) 영역에서만 표시/기록
  const clientEnabled =
    !location.pathname.startsWith("/admin") &&
    !location.pathname.startsWith("/impersonate") &&
    !location.pathname.startsWith("/auth/callback");

  const [celebrate, setCelebrate] = useState(false);

  const loaded = useEntitlementsStore((s) => s.loaded);
  const loading = useEntitlementsStore((s) => s.loading);
  const userId = useEntitlementsStore((s) => s.userId);
  const planUpper = useEntitlementsStore((s) => normalizePlanUpper(s.plan));

  // 같은 마운트에서 RPC 난사 방지
  const triedRef = useRef(false);

  // ✅ 진입 시 entitlements 자동 로드 (이거 없으면 "이미 BASIC" 상태를 못 관측함)
  useEffect(() => {
    if (!clientEnabled) return;
    if (loaded || loading) return;
    void useEntitlementsStore.getState().loadFromServer();
  }, [clientEnabled, loaded, loading]);

  const tryCelebrateOnce = useCallback(async () => {
    if (triedRef.current) return;
    triedRef.current = true;

    const { data, error } = await supabase.rpc("mark_basic_celebrated");
    if (error) {
      // 여기서 터뜨리면 중복 가능성 생김. 에러면 그냥 조용히 패스하는 게 안전.
      console.warn("[basic celebration] rpc error:", error.message);
      return;
    }

    // data === true 일 때만: "이번 기기에서 최초"가 아니라 "계정 기준 최초"임 ✅
    if (data === true) {
      setCelebrate(true);
    }
  }, []);

  // ✅ 핵심: FREE -> BASIC “관측” 순간에만 폭죽
  // - 계정 기준 1회 보장: RPC가 true일 때만 open
  useEffect(() => {
    if (!clientEnabled) return;
    if (!loaded) return;
    if (!userId) return;

    // 오직 BASIC일 때만 시도
    if (planUpper !== "BASIC") return;

    void tryCelebrateOnce();
  }, [clientEnabled, loaded, userId, planUpper, tryCelebrateOnce]);

  const onBasicUnlocked = useCallback(() => {
    // 임계치 통과 순간 콜백(기존 유지)
    void (async () => {
      await useEntitlementsStore.getState().loadFromServer();

      const p = normalizePlanUpper(useEntitlementsStore.getState().plan);
      if (p !== "BASIC") return;

      // 이 순간에도 DB에 1회 기록 시도
      triedRef.current = false; // 혹시 이전 시도로 막혀있으면 풀고 재시도
      await tryCelebrateOnce();
    })();
  }, [tryCelebrateOnce]);

  return (
    <>
      <UserActivityHeartbeat enabled={clientEnabled} path={path} onBasicUnlocked={onBasicUnlocked} />
      <FloatingKakaoChatButton enabled={clientEnabled} />
      <BasicUnlockedCelebration open={celebrate} onClose={() => setCelebrate(false)} />
    </>
  );
}
