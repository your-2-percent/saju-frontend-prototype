// src/app/AppBootstrap.tsx
import { useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

export default function AppBootstrap() {
  const loadMyeongSik = useMyeongSikStore((s) => s.loadFromServer);
  const loadSettings = useSettingsStore((s) => s.loadFromServer);
  const loadEnt = useEntitlementsStore((s) => s.loadFromServer);

  const loadAll = useCallback(() => {
    void loadEnt();
    void loadSettings();
    void loadMyeongSik();
  }, [loadEnt, loadSettings, loadMyeongSik]);

  useEffect(() => {
    // ✅ 첫 진입(새로고침 포함)
    loadAll();

    // ✅ 로그인/로그아웃/토큰 갱신 등 auth 변화 때마다 재로드
    const { data } = supabase.auth.onAuthStateChange(() => {
      loadAll();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [loadAll]);

  return null;
}
