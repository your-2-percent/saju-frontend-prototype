import { startTransition, useCallback } from "react";
import type { Settings } from "@/settings/input/useSettingsStore";
import type { ThemeMode } from "@/settings/calc/theme";
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
      startTransition(() => {
        setSettings(nextSettings);
      });
      if (nextSettings.theme) persistTheme(nextSettings.theme as ThemeMode);
      onApplied();
      void saveToServer(true);
    },
    [setSettings, saveToServer]
  );

  return { applyChanges };
}
