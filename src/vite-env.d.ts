/// <reference types="vite/client" />

export {};

declare global {
  interface Window {
    __adfit_onfail_dispatch?: (insEl: HTMLInsElement) => void;
    __adfit_onfail_handlers?: Record<string, (insEl: HTMLInsElement) => void>;
  }
}
