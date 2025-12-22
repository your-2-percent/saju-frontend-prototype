import type { Settings } from "@/shared/lib/hooks/useSettingsStore";
import { defaultSettings } from "@/shared/lib/hooks/useSettingsStore";
import type { ThemeMode } from "@/shared/lib/theme";
import { normalizeSectionOrder } from "./sectionOrder";

export function buildInitialSettings(settings: Settings): Settings {
  return {
    ...defaultSettings,
    ...settings,
    sectionOrder: normalizeSectionOrder(settings.sectionOrder),
  };
}

export function getCurrentTheme(
  localSettings: Settings,
  storeSettings: Settings
): ThemeMode {
  return (localSettings.theme ?? storeSettings.theme ?? "dark") as ThemeMode;
}
