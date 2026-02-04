// shared/lib/hooks/useHourPredictionStore.ts
import { create } from "zustand";

type HourGZ = { stem: string; branch: string } | null;

type State = {
  manualHour: HourGZ;
  usePrevDay: boolean;
  setManualHour: (h: NonNullable<HourGZ>) => void;
  clearManualHour: () => void;
  setUsePrevDay: (next: boolean) => void;
  togglePrevDay: () => void;
};

export const useHourPredictionStore = create<State>((set) => ({
  manualHour: null,
  usePrevDay: false,
  setManualHour: (h) => set({ manualHour: h }),
  clearManualHour: () => set({ manualHour: null }),
  setUsePrevDay: (next) => set({ usePrevDay: next }),
  togglePrevDay: () => set((state) => ({ usePrevDay: !state.usePrevDay })),
}));
