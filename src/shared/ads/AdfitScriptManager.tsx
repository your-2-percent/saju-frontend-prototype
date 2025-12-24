// src/shared/ads/AdfitScriptManager.tsx
import { useEffect } from "react";
import { loadAdfitScript } from "./adfitScript";

type Props = {
  enabled: boolean;
};

export function AdfitScriptManager({ enabled }: Props) {
  useEffect(() => {
    if (!enabled) return;

    // ✅ boot: 1회 로드(중복 방지 + onload 최대한 보장)
    void loadAdfitScript({ mode: "boot" });
  }, [enabled]);

  return null;
}
