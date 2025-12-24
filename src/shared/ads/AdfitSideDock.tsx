// src/shared/ads/AdfitSideDock.tsx
import { useEffect, useMemo, useState } from "react";
import { AdfitSlot } from "./AdfitSlot";

type Props = {
  enabled: boolean;

  adUnit: string;
  width: number;
  height: number;

  /** 스크롤 이만큼 내리면 노출 */
  showAfterScrollY?: number;

  /** 닫기 누르면 몇 시간 숨김 */
  hideForHours?: number;

  /** 우측/상단 위치 */
  rightPx?: number;
  topPx?: number;

  /** 너무 작은 화면에서 겹침 방지 */
  breakpointClassName?: string; // default: "hidden xl:block"
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
  hideForHours = 24,
  rightPx = 16,
  topPx = 120,
  breakpointClassName = "hidden desk:block",
}: Props) {
  const storageKey = useMemo(() => `adfit_side_hide_until:${adUnit}`, [adUnit]);

  const [open, setOpen] = useState(false);
  const [activated, setActivated] = useState(false); // ✅ 한번 열리면 슬롯 “한 번만” 활성화
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

    const check = () => {
      const y = window.scrollY || 0;
      const isOpen = y >= showAfterScrollY;

      setOpen(isOpen);

      // ✅ 최초로 열리는 순간에만 AdfitSlot을 활성화해서 ins 생성/스캔 1번만 유도
      if (isOpen) setActivated(true);
    };

    check();
    window.addEventListener("scroll", check, { passive: true });

    return () => {
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

        // ✅ 언마운트하지 말고 표시만 토글
        display: open ? "block" : "none",
      }}
    >
      <div style={{ pointerEvents: "auto" }}>
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
