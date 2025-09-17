// hooks/useMyeongSikStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MyeongSik } from "@/shared/lib/storage";

type MyeongSikStore = {
  setCurrent: (id: string) => void;
  currentId: string | null;
  list: MyeongSik[];
  add: (m: MyeongSik) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<MyeongSik>) => void;
  reorder: (newList: MyeongSik[]) => void;
};

export const useMyeongSikStore = create<MyeongSikStore>()(
  persist(
    (set, get) => ({
      currentId: null,
      setCurrent: (id: string) => set({ currentId: id }),
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

      // ✅ 저장 시: dir만 보정
      partialize: (s) => ({
        list: s.list.map((m) => ({ ...m, dir: m.dir ?? "forward" })),
      }),

      // ✅ 복원 시: Date 문자열 → Date 객체
      merge: (persisted, current) => {
        const persistedState = persisted as { list?: MyeongSik[] };

        const revive = (m: MyeongSik): MyeongSik => ({
          ...m,
          dir: m.dir ?? "forward",
          dateObj: m?.dateObj ? new Date(m.dateObj) : new Date(),
          corrected: m?.corrected ? new Date(m.corrected) : new Date(),
        });

        return {
          ...current,
          ...persistedState,
          list: Array.isArray(persistedState.list)
            ? persistedState.list.map(revive)
            : [],
        };
      },
    }
  )
);


