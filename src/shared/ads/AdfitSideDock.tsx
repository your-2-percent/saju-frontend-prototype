// src/shared/ads/AdfitSideDock.tsx
import { useEffect, useMemo, useState } from "react";
import { AdfitSlot } from "./AdfitSlot";

type Props = {
  enabled: boolean;

  adUnit: string;
  width: number;
  height: number;

  showAfterScrollY?: number;
  hideForHours?: number;

  rightPx?: number;
  topPx?: number;

  breakpointClassName?: string;
};

function nowMs(): number {
  return Date.now();
}

function readHideUntil(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

function writeHideUntil(key: string, untilMs: number): void {
  try {
    localStorage.setItem(key, String(untilMs));
  } catch {
    // ignore
  }
}

export function AdfitSideDock({
  enabled,
  adUnit,
  width,
  height,
  showAfterScrollY = 180,
  hideForHours = 3,
  rightPx = 16,
  topPx = 120,
  breakpointClassName = "hidden desk:block",
}: Props) {
  const storageKey = useMemo(() => `adfit_side_hide_until:${adUnit}`, [adUnit]);

  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false);
  const [hiddenByUser, setHiddenByUser] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      setActivated(false);
      setHiddenByUser(false);
      return;
    }

    const hideUntil = readHideUntil(storageKey);
    if (hideUntil > nowMs()) {
      setHiddenByUser(true);
      setOpen(false);
      setActivated(false);
      return;
    }

    setHiddenByUser(false);

    // ✅ 핵심: 스크립트 워밍업(boot)은 미리 시작
    setActivated(true);

    let raf = 0;

    const check = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || 0;
        setOpen(y >= showAfterScrollY);
      });
    };

    check();
    window.addEventListener("scroll", check, { passive: true });

    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      window.removeEventListener("scroll", check);
    };
  }, [enabled, showAfterScrollY, storageKey]);

  if (!enabled) return null;
  if (hiddenByUser) return null;

  const onClose = () => {
    writeHideUntil(storageKey, nowMs() + hideForHours * 60 * 60 * 1000);
    setHiddenByUser(true);
    setOpen(false);
    setActivated(false);
  };

  return (
    <div
      className={breakpointClassName}
      style={{
        position: "fixed",
        right: rightPx,
        top: topPx,
        zIndex: 60,
        pointerEvents: "none",

        // ✅ display:none은 렌더링 자체를 막아서 “보일 때부터 시작”이 됨
        // 대신 visibility/opacity로 숨겨두면 DOM은 살아있어서 전환이 빠름
        visibility: open ? "visible" : "hidden",
        opacity: open ? 1 : 0,
        transition: "opacity 150ms ease",
      }}
    >
      <div style={{ pointerEvents: open ? "auto" : "none" }}>
        <div
          style={{
            borderRadius: 12,
            background: "rgba(0,0,0,0.04)",
            backdropFilter: "blur(6px)",
            padding: 8,
          }}
        >
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              aria-label="광고 닫기"
              style={{
                border: 0,
                background: "transparent",
                cursor: "pointer",
                fontSize: 14,
                padding: "6px 8px",
              }}
            >
              닫기
            </button>
          </div>

          <AdfitSlot
            enabled={activated}
            isVisible={open} // ✅ 보일 때만 scan
            adUnit={adUnit}
            width={width}
            height={height}
            wrapperStyle={{ display: "flex", justifyContent: "center" }}
          />
        </div>
      </div>
    </div>
  );
}
