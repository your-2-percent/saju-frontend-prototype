import { create } from "zustand";

export type LoginNudgeReason =
  | "HEADER"
  | "PERSIST_SAVE"
  | "ADD_LIMIT"
  | "UNKNOWN";

type LoginNudgeState = {
  open: boolean;
  reason: LoginNudgeReason;
  openWith: (reason: LoginNudgeReason) => void;
  close: () => void;
};

export const useLoginNudgeStore = create<LoginNudgeState>((set) => ({
  open: false,
  reason: "UNKNOWN",
  openWith: (reason) => set({ open: true, reason }),
  close: () => set({ open: false, reason: "UNKNOWN" }),
}));
