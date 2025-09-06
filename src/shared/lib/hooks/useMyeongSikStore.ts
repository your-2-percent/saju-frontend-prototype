// hooks/useMyeongSikStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MyeongSik } from "@/shared/lib/storage";

type MyeongSikStore = {
  list: MyeongSik[];
  add: (m: MyeongSik) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<MyeongSik>) => void;
  reorder: (newList: MyeongSik[]) => void;
};

export const useMyeongSikStore = create<MyeongSikStore>()(
  persist(
    (set, get) => ({
      list: [],
      add: (m) => set({ list: [m, ...get().list] }),
      remove: (id) => set({ list: get().list.filter((x) => x.id !== id) }),
      update: (id, patch) =>
        set({
          list: get().list.map((x) =>
            x.id === id ? { ...x, ...patch } : x
          ),
        }),
      reorder: (newList) => set({ list: newList }),
    }),
    {
      name: "myeongsik-list",
      partialize: (s) => ({
        list: s.list.map((m) => ({ ...m, dir: m.dir ?? "forward" })), // ⬅ 여기서 보정
      }),
    }
  )
);

