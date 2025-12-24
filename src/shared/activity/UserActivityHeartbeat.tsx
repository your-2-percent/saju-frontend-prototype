// src/shared/activity/UserActivityHeartbeat.tsx
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  enabled?: boolean;
  intervalMs?: number; // 기본 60초
};

export default function UserActivityHeartbeat({
  enabled = true,
  intervalMs = 60_000,
}: Props) {
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    //let cancelled = false;

    const tick = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user) return;

        const lastPath =
          typeof window !== "undefined" ? window.location.pathname + window.location.search : null;

        await supabase
          .from("user_activity")
          .upsert(
            {
              user_id: user.id,
              last_seen_at: new Date().toISOString(),
              last_path: lastPath,
            },
            { onConflict: "user_id" }
          );
      } catch {
        // ignore (adblock/csp 같은 게 아니라 그냥 네트워크/권한 문제일 수 있음)
      } finally {
        runningRef.current = false;
      }
    };

    // 처음 1번 바로 찍고
    void tick();

    // 주기적으로 찍기
    timerRef.current = window.setInterval(() => void tick(), intervalMs);

    // 탭 다시 활성화될 때도 한번 더
    const onVisibility = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      //cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, intervalMs]);

  return null;
}
