// shared/lib/hooks/useHourPredictionStore.ts
import { create } from "zustand";

type HourGZ = { stem: string; branch: string } | null;

type State = {
  manualHour: HourGZ;
  setManualHour: (h: NonNullable<HourGZ>) => void;
  clearManualHour: () => void;
};

export const useHourPredictionStore = create<State>((set) => ({
  manualHour: null,
  setManualHour: (h) => set({ manualHour: h }),
  clearManualHour: () => set({ manualHour: null }),
}));
