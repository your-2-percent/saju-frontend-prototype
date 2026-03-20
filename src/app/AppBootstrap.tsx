// src/app/AppBootstrap.tsx
import { useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";
import { useSettingsStore } from "@/settings/input/useSettingsStore";
import { useApplyTheme } from "@/settings/input/useTheme";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

export default function AppBootstrap() {
  const loadMyeongSik = useMyeongSikStore((s) => s.loadFromServer);
  const migrateLocalToServer = useMyeongSikStore((s) => s.migrateLocalToServer);
  const loadSettings = useSettingsStore((s) => s.loadFromServer);
  const loadEnt = useEntitlementsStore((s) => s.loadFromServer);
  const theme = useSettingsStore((s) => s.settings.theme);

  useApplyTheme(theme);

  const loadAll = useCallback(async (force = false) => {
    await migrateLocalToServer();
    await Promise.all([loadEnt(), loadSettings(force ? { force: true } : undefined), loadMyeongSik()]);
  }, [migrateLocalToServer, loadEnt, loadSettings, loadMyeongSik]);

  useEffect(() => {
    // ✅ 첫 진입(새로고침 포함)
    void loadAll();

    // ✅ 로그인/로그아웃/토큰 갱신 등 auth 변화 때마다 재로드
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") return;
      // SIGNED_IN 시 다른 기기에서 변경된 설정을 반드시 DB에서 다시 로드
      void loadAll(event === "SIGNED_IN");
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadAll]);

  return null;
}
