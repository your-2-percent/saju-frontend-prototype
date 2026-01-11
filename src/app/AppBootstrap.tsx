// src/app/AppBootstrap.tsx
import { useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";
import { useSettingsStore } from "@/settings/input/useSettingsStore";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

export default function AppBootstrap() {
  const loadMyeongSik = useMyeongSikStore((s) => s.loadFromServer);
  const migrateLocalToServer = useMyeongSikStore((s) => s.migrateLocalToServer);
  const loadSettings = useSettingsStore((s) => s.loadFromServer);
  const loadEnt = useEntitlementsStore((s) => s.loadFromServer);

  const loadAll = useCallback(async () => {
    await migrateLocalToServer();
    await Promise.all([loadEnt(), loadSettings(), loadMyeongSik()]);
  }, [migrateLocalToServer, loadEnt, loadSettings, loadMyeongSik]);

  useEffect(() => {
    // ✅ 첫 진입(새로고침 포함)
    void loadAll();

    // ✅ 로그인/로그아웃/토큰 갱신 등 auth 변화 때마다 재로드
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      void loadAll();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadAll]);

  return null;
}
