import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";

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
