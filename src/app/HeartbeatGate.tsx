import { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import UserActivityHeartbeat from "@/shared/activity/UserActivityHeartbeat";
import FloatingKakaoChatButton from "@/shared/ui/FloatingKakaoChatButton";
import BasicUnlockedCelebration from "@/shared/ui/BasicUnlockedCelebration";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

export default function HeartbeatGate() {
  const location = useLocation();

  const path = location.pathname + location.search;

  // ✅ 클라(일반 유저) 영역에서만 표시/기록
  const clientEnabled =
    !location.pathname.startsWith("/admin") &&
    !location.pathname.startsWith("/impersonate") &&
    !location.pathname.startsWith("/auth/callback");

  const [celebrate, setCelebrate] = useState(false);

  const onBasicUnlocked = useCallback(() => {
    useEntitlementsStore.getState().loadFromServer(); // 경로만 맞춰
    setCelebrate(true);
  }, []);

  return (
    <>
      <UserActivityHeartbeat enabled={clientEnabled} path={path} onBasicUnlocked={onBasicUnlocked} />

      <FloatingKakaoChatButton enabled={clientEnabled} />

      <BasicUnlockedCelebration open={celebrate} onClose={() => setCelebrate(false)} />
    </>
  );
}
