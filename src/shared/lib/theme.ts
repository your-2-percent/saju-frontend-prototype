// src/shared/lib/theme.ts
export type ThemeMode = "dark" | "light";

const THEME_KEY = "harim.theme";        // ✅ 전용 키 (문자열)
const SETTINGS_KEY = "harim.settings.v1"; // 기존 설정 객체 키

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
    // 전용 키에 문자열 저장
    localStorage.setItem(THEME_KEY, theme);
    // 설정 객체에도 병행 저장(호환)
    const raw = localStorage.getItem(SETTINGS_KEY);
    const prev = raw ? JSON.parse(raw) : {};
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...prev, theme }));
  } catch {
    /* noop */
  }
}

export function applyTheme(theme: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.setProperty("color-scheme", theme); // ✅ no any
}
