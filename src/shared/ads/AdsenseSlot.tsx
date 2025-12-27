// src/shared/ads/AdsenseSlot.tsx
import { useEffect, useMemo, useRef } from "react";
import { ensureAdsenseScript, pushAdsense } from "./adsenseScript";

type Props = {
  enabled: boolean;
  isVisible: boolean;

  clientId: string;
  slotId: string;

  className?: string;
  wrapperStyle?: React.CSSProperties;

  display?: "block" | "inline-block";
  format?: "auto" | "rectangle" | "vertical" | "horizontal";
  fullWidthResponsive?: boolean;

  minWidth?: number;
  minHeight?: number;

  /** 로컬 레이아웃 테스트용 (배포 전엔 false로!) */
  testMode?: boolean;

  /** 콘솔 디버그 로그 */
  debug?: boolean;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getBlockedByClientHint(): string | null {
  // DevTools Network에서 보통 ERR_BLOCKED_BY_CLIENT 뜨는데,
  // 콘솔만으로는 100% 못 잡음. 대신 fetch로 감지 시도.
  return null;
}

export function AdsenseSlot({
  enabled,
  isVisible,
  clientId,
  slotId,
  className,
  wrapperStyle,

  display = "block",
  format = "auto",
  fullWidthResponsive = true,

  minWidth,
  minHeight,

  testMode = false,
  debug = false,
}: Props) {
  const insRef = useRef<HTMLModElement | null>(null);

  const key = useMemo(() => `adsense:${clientId}:${slotId}`, [clientId, slotId]);
  const pushedRef = useRef(false);

  useEffect(() => {
    pushedRef.current = false;
  }, [clientId, slotId]);

  // ✅ 워밍업: enabled 되면 스크립트 먼저 로드
  useEffect(() => {
    if (!enabled) return;

    if (debug) {
      
      console.log("[AdsenseSlot] warmup start", { clientId, slotId, enabled, isVisible });
    }

    void ensureAdsenseScript(clientId)
      .then(() => {
        if (debug) {
          
          console.log("[AdsenseSlot] script ensured ✅", {
            hasAdsbygoogle: isBrowser() ? typeof (window as Window & { adsbygoogle?: unknown }).adsbygoogle : "no-window",
          });
        }
      })
      .catch((e) => {
        if (debug) {
          
          console.log("[AdsenseSlot] script ensure FAILED ❌", e);
        }
      });
  }, [enabled, clientId, slotId, isVisible, debug]);

  // ✅ 핵심: 실제 광고 push는 “보일 때” 한 번만
  useEffect(() => {
    if (!enabled) return;
    if (!isVisible) return;
    if (pushedRef.current) return;

    let alive = true;

    const run = async () => {
      try {
        const el = insRef.current;

        if (debug) {
          
          console.log("[AdsenseSlot] about to push", {
            elExists: Boolean(el),
            computedDisplay: el && isBrowser() ? getComputedStyle(el).display : null,
            rect: el ? el.getBoundingClientRect() : null,
          });
        }

        // ins가 DOM에 붙은 다음 tick에서 push
        await Promise.resolve();
        if (!alive) return;

        await ensureAdsenseScript(clientId);
        if (!alive) return;

        pushAdsense({});

        pushedRef.current = true;

        if (debug) {
          const el2 = insRef.current;
          const status = el2?.getAttribute("data-ad-status");
          
          console.log("[AdsenseSlot] pushed ✅", {
            statusAfterPush: status,
            rectAfterPush: el2 ? el2.getBoundingClientRect() : null,
          });

          // 차단 감지 시도(애드블록이면 fetch가 자주 실패)
          try {
            await fetch(
              `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
                clientId
              )}`,
              { mode: "no-cors" }
            );
            
            console.log("[AdsenseSlot] fetch(no-cors) ok (not definitive)");
          } catch (e) {
            
            console.log("[AdsenseSlot] fetch failed → adblock 가능성 큼", e);
          }

          const hint = getBlockedByClientHint();
          if (hint) {
            
            console.log("[AdsenseSlot] hint:", hint);
          }
        }
      } catch (e) {
        if (debug) {
          
          console.log("[AdsenseSlot] push FAILED ❌", e);
        }
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [enabled, isVisible, clientId, debug]);

  if (!enabled) return null;

  return (
    <div style={wrapperStyle}>
      <ins
        ref={insRef}
        key={key}
        className={["adsbygoogle", className].filter(Boolean).join(" ")}
        style={{
          display,
          minWidth: typeof minWidth === "number" ? `${minWidth}px` : undefined,
          minHeight: typeof minHeight === "number" ? `${minHeight}px` : undefined,
          // 디버그용 테두리(배포 시 지워도 됨)
          outline: debug ? "1px dashed rgba(0,0,0,0.25)" : undefined,
        }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
        {...(testMode ? { "data-adtest": "on" } : {})}
      />
    </div>
  );
}
