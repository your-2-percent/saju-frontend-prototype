// src/shared/ads/AdfitScriptManager.tsx
import { useEffect } from "react";
import { loadAdfitScript } from "./adfitScript";

type Props = {
  enabled: boolean;
};

export function AdfitScriptManager({ enabled }: Props) {
  useEffect(() => {
    if (!enabled) return;

    // ✅ 1회 로드만. hashchange 리로드 금지.
    void loadAdfitScript();
  }, [enabled]);

  return null;
}
