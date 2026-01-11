import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";
import { useSettingsStore } from "@/settings/input/useSettingsStore";

type PageCalc = {
  loading: boolean;
  settingsLoaded: boolean;
  entLoaded: boolean;
};

export function usePageCalc(): PageCalc {
  const loading = useMyeongSikStore((s) => s.loading);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const entLoaded = useEntitlementsStore((s) => s.loaded);

  return { loading, settingsLoaded, entLoaded };
}
