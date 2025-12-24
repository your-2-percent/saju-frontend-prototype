// src/shared/ads/AdfitSlot.tsx
import React, { useEffect, useMemo, useRef } from "react";
import { loadAdfitScript } from "./adfitScript";

export type AdfitSlotProps = {
  adUnit: string;
  width: number;
  height: number;

  enabled?: boolean;
  isVisible?: boolean; // ✅ 추가
  className?: string;
  wrapperStyle?: React.CSSProperties;
  reserveSpace?: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function destroyAdfitUnit(adUnit: string) {
  const w: unknown = window;
  if (!isRecord(w)) return;

  const adfit = w["adfit"];
  if (!isRecord(adfit)) return;

  const destroy = adfit["destroy"];
  if (typeof destroy === "function") {
    try {
      destroy.call(adfit, adUnit);
    } catch {
      // ignore
    }
  }
}

export function AdfitSlot({
  adUnit,
  width,
  height,
  enabled = true,
  isVisible = true,
  className,
  wrapperStyle,
  reserveSpace = true,
}: AdfitSlotProps) {
  const bootedRef = useRef(false);
  const scannedRef = useRef(false);

  const outerStyle = useMemo<React.CSSProperties>(() => {
    const base: React.CSSProperties = reserveSpace
      ? {
          width: "100%",
          minHeight: height,
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
        }
      : { width: "100%" };

    return { ...base, ...wrapperStyle };
  }, [height, reserveSpace, wrapperStyle]);

  // ✅ 1) boot: enabled 되는 순간 미리 로드
  useEffect(() => {
    if (!enabled) return;
    if (bootedRef.current) return;
    bootedRef.current = true;

    let cancelled = false;

    void (async () => {
      try {
        await loadAdfitScript({ mode: "boot" });
        if (cancelled) return;
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  // ✅ 2) scan: 실제로 보이는 순간 1번만
  useEffect(() => {
    if (!enabled) return;
    if (!isVisible) return;
    if (scannedRef.current) return;
    scannedRef.current = true;

    let cancelled = false;

    void (async () => {
      try {
        await loadAdfitScript({ mode: "scan" });
        if (cancelled) return;
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, isVisible]);

  useEffect(() => {
    return () => {
      destroyAdfitUnit(adUnit);
      bootedRef.current = false;
      scannedRef.current = false;
    };
  }, [adUnit]);

  if (!enabled) return null;

  return (
    <div className={className} style={outerStyle}>
      <div style={reserveSpace ? { width, height } : undefined}>
        <ins
          className="kakao_ad_area"
          style={{ display: "none" }}
          data-ad-unit={adUnit}
          data-ad-width={String(width)}
          data-ad-height={String(height)}
        />
      </div>
    </div>
  );
}
