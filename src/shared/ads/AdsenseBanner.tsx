// src/shared/ads/AdsenseBanner.tsx
import { useEffect, useMemo, useRef, useState } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown;
  }
}

type Props = {
  enabled: boolean;

  clientId: string; // ca-pub-...
  slotId: string; // data-ad-slot

  /** 배너 높이(px). 네 예시는 100 */
  heightPx?: number;

  /** 최대 너비(px). 네 예시는 750 */
  maxWidthPx?: number;

  /** 위 여백(px). 네 예시는 10 */
  marginTopPx?: number;

  /** 반응형 옵션 (data-full-width-responsive) */
  fullWidthResponsive?: boolean;

  /** 화면에 보일 때만 push (기본 true) */
  pushOnVisible?: boolean;

  /** 테스트 모드(data-adtest="on") */
  testMode?: boolean;

  className?: string;
  style?: React.CSSProperties;
};

const ADSENSE_BASE = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";

function hasPush(x: unknown): x is { push: (p: Record<string, unknown>) => void } {
  return typeof x === "object" && x !== null && "push" in x && typeof (x as { push?: unknown }).push === "function";
}

function getScriptEl(): HTMLScriptElement | null {
  return document.querySelector(`script[src^="${ADSENSE_BASE}"]`);
}

async function ensureAdsenseScript(clientId: string): Promise<void> {
  // 이미 로드되어 있으면 끝
  const existing = getScriptEl();
  if (existing) return;

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.async = true;
    s.src = `${ADSENSE_BASE}?client=${encodeURIComponent(clientId)}`;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load adsbygoogle.js"));
    document.head.appendChild(s);
  });
}

function pushAdsense(): void {
  const g = window.adsbygoogle;

  // adsbygoogle는 환경에 따라 배열/객체처럼 보이는데,
  // 우리는 push만 필요하니까 push 가능한지만 확인한다.
  if (hasPush(g)) {
    g.push({});
    return;
  }

  // 아직 준비 전이면 기본값 만들어서 push 시도
  // (구글 스크립트가 로드되면 이 객체를 사용)
  if (!window.adsbygoogle) {
    window.adsbygoogle = [];
  }

  const g2 = window.adsbygoogle;
  if (hasPush(g2)) {
    g2.push({});
  }
}

export function AdsenseBanner({
  enabled,
  clientId,
  slotId,

  heightPx = 100,
  maxWidthPx = 750,
  marginTopPx = 0,

  fullWidthResponsive = true,
  pushOnVisible = true,

  testMode = false,

  className,
  style,
}: Props) {
  const insRef = useRef<HTMLModElement | null>(null);
  const pushedRef = useRef(false);

  const key = useMemo(() => `adsense_banner:${clientId}:${slotId}`, [clientId, slotId]);
  const [visible, setVisible] = useState(!pushOnVisible);

  // slot 바뀌면 다시 push 가능
  useEffect(() => {
    pushedRef.current = false;
  }, [clientId, slotId]);

  // 스크립트 워밍업
  useEffect(() => {
    if (!enabled) return;
    void ensureAdsenseScript(clientId).catch(() => {
      // 애드블록 등으로 실패할 수 있음 (조용히)
    });
  }, [enabled, clientId]);

  // 보일 때만 push (IntersectionObserver)
  useEffect(() => {
    if (!enabled) return;
    if (!pushOnVisible) return;

    const el = insRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const ent = entries[0];
        if (!ent) return;
        if (ent.isIntersecting) setVisible(true);
      },
      { root: null, threshold: 0.05 }
    );

    io.observe(el);
    return () => io.disconnect();
  }, [enabled, pushOnVisible]);

  // 실제 push (1번만)
  useEffect(() => {
    if (!enabled) return;
    if (!visible) return;
    if (pushedRef.current) return;

    let alive = true;

    const run = async () => {
      try {
        await ensureAdsenseScript(clientId);
        if (!alive) return;

        // DOM 붙은 다음 tick에서 push
        await Promise.resolve();
        if (!alive) return;

        pushAdsense();
        pushedRef.current = true;
      } catch {
        // ignore
      }
    };

    void run();
    return () => {
      alive = false;
    };
  }, [enabled, visible, clientId]);

  if (!enabled) return null;

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
        marginTop: marginTopPx,
        ...style,
      }}
      className={className}
    >
      <ins
        ref={insRef}
        key={key}
        className="adsbygoogle"
        style={{
          display: "block",
          width: "100%",
          height: `${heightPx}px`,
          maxWidth: `${maxWidthPx}px`,
        }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-full-width-responsive={fullWidthResponsive ? "true" : "false"}
        {...(testMode ? { "data-adtest": "on" } : {})}
      />
    </div>
  );
}
