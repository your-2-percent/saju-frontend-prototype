import { useEffect, useRef } from "react";
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

  const bootedUserRef = useRef<string | null>(null);

  const migrateLocalToServer = useMyeongSikStore((s) => s.migrateLocalToServer);
  const loadFromServer = useMyeongSikStore((s) => s.loadFromServer);
  const loadSettings = useSettingsStore((s) => s.loadFromServer);
  const loadEnt = useEntitlementsStore((s) => s.loadFromServer);

  useEffect(() => {
    if (!input.isLoggedIn || !input.userId) {
      bootedUserRef.current = null;
      return;
    }

    if (bootedUserRef.current === input.userId) return;
    bootedUserRef.current = input.userId;

    (async () => {
      await loadEnt();
      await migrateLocalToServer();
      await loadFromServer();
      await loadSettings();
    })();
  }, [input.isLoggedIn, input.userId, loadEnt, migrateLocalToServer, loadFromServer, loadSettings]);
}
