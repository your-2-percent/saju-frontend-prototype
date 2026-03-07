export type ThemeMode = "dark" | "light";

const THEME_KEY = "harim.theme";
const SETTINGS_KEY = "harim.settings.v1";
const DARK_THEME_COLOR = "#0a0a0a";
const LIGHT_THEME_COLOR = "#ffffff";

export function getStoredTheme(): ThemeMode | null {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "dark" || t === "light") return t;

    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as { theme?: unknown };
      const tt = obj?.theme;
      if (tt === "dark" || tt === "light") return tt;
    }

    return null;
  } catch {
    return null;
  }
}

export function setStoredTheme(theme: ThemeMode) {
  try {
    localStorage.setItem(THEME_KEY, theme);
    const raw = localStorage.getItem(SETTINGS_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...prev, theme }));
  } catch {
    /* noop */
  }
}

export function getSystemTheme(): ThemeMode {
  if (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

export function resolveTheme(): ThemeMode {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  root.style.setProperty("color-scheme", theme);

  const themeColor = theme === "dark" ? DARK_THEME_COLOR : LIGHT_THEME_COLOR;
  document
    .querySelectorAll('meta[name="theme-color"], meta[name="msapplication-navbutton-color"]')
    .forEach((meta) => meta.setAttribute("content", themeColor));
}
