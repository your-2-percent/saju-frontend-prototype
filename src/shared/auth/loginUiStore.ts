// src/shared/auth/loginUiStore.ts
import { create } from "zustand";

export type LoginOpenReason =
  | "HEADER"
  | "PERSIST_SAVE"
  | "ADD_LIMIT"
  | "MANUAL"
  | null;

type LoginUiState = {
  open: boolean;
  reason: LoginOpenReason;
  openWith: (reason?: LoginOpenReason) => void;
  close: () => void;
};

export const useLoginUiStore = create<LoginUiState>((set) => ({
  open: false,
  reason: null,
  openWith: (reason = "MANUAL") => set({ open: true, reason }),
  close: () => set({ open: false, reason: null }),
}));
