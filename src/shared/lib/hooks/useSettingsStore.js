// shared/lib/hooks/useSettingsStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
export const defaultSettings = {
    hiddenStem: "all",
    hiddenStemMode: "classic",
    ilunRule: "자시",
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
        "hiddenStem", "hiddenStemMode", "ilunRule", "sinsalMode", "sinsalBase",
        "sinsalBloom", "exposure", "charType", "thinEum", "visibility",
    ],
};
export const useSettingsStore = create()(persist((set, get) => ({
    settings: defaultSettings,
    setSettings: (next) => set({ settings: next }),
    setKey: (key, value) => set({ settings: { ...get().settings, [key]: value } }),
    reset: () => set({ settings: defaultSettings }),
}), { name: "settings_v1" }));
