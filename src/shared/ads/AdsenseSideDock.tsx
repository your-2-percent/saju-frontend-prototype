// src/shared/ads/AdsenseSideDock.tsx
import { useEffect, useState } from "react";
import { AdsenseFixedSlot } from "./AdsenseFixedSlot";

type Props = {
  enabled: boolean;

  clientId: string;
  slotId: string;

  width: number;
  height: number;

  showAfterScrollY?: number;

  /** left/right 어디에 붙일지 */
  side?: "left" | "right";
  sidePx?: number;
  topPx?: number;

  breakpointClassName?: string;

  testMode?: boolean;
};

export function AdsenseSideDock({
  enabled,
  clientId,
  slotId,

  width,
  height,

  showAfterScrollY = 180,

  side = "left",
  sidePx = 16,
  topPx = 120,

  breakpointClassName = "hidden desk:block",

  testMode = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setOpen(false);
      setActivated(false);
      return;
    }

    // ✅ 스크립트 워밍업은 미리
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
  }, [enabled, showAfterScrollY]);

  if (!enabled) return null;

  return (
    <div
      className={breakpointClassName}
      style={{
        position: "fixed",
        ...(side === "left" ? { left: sidePx } : { right: sidePx }),
        top: topPx,
        zIndex: 60,
        pointerEvents: "none",

        // ✅ display:none 금지
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
          <div style={{ display: "flex", justifyContent: "center" }}>
            <AdsenseFixedSlot
              enabled={activated}
              isVisible={open}
              clientId={clientId}
              slotId={slotId}
              width={width}
              height={height}
              testMode={testMode}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
