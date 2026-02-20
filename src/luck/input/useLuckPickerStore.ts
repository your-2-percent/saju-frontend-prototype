import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DayBoundaryRule } from "@/shared/type";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi } from "@/shared/domain/ganji/common";

export type LuckScope = "원국만" | "대운" | "세운" | "월운" | "일운" | "시운";

export interface LuckPickerState {
  date: Date;
  scope: LuckScope;
  rule: DayBoundaryRule;
  showSiwoon: boolean;
  lon: number | null;
  dstOffsetMinutes: number;

  yearGZ: string;
  monthGZ: string;
  dayGZ: string;

  setDate: (next: Date) => void;
  setScope: (next: LuckScope) => void;
  setRule: (next: DayBoundaryRule) => void;
  setShowSiwoon: (next: boolean) => void;
  setLon: (next: number | null) => void;
  setDstOffsetMinutes: (next: number) => void;
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
      const initialShowSiwoon = true;
      const initialLon: number | null = 127.5;
      const initialDstOffsetMinutes = 0;

      const applyDst = (d: Date, offsetMinutes: number) =>
        offsetMinutes ? new Date(d.getTime() + offsetMinutes * 60 * 1000) : d;

      const lng = typeof initialLon === "number" ? initialLon : undefined;
      const initDate = applyDst(initialDate, initialDstOffsetMinutes);
      const initYear = getYearGanZhi(initDate, lng);
      const initMonth = getMonthGanZhi(initDate, lng);
      const initDay = getDayGanZhi(initDate, initialRule);

      return {
        date: initialDate,
        scope: "원국만",
        rule: initialRule,
        showSiwoon: initialShowSiwoon,
        lon: initialLon,
        dstOffsetMinutes: initialDstOffsetMinutes,

        yearGZ: initYear,
        monthGZ: initMonth,
        dayGZ: initDay,

        setDate: (next) => {
          const { rule, lon, dstOffsetMinutes } = get();
          const lng = typeof lon === "number" ? lon : undefined;
          const calcDate = applyDst(next, dstOffsetMinutes);
          set({
            date: next,
            yearGZ: getYearGanZhi(calcDate, lng),
            monthGZ: getMonthGanZhi(calcDate, lng),
            dayGZ: getDayGanZhi(calcDate, rule),
          });
        },

        resetDate: () => {
          const { rule, lon, dstOffsetMinutes } = get();
          const today = new Date();
          const lng = typeof lon === "number" ? lon : undefined;
          const calcDate = applyDst(today, dstOffsetMinutes);
          set({
            date: today,
            yearGZ: getYearGanZhi(calcDate, lng),
            monthGZ: getMonthGanZhi(calcDate, lng),
            dayGZ: getDayGanZhi(calcDate, rule),
          });
        },

        resetMonth: () => {
          const { lon, dstOffsetMinutes } = get();
          const today = new Date();
          const lng = typeof lon === "number" ? lon : undefined;
          const calcDate = applyDst(today, dstOffsetMinutes);
          set({
            date: today,
            monthGZ: getMonthGanZhi(calcDate, lng),
          });
        },

        setScope: (next) => set({ scope: next }),

        setRule: (next) => {
          const { date, lon, dstOffsetMinutes } = get();
          const lng = typeof lon === "number" ? lon : undefined;
          const calcDate = applyDst(date, dstOffsetMinutes);
          set({
            rule: next,
            yearGZ: getYearGanZhi(calcDate, lng),
            monthGZ: getMonthGanZhi(calcDate, lng),
            dayGZ: getDayGanZhi(calcDate, next),
          });
        },

        setShowSiwoon: (next) => set({ showSiwoon: next }),

        setLon: (next) => {
          const { date, rule, dstOffsetMinutes } = get();
          const lng = typeof next === "number" ? next : undefined;
          const calcDate = applyDst(date, dstOffsetMinutes);
          set({
            lon: next,
            yearGZ: getYearGanZhi(calcDate, lng),
            monthGZ: getMonthGanZhi(calcDate, lng),
            dayGZ: getDayGanZhi(calcDate, rule),
          });
        },

        setDstOffsetMinutes: (next) => {
          const { date, rule, lon } = get();
          const lng = typeof lon === "number" ? lon : undefined;
          const calcDate = applyDst(date, next);
          set({
            dstOffsetMinutes: next,
            yearGZ: getYearGanZhi(calcDate, lng),
            monthGZ: getMonthGanZhi(calcDate, lng),
            dayGZ: getDayGanZhi(calcDate, rule),
          });
        },

        setFromEvent: (ev, scope) => {
          const { rule, lon, dstOffsetMinutes } = get();
          const lng = typeof lon === "number" ? lon : undefined;
          const calcDate = applyDst(ev.at, dstOffsetMinutes);
          set({
            date: ev.at,
            scope,
            yearGZ: getYearGanZhi(calcDate, lng),
            monthGZ: getMonthGanZhi(calcDate, lng),
            dayGZ: getDayGanZhi(calcDate, rule),
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
