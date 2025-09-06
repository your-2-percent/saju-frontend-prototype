// shared/lib/hooks/useSajuSettingsStore.ts
import { create } from "zustand";
export const useSajuSettingsStore = create((set) => ({
    shinsalBase: "연지",
    shinsalEra: "고전",
    shinsalGaehwa: false,
    hiddenStemMode: "hgc",
    setShinsalBase: (b) => set({ shinsalBase: b }),
    setShinsalEra: (e) => set({ shinsalEra: e }),
    setShinsalGaehwa: (v) => set({ shinsalGaehwa: v }),
    setHiddenStemMode: (m) => set({ hiddenStemMode: m }),
}));
