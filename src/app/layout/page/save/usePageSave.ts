import { useEffect } from "react";
import { useAppDbSync } from "@/shared/lib/db/useAppDbSync";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { useAuthState } from "@/app/layout/page/saveInterface/useAuthState";
import type { PageInput } from "@/app/layout/page/input/usePageInput";

export function usePageSave(input: PageInput) {
  useAuthState({
    setUserId: input.setUserId,
    setIsLoggedIn: input.setIsLoggedIn,
    setAuthChecked: input.setAuthChecked,
  });

  useAppDbSync(input.userId);

  const migrateLocalToServer = useMyeongSikStore((s) => s.migrateLocalToServer);
  const loadFromServer = useMyeongSikStore((s) => s.loadFromServer);
  const loadSettings = useSettingsStore((s) => s.loadFromServer);
  const loadEnt = useEntitlementsStore((s) => s.loadFromServer);

  useEffect(() => {
    if (!input.isLoggedIn) return;
    void loadEnt();
  }, [input.isLoggedIn, loadEnt]);

  useEffect(() => {
    if (!input.isLoggedIn) return;

    (async () => {
      await migrateLocalToServer();
      await loadFromServer();
      await loadSettings();
    })();
  }, [input.isLoggedIn, migrateLocalToServer, loadFromServer, loadSettings]);
}
