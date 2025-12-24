import React, { useEffect, useMemo, useRef } from "react";
import { loadAdfitScript } from "./adfitScript";

export type AdfitSlotProps = {
  adUnit: string;
  width: number;
  height: number;

  enabled?: boolean;
  className?: string;
  wrapperStyle?: React.CSSProperties;

  /** 영역 미리 확보 */
  reserveSpace?: boolean;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function destroyAdfitUnit(adUnit: string) {
  const w = window as unknown as Record<string, unknown>;
  const adfit = w["adfit"];
  if (!isRecord(adfit)) return;

  const destroy = adfit["destroy"];
  if (typeof destroy === "function") {
    // destroy(unit)
    destroy.call(adfit, adUnit);
  }
}

export function AdfitSlot({
  adUnit,
  width,
  height,
  enabled = true,
  className,
  wrapperStyle,
  reserveSpace = true,
}: AdfitSlotProps) {
  const mountedOnceRef = useRef(false);

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

  useEffect(() => {
    if (!enabled) return;

    // ✅ 같은 슬롯이 리렌더링될 때마다 스캔 난사 방지
    if (mountedOnceRef.current) return;
    mountedOnceRef.current = true;

    void (async () => {
      await loadAdfitScript();
    })();

    return () => {
      // SPA 이동/언마운트 시 정리 (재노출 안 되는 케이스 방지)
      destroyAdfitUnit(adUnit);
      mountedOnceRef.current = false;
    };
    // adUnit 바뀌는 케이스가 있으면 의도적으로 새로 실행되게 deps에 포함
  }, [enabled, adUnit]);

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
