import { create } from "zustand";

type MaintenanceReason = "env" | "manual" | "db_down";

type MaintenanceState = {
  enabled: boolean;
  reason: MaintenanceReason | null;
  message: string;
  dbFailCount: number;

  enableManual: (message?: string) => void;
  disableManual: () => void;

  bumpDbFail: () => void;
  resetDbFailCount: () => void;
};

const LS_KEY = "MAINTENANCE_OVERRIDE";
const DEFAULT_MSG =
  "죄송합니다. 현재 홈페이지 상태가 좋지 않아 점검 중입니다.\n잠시 후 다시 접속해 주세요.";

function envOn(): boolean {
  return String(import.meta.env.VITE_MAINTENANCE ?? "0") === "1";
}

function readManualOverride(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(LS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeManualOverride(on: boolean): void {
  try {
    if (typeof window === "undefined") return;
    if (on) window.localStorage.setItem(LS_KEY, "1");
    else window.localStorage.removeItem(LS_KEY);
  } catch {
    // ignore
  }
}

export const useMaintenanceStore = create<MaintenanceState>((set, get) => {
  const initialEnv = envOn();
  const initialManual = readManualOverride();

  return {
    enabled: initialEnv || initialManual,
    reason: initialEnv ? "env" : initialManual ? "manual" : null,
    message: DEFAULT_MSG,
    dbFailCount: 0,

    enableManual: (message) => {
      writeManualOverride(true);
      set({
        enabled: true,
        reason: "manual",
        message: message ?? DEFAULT_MSG,
        dbFailCount: 0,
      });
    },

    disableManual: () => {
      writeManualOverride(false);
      const e = envOn();
      set({
        enabled: e,
        reason: e ? "env" : null,
        message: DEFAULT_MSG,
        dbFailCount: 0,
      });
    },

    bumpDbFail: () => {
      // ✅ 너무 민감하면 오탐 나니까 5회 연속 실패로
      const THRESHOLD = 5;
      const next = get().dbFailCount + 1;

      // env/manual이면 굳이 건드릴 필요 없음
      const curReason = get().reason;
      if (curReason === "env" || curReason === "manual") {
        set({ dbFailCount: next });
        return;
      }

      if (next >= THRESHOLD) {
        set({
          enabled: true,
          reason: "db_down",
          dbFailCount: next,
          message: DEFAULT_MSG,
        });
        return;
      }

      set({ dbFailCount: next });
    },

    resetDbFailCount: () => {
      // ✅ db_down으로 들어가면 “자동 해제”는 안 함(깜빡임 방지)
      // 복구는 새로고침/수동 해제로 처리
      if (get().dbFailCount !== 0) set({ dbFailCount: 0 });
    },
  };
});
