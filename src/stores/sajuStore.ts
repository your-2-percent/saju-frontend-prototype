// stores/sajuStore.ts
import { create } from "zustand";
import type { MyeongsikRow } from "@/lib/database.types";

interface SajuState {
  list: MyeongsikRow[];
  selectedId: string | null;

  setList: (items: MyeongsikRow[]) => void;
  add: (item: MyeongsikRow) => void;
  remove: (id: string) => void;
  select: (id: string | null) => void;
}

export const useSajuStore = create<SajuState>((set) => ({
  list: [],
  selectedId: null,

  setList: (items) => set({ list: items }),

  add: (item) =>
    set((state) => ({
      list: [item, ...state.list],
    })),

  remove: (id) =>
    set((state) => ({
      list: state.list.filter((i) => i.id !== id),
    })),

  select: (id) => set({ selectedId: id }),
}));
