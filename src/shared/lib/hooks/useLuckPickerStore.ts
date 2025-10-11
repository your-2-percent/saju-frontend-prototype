import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DayBoundaryRule } from "@/shared/type";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";

export type LuckScope = "원국만" | "대운" | "세운" | "월운" | "일운";

export interface LuckPickerState {
  date: Date;
  scope: LuckScope;
  rule: DayBoundaryRule;
  lon: number | null;

  yearGZ: string;
  monthGZ: string;
  dayGZ: string;

  setDate: (next: Date) => void;
  setScope: (next: LuckScope) => void;
  setRule: (next: DayBoundaryRule) => void;
  setLon: (next: number | null) => void;
  setFromEvent: (ev: { at: Date; gz?: string }, scope: LuckScope) => void;
  resetDate: () => void;
  resetMonth: () => void;
  forceKey: Date;
}

export const useLuckPickerStore = create<LuckPickerState>()(
  persist(
    (set, get) => {
      const initialDate = new Date();
      const initialRule: DayBoundaryRule = "조자시/야자시";
      const initialLon: number | null = 127.5;

      const lng = typeof initialLon === "number" ? initialLon : undefined;
      const initYear = getYearGanZhi(initialDate, lng);
      const initMonth = getMonthGanZhi(initialDate, lng);
      const initDay = getDayGanZhi(initialDate, initialRule);

      return {
        date: initialDate,
        scope: "원국만",
        rule: initialRule,
        lon: initialLon,

        yearGZ: initYear,
        monthGZ: initMonth,
        dayGZ: initDay,

        setDate: (next) => {
          const { rule, lon } = get();
          const lng = typeof lon === "number" ? lon : undefined;
          set({
            date: next,
            yearGZ: getYearGanZhi(next, lng),
            monthGZ: getMonthGanZhi(next, lng),
            dayGZ: getDayGanZhi(next, rule),
          });
        },

        resetDate: () => {
          const { rule, lon } = get();
          const today = new Date();
          const lng = typeof lon === "number" ? lon : undefined;
          set({
            date: today,
            yearGZ: getYearGanZhi(today, lng),
            monthGZ: getMonthGanZhi(today, lng),
            dayGZ: getDayGanZhi(today, rule),
          });
        },

        resetMonth: () => {
          const { lon } = get();
          const today = new Date();
          const lng = typeof lon === "number" ? lon : undefined;
          set({
            date: today,
            monthGZ: getMonthGanZhi(today, lng),
          });
        },

        setScope: (next) => set({ scope: next }),

        setRule: (next) => {
          const { date, lon } = get();
          const lng = typeof lon === "number" ? lon : undefined;
          set({
            rule: next,
            yearGZ: getYearGanZhi(date, lng),
            monthGZ: getMonthGanZhi(date, lng),
            dayGZ: getDayGanZhi(date, next),
          });
        },

        setLon: (next) => {
          const { date, rule } = get();
          const lng = typeof next === "number" ? next : undefined;
          set({
            lon: next,
            yearGZ: getYearGanZhi(date, lng),
            monthGZ: getMonthGanZhi(date, lng),
            dayGZ: getDayGanZhi(date, rule),
          });
        },

        setFromEvent: (ev, scope) => {
          const { rule, lon } = get();
          const lng = typeof lon === "number" ? lon : undefined;
          set({
            date: ev.at,
            scope,
            yearGZ: getYearGanZhi(ev.at, lng),
            monthGZ: getMonthGanZhi(ev.at, lng),
            dayGZ: getDayGanZhi(ev.at, rule),
          });
        },
        forceKey: new Date(),
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
