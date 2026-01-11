import type { Settings } from "@/settings/input/useSettingsStore";
import { defaultSettings } from "@/settings/input/useSettingsStore";
import type { ThemeMode } from "@/settings/calc/theme";
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
