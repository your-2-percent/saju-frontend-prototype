import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";
import { useSettingsStore } from "@/settings/input/useSettingsStore";

type PageCalc = {
  loading: boolean;
  msLoaded: boolean;
  settingsLoaded: boolean;
  entLoaded: boolean;
};

export function usePageCalc(): PageCalc {
  const loading = useMyeongSikStore((s) => s.loading);
  const msLoaded = useMyeongSikStore((s) => s.loaded);
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const entLoaded = useEntitlementsStore((s) => s.loaded);

  return { loading, msLoaded, settingsLoaded, entLoaded };
}
