import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

export type Settings = {
  hiddenStem: "all" | "regular";        // 지장간: 전체 / 정기만
  hiddenStemMode: "classic" | "hgc";    // 지장간 유형: 고전 / 하건충
  ilunRule: "자시" | "조자시/야자시" | "인시";
  sinsalMode: "classic" | "modern";
  sinsalBase: "일지" | "연지";
  sinsalBloom: boolean;
  exposure: "원국" | "대운" | "세운" | "월운";
  charType: "한자" | "한글";
  thinEum: boolean;                     // 음간/음지 얇게
  showSipSin: boolean;                  // 십신
  showSibiSinsal: boolean;              // 십이신살
  showSibiUnseong: boolean;             // 십이운성
  showNabeum: boolean;                  // ✅ 납음 표시 (스토어에 정식 편입)
  theme: "dark" | "light";
  sectionOrder?: string[];
  difficultyMode?: boolean;
};

export const defaultSettings: Settings = {
  hiddenStem: "all",
  hiddenStemMode: "classic",
  ilunRule: "조자시/야자시",
  sinsalMode: "classic",
  sinsalBase: "일지",
  sinsalBloom: false,
  exposure: "원국",
  charType: "한자",
  thinEum: false,
  showSipSin: true,
  showSibiSinsal: true,
  showSibiUnseong: true,
  showNabeum: true, // ✅ 기본 ON
  theme: "dark",
  sectionOrder: [
    "hiddenStem","hiddenStemMode","ilunRule","sinsalMode","sinsalBase",
    "sinsalBloom","exposure","charType","thinEum","visibility",
  ],
};

type SettingsState = {
  settings: Settings;
  setSettings: (next: Settings) => void;
  setKey: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
  loadFromServer: () => Promise<void>;
  saveToServer: (force?: boolean) => Promise<void>;
  syncing: boolean;
  loaded: boolean;
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      syncing: false,
      loaded: false,
      setSettings: (next) => set({ settings: next }),
      setKey: (key, value) =>
        set({ settings: { ...get().settings, [key]: value } }),
      reset: () => set({ settings: defaultSettings }),
      loadFromServer: async () => {
        set({ syncing: true });

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          set({ syncing: false, loaded: false });
          return;
        }

        const { data, error } = await supabase
          .from("user_settings")
          .select("payload")
          .eq("user_id", user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          console.error("loadFromServer(settings) error:", error);
          set({ syncing: false, loaded: true });
          return;
        }

        if (data?.payload) {
          set({
            settings: data.payload as Settings,
            syncing: false,
            loaded: true,
          });
          return;
        }

        await get().saveToServer(true);
        set({ syncing: false, loaded: true });
      },
      saveToServer: async (force = false) => {
        if (!get().loaded && !force) return;
        set({ syncing: true });

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          set({ syncing: false });
          return;
        }

        const { error } = await supabase
          .from("user_settings")
          .upsert({
            user_id: user.id,
            payload: get().settings,
            updated_at: new Date().toISOString(),
          });

        if (error) {
          console.error("saveToServer(settings) error:", error);
        }

        set({ syncing: false, loaded: true });
      },
    }),
    { name: "settings_v1" } // ✅ 한 군데로만 저장
  )
);
