import { useEffect, useMemo, useState } from "react";
import type { Settings } from "@/settings/input/useSettingsStore";
import { buildInitialSettings } from "../calc/settingsDerive";
import { normalizeSectionOrder, type SectionKey } from "../calc/sectionOrder";

type Args = {
  open: boolean;
  settings: Settings;
};

export function useSettingsDrawerInput({ open, settings }: Args) {
  const initialOrder = useMemo<SectionKey[]>(
    () => normalizeSectionOrder(settings.sectionOrder),
    [settings.sectionOrder]
  );

  const initialSettings = useMemo<Settings>(
    () => buildInitialSettings(settings),
    [settings]
  );

  const [order, setOrder] = useState<SectionKey[]>(initialOrder);
  const [localSettings, setLocalSettings] = useState<Settings>(initialSettings);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (dirty) return;
    const normalizedOrder = normalizeSectionOrder(settings.sectionOrder);
    setLocalSettings({
      ...buildInitialSettings(settings),
      sectionOrder: normalizedOrder,
    });
    setOrder(normalizedOrder);
    setDirty(false);
  }, [open, settings, dirty]);

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setLocalSettings((prev) => {
      const next = { ...prev, [key]: value };
      setDirty(true);
      return next;
    });
  };

  return {
    order,
    setOrder,
    localSettings,
    setLocalSettings,
    updateSetting,
    toastMessage,
    setToastMessage,
    dirty,
    setDirty,
  };
}
