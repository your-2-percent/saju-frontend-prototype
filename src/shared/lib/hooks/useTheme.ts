// src/shared/lib/hooks/useTheme.ts
import { useEffect } from "react";
import { applyTheme, getStoredTheme, setStoredTheme, type ThemeMode } from "@/shared/lib/theme";

/** theme를 넘기면 적용+저장, 안 넘기면 저장값/시스템값으로만 적용 */
export function useApplyTheme(theme?: ThemeMode) {
  useEffect(() => {
    const t =
      theme ??
      getStoredTheme() ??
      (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    applyTheme(t);
    if (theme) setStoredTheme(theme);
  }, [theme]);
}
