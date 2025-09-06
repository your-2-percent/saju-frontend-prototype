// shared/lib/hooks/useSajuSettingsStore.ts
import { create } from "zustand";
import type { EraType } from "@/shared/domain/간지/twelve";

export type ShinsalBase = "연지" | "일지";
export type HiddenStemMode = "hgc" | "classic";

type SajuSettingsState = {
  // 기존
  shinsalBase: ShinsalBase;
  shinsalEra: EraType;
  shinsalGaehwa: boolean;

  // ★ 추가: 지장간/통근 모드
  hiddenStemMode: HiddenStemMode;

  // setters
  setShinsalBase: (b: ShinsalBase) => void;
  setShinsalEra: (e: EraType) => void;
  setShinsalGaehwa: (v: boolean) => void;

  setHiddenStemMode: (m: HiddenStemMode) => void;
};

export const useSajuSettingsStore = create<SajuSettingsState>((set) => ({
  shinsalBase: "연지",
  shinsalEra: "고전",
  shinsalGaehwa: false,

  hiddenStemMode: "hgc",

  setShinsalBase: (b) => set({ shinsalBase: b }),
  setShinsalEra: (e) => set({ shinsalEra: e }),
  setShinsalGaehwa: (v) => set({ shinsalGaehwa: v }),
  setHiddenStemMode: (m) => set({ hiddenStemMode: m }),
}));