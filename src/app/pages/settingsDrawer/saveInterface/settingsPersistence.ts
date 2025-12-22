import { setStoredTheme, type ThemeMode } from "@/shared/lib/theme";

export function clearLegacySettingsCache() {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("settings_v1");
    }
  } catch {
    /* ignore */
  }
}

export function persistTheme(theme: ThemeMode) {
  setStoredTheme(theme);
}
