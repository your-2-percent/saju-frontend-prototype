// hooks/useMyeongSikStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { MyeongSik } from "@/shared/lib/storage";

type MyeongSikStore = {
  currentId: string | null;
  setCurrent: (id: string) => void;
  list: MyeongSik[];
  add: (m: MyeongSik) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<MyeongSik>) => void;
  reorder: (newList: MyeongSik[]) => void;
};

/**
 * dir 타입을 MyeongSik에서 자동으로 추론
 * (없으면 string으로 폴백)
 */
type Direction = MyeongSik extends { dir: infer D } ? D : string;

/**
 * localStorage에 실제로 저장되는 형태
 * (Date → string으로 직렬화되지만 타입은 MyeongSik 기반으로 둠)
 */
type PersistedState = {
  currentId?: string | null;
  list?: MyeongSik[];
};

export const useMyeongSikStore = create<MyeongSikStore>()(
  persist(
    (set, get) => ({
      currentId: null,

      setCurrent: (id: string) => set({ currentId: id }),

      list: [],

      add: (m) => set({ list: [m, ...get().list] }),

      remove: (id) =>
        set({
          list: get().list.filter((x) => x.id !== id),
        }),

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

      // ✅ 저장 시: currentId + list 전체를 그대로 저장
      //    (folder 포함, dir 기본값만 여기서 한 번 정리)
      partialize: (state) => ({
        currentId: state.currentId,
        list: state.list.map((m) => ({
          ...m,
          // dir 없으면 forward로 보정
          dir: (m.dir ?? "forward") as Direction,
        })),
      }),

      // ✅ 복원 시: Date 문자열 → Date 객체, dir 기본값 채우기
      merge: (persisted, current) => {
        const p = persisted as PersistedState;

        const revive = (m: MyeongSik): MyeongSik => {
          // corrected 복원
          const corrected =
            m.corrected instanceof Date
              ? m.corrected
              : m.corrected
              ? new Date(m.corrected as unknown as string | number | Date)
              : new Date();

          // dateObj 복원
          const dateObj =
            m.dateObj instanceof Date
              ? m.dateObj
              : m.dateObj
              ? new Date(m.dateObj as unknown as string | number | Date)
              : new Date();

          // dir 기본값
          const dir: Direction = (m.dir ?? "forward") as Direction;

          return {
            ...m,
            corrected,
            dateObj,
            dir,
          };
        };

        const revivedList = Array.isArray(p.list)
          ? p.list.map(revive)
          : current.list;

        return {
          ...current,
          currentId: p.currentId ?? current.currentId,
          list: revivedList,
        };
      },
    }
  )
);
