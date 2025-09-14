import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DayBoundaryRule } from "@/shared/type";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";

export type LuckScope = "원국만" | "대운" | "세운" | "월운" | "일운";

type GZ = { yearGZ: string; monthGZ: string; dayGZ: string };

function computeAll(date: Date, rule: DayBoundaryRule, lon: number | null): GZ {
  const lng = typeof lon === "number" ? lon : undefined;
  const yearGZ = getYearGanZhi(date, lng);
  const monthGZ = getMonthGanZhi(date, lng);
  const dayGZ = getDayGanZhi(date, rule);
  return { yearGZ, monthGZ, dayGZ };
}

export interface LuckPickerState extends GZ {
  date: Date;
  scope: LuckScope;
  rule: DayBoundaryRule;
  lon: number | null;

  setDate: (next: Date) => void;
  setScope: (next: LuckScope) => void;
  setRule: (next: DayBoundaryRule) => void;
  setLon: (next: number | null) => void;

  /** 리스트 아이템 클릭 시 전역으로 반영 */
  setFromEvent: (ev: { at: Date; gz?: string }, scope: LuckScope) => void;
  resetDate: () => void;
}

export const useLuckPickerStore = create<LuckPickerState>()(
  persist(
    (set, get) => {
      const initialDate = new Date();
      const initialRule: DayBoundaryRule = "야자시";
      const initialLon: number | null = 127.5;
      const init = computeAll(initialDate, initialRule, initialLon);

      return {
        date: initialDate,
        scope: "원국만",
        rule: initialRule,
        lon: initialLon,
        ...init,

        setDate: (next) => {
          const { rule, lon } = get();
          const gz = computeAll(next, rule, lon);
          set({ date: next, ...gz });
        },

        resetDate: () => {
          const { rule, lon } = get();
          const today = new Date();
          const gz = computeAll(today, rule, lon);
          set({ date: today, ...gz });
        },

        setScope: (next) => set({ scope: next }),

        setRule: (next) => {
          const { date, lon } = get();
          const gz = computeAll(date, next, lon);
          set({ rule: next, ...gz });
        },

        setLon: (next) => {
          const { date, rule } = get();
          const gz = computeAll(date, rule, next);
          set({ lon: next, ...gz });
        },

        setFromEvent: (ev, scope) => {
          const { rule, lon } = get();
          const gz = computeAll(ev.at, rule, lon);
          set({ date: ev.at, scope, ...gz });
        },
      };
    },
    {
      name: "luck-picker-v1",
      merge: (persisted, current) => {
        const state = persisted as Partial<LuckPickerState>;
        if (state.date && typeof state.date === "string") {
          state.date = new Date(state.date);
        }
        return { ...current, ...state };
      },
    }
  )
);
