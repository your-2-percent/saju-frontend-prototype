"use client";

import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import UserActivityHeartbeat from "@/shared/activity/UserActivityHeartbeat";
import { useAccountStatusStore } from "@/shared/lib/hooks/useAccountStatusStore";

export default function UserActivityHeartbeatGate() {
  const loc = useLocation();

  const loaded = useAccountStatusStore((s) => s.loaded);
  const disabledAt = useAccountStatusStore((s) => s.disabledAt);
  const userId = useAccountStatusStore((s) => s.userId);

  const enabled = !!userId && loaded && !disabledAt;

  const path = useMemo(() => {
    const p = loc.pathname || "/";
    const q = loc.search || "";
    return `${p}${q}`;
  }, [loc.pathname, loc.search]);

  return <UserActivityHeartbeat enabled={enabled} path={path} intervalMs={60_000} />;
}
