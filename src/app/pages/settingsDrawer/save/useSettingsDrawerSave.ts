import { useCallback } from "react";
import type { Settings } from "@/shared/lib/hooks/useSettingsStore";
import type { ThemeMode } from "@/shared/lib/theme";
import { clearLegacySettingsCache, persistTheme } from "../saveInterface/settingsPersistence";
import { buildInitialSettings } from "../calc/settingsDerive";

type Args = {
  setSettings: (next: Settings) => void;
  saveToServer: (force: boolean) => Promise<void>;
};

export function useSettingsDrawerSave({ setSettings, saveToServer }: Args) {
  const applyChanges = useCallback(
    async (localSettings: Settings, order: string[], onApplied: () => void) => {
      const nextSettings = {
        ...buildInitialSettings(localSettings),
        sectionOrder: order,
      };

      clearLegacySettingsCache();
      setSettings(nextSettings);
      if (nextSettings.theme) persistTheme(nextSettings.theme as ThemeMode);
      await saveToServer(true);
      onApplied();
    },
    [setSettings, saveToServer]
  );

  return { applyChanges };
}
