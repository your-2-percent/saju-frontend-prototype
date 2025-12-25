import { create } from "zustand";

export type LoginNudgeReason =
  | "HEADER"
  | "SIDEBAR"
  | "ADD_MYEONGSIK"
  | "CUSTOM_ADD"
  | "BOTTOM_NAV"
  | "PERSIST_SAVE"
  | "ADD_LIMIT";

type LoginNudgeState = {
  open: boolean;
  reason: LoginNudgeReason;
  openWith: (reason: LoginNudgeReason) => void;
  close: () => void;
};

export const useLoginNudgeStore = create<LoginNudgeState>((set) => ({
  open: false,
  reason: "HEADER",
  openWith: (reason) => set({ open: true, reason }),
  close: () => set({ open: false }),
}));
