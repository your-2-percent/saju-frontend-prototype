import { useEffect, useMemo, useState } from "react";
import { AdfitSlot } from "./AdfitSlot";

type Props = {
  enabled: boolean;
  adUnit: string;
  width: number;
  height: number;

  mobileOnly?: boolean;
  hideForHours?: number;
  showAfterScrollY?: number;
  bottomOffsetPx?: number;
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

export function AdfitFloatingBar({
  enabled,
  adUnit,
  width,
  height,
  mobileOnly = true,
  hideForHours = 24,
  showAfterScrollY = 180,
  bottomOffsetPx = 64,
}: Props) {
  const storageKey = useMemo(() => `adfit_floating_hide_until:${adUnit}`, [adUnit]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const hideUntil = readHideUntil(storageKey);
    if (hideUntil > nowMs()) {
      setOpen(false);
      return;
    }

    const check = () => {
      const y = window.scrollY || 0;
      setOpen(y >= showAfterScrollY);
    };

    check();
    window.addEventListener("scroll", check, { passive: true });
    return () => window.removeEventListener("scroll", check);
  }, [enabled, showAfterScrollY, storageKey]);

  if (!enabled || !open) return null;

  const onClose = () => {
    writeHideUntil(storageKey, nowMs() + hideForHours * 60 * 60 * 1000);
    setOpen(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: bottomOffsetPx,
        zIndex: 60,
        paddingBottom: "env(safe-area-inset-bottom)",
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
      className={mobileOnly ? "block md:hidden" : undefined}
    >
      <div style={{ pointerEvents: "auto", width: "min(100%, 980px)", padding: 8 }}>
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
            enabled={enabled}
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
