import { applyTheme, resolveTheme } from "./theme";

(function () {
  try {
    applyTheme(resolveTheme());
  } catch {
    // ignore
  }
})();

export {};
