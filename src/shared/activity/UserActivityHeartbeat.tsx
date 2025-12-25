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
  onBasicUnlocked?: () => void;
  onTotalActiveMs?: (ms: number) => void;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function parsePingResult(v: unknown): PingResult | null {
  if (!isRecord(v)) return null;

  const ok = typeof v.ok === "boolean" ? v.ok : undefined;
  const total_active_ms = typeof v.total_active_ms === "number" ? v.total_active_ms : undefined;
  const upgraded_to_basic =
    typeof v.upgraded_to_basic === "boolean" ? v.upgraded_to_basic : undefined;

  return { ok, total_active_ms, upgraded_to_basic };
}

export default function UserActivityHeartbeat({
  enabled = true,
  intervalMs = 60_000,
  path,
  onBasicUnlocked,
  onTotalActiveMs,
}: Props) {
  const runningRef = useRef(false);
  const lastPathRef = useRef<string>("");
  const firedRewardRef = useRef(false);

  const userIdRef = useRef<string | null>(null);
  const intervalIdRef = useRef<number | null>(null);
  const startTimeoutRef = useRef<number | null>(null);
  const lastTickAtRef = useRef<number>(0);

  useEffect(() => {
    lastPathRef.current = path ?? "";
  }, [path]);

  useEffect(() => {
    // ✅ 유저 id 캐싱 + 로그인 변화 감지
    let unsub: (() => void) | null = null;

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      userIdRef.current = data.session?.user?.id ?? null;

      const res = supabase.auth.onAuthStateChange((_event, session) => {
        userIdRef.current = session?.user?.id ?? null;
        // 로그인 바뀌면 중복 방지 플래그 초기화
        firedRewardRef.current = false;
      });

      const sub = (res as unknown as { data?: { subscription?: { unsubscribe: () => void } } })
        .data?.subscription;

      if (sub && typeof sub.unsubscribe === "function") {
        unsub = () => sub.unsubscribe();
      }
    };

    void init();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const tick = async (reason: "interval" | "visible" | "init") => {
      // ✅ 숨김 상태면 ping 안 함
      if (document.visibilityState !== "visible") return;

      // ✅ visibilitychange 연타/interval 근접 호출 방지(10초 쿨다운)
      const now = Date.now();
      if (reason !== "init" && now - lastTickAtRef.current < 10_000) return;
      lastTickAtRef.current = now;

      if (runningRef.current) return;
      runningRef.current = true;

      try {
        const uid = userIdRef.current;
        if (!uid) return;

        const lastPath = lastPathRef.current || null;

        const { data, error } = await supabase.rpc("ping_activity", { p_last_path: lastPath });
        if (error) return;

        const parsed = parsePingResult(data);
        if (!parsed) return;

        if (typeof parsed.total_active_ms === "number") {
          onTotalActiveMs?.(parsed.total_active_ms);
        }

        if (parsed.upgraded_to_basic === true && !firedRewardRef.current) {
          firedRewardRef.current = true;
          onBasicUnlocked?.();
        }
      } finally {
        runningRef.current = false;
      }
    };

    // ✅ 첫 실행
    void tick("init");

    // ✅ 시작 지터(0~5초)
    const jitter = Math.floor(Math.random() * 5_000);
    startTimeoutRef.current = window.setTimeout(() => {
      void tick("interval");
      intervalIdRef.current = window.setInterval(() => void tick("interval"), intervalMs);
    }, jitter);

    const onVisibility = () => {
      if (document.visibilityState === "visible") void tick("visible");
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);

      if (startTimeoutRef.current !== null) {
        window.clearTimeout(startTimeoutRef.current);
        startTimeoutRef.current = null;
      }

      if (intervalIdRef.current !== null) {
        window.clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [enabled, intervalMs, onBasicUnlocked, onTotalActiveMs]);

  return null;
}
