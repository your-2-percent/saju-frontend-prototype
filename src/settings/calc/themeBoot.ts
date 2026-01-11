// src/shared/lib/themeBoot.ts
import { getStoredTheme, applyTheme } from "./theme";

(function () {
  try {
    const t =
      getStoredTheme() ??
      (window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");
    applyTheme(t);
  } catch {
    // ignore
  }
})();
export {};
