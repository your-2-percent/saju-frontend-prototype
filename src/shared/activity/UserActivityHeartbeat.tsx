import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

type PingResult = {
  ok?: boolean;
  total_active_ms?: number;
  upgraded_to_basic?: boolean;
};

type Props = {
  enabled?: boolean;
  intervalMs?: number;
  path?: string;
  onBasicUnlocked?: () => void; // ✅ 추가
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parsePingResult(v: unknown): PingResult | null {
  if (!isRecord(v)) return null;

  const ok = typeof v.ok === "boolean" ? v.ok : undefined;
  const total_active_ms = typeof v.total_active_ms === "number" ? v.total_active_ms : undefined;
  const upgraded_to_basic = typeof v.upgraded_to_basic === "boolean" ? v.upgraded_to_basic : undefined;

  return { ok, total_active_ms, upgraded_to_basic };
}

export default function UserActivityHeartbeat({
  enabled = true,
  intervalMs = 60_000,
  path,
  onBasicUnlocked,
}: Props) {
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const lastPathRef = useRef<string>("");
  const firedRewardRef = useRef(false); // ✅ 중복 모달 방지(클라 측)

  useEffect(() => {
    lastPathRef.current = path ?? "";
  }, [path]);

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const { data: sessionRes } = await supabase.auth.getSession();
        const session = sessionRes.session;
        if (!session?.user?.id) return;

        const lastPath = lastPathRef.current || null;

        const { data, error } = await supabase.rpc("ping_activity", { p_last_path: lastPath });

        if (error) return;

        const parsed = parsePingResult(data);
        if (!parsed) return;

        if (parsed.upgraded_to_basic === true && !firedRewardRef.current) {
          firedRewardRef.current = true;
          onBasicUnlocked?.();
        }
      } finally {
        runningRef.current = false;
      }
    };

    void tick();
    timerRef.current = window.setInterval(() => void tick(), intervalMs);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void tick();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, intervalMs, onBasicUnlocked]);

  return null;
}
