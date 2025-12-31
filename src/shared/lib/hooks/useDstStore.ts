import { create } from "zustand";

type DstState = {
  useDST: boolean;
  setUseDST: (next: boolean) => void;
  toggleDST: () => void;
};

export const useDstStore = create<DstState>((set) => ({
  useDST: false,
  setUseDST: (next) => set({ useDST: next }),
  toggleDST: () => set((state) => ({ useDST: !state.useDST })),
}));

export const useDstOffsetMinutes = () =>
  useDstStore((state) => (state.useDST ? -60 : 0));
