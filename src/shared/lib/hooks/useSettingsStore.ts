// shared/lib/hooks/useSettingsStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Settings = {
  hiddenStem: "all" | "regular";        // 지장간: 전체 / 정기만
  hiddenStemMode: "classic" | "hgc";    // 지장간 유형: 고전 / 하건충
  ilunRule: "야자시" | "조자시" | "인시";
  sinsalMode: "classic" | "modern";
  sinsalBase: "일지" | "연지";
  sinsalBloom: boolean;
  exposure: "원국" | "대운" | "세운" | "월운";
  charType: "한자" | "한글";
  thinEum: boolean;                     // 음간/음지 얇게
  showSipSin: boolean;                  // 십신
  showSibiSinsal: boolean;              // 십이신살
  showSibiUnseong: boolean;             // 십이운성
  theme: "dark" | "light";
  sectionOrder?: string[];
};

export const defaultSettings: Settings = {
  hiddenStem: "all",
  hiddenStemMode: "classic",
  ilunRule: "야자시",
  sinsalMode: "classic",
  sinsalBase: "일지",
  sinsalBloom: false,
  exposure: "원국",
  charType: "한자",
  thinEum: false,
  showSipSin: true,
  showSibiSinsal: true,
  showSibiUnseong: true,
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
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      setSettings: (next) => set({ settings: next }),
      setKey: (key, value) =>
        set({ settings: { ...get().settings, [key]: value } }),
      reset: () => set({ settings: defaultSettings }),
    }),
    { name: "settings_v1" }
  )
);
