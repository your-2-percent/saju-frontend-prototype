// src/shared/ads/AdsenseFixedSlot.tsx
import { useEffect, useRef } from "react";
import { ensureAdsenseScript, pushAdsense } from "./adsenseScript";

type Props = {
  enabled: boolean;
  isVisible: boolean;
  clientId: string;
  slotId: string;
  width: number;
  height: number;
  testMode?: boolean;
};

export function AdsenseFixedSlot({
  enabled,
  isVisible,
  clientId,
  slotId,
  width,
  height,
  testMode = false,
}: Props) {
  const pushedRef = useRef(false);
  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    pushedRef.current = false;
  }, [clientId, slotId, width, height]);

  useEffect(() => {
    if (!enabled) return;
    void ensureAdsenseScript(clientId).catch(() => {});
  }, [enabled, clientId]);

  useEffect(() => {
    if (!enabled) return;
    if (!isVisible) return;
    if (pushedRef.current) return;

    let alive = true;
    const run = async () => {
      try {
        await Promise.resolve();
        if (!alive) return;

        await ensureAdsenseScript(clientId);
        if (!alive) return;

        pushAdsense({});
        pushedRef.current = true;
      } catch {
        console.log()
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [enabled, isVisible, clientId]);

  if (!enabled) return null;

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: "inline-block", width, height }}
      data-ad-client={clientId}
      data-ad-slot={slotId}
      {...(testMode ? { "data-adtest": "on" } : {})}
    />
  );
}
