export const HIDE_UNTIL_KEY = "legacy_migrate_modal_hide_until_v1";
export const HIDE_FOREVER_KEY = "legacy_migrate_modal_hide_forever_v1";
export const AUTO_SHOWN_SESSION_KEY = "legacy_migrate_modal_auto_shown_session_v1";

export function dismissForToday() {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  try {
    window.localStorage.setItem(HIDE_UNTIL_KEY, String(next));
  } catch {
    // ignore
  }
}

export function dismissForever() {
  try {
    window.localStorage.setItem(HIDE_FOREVER_KEY, "1");
  } catch {
    // ignore
  }
}

export function isLegacyMigrateDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(HIDE_FOREVER_KEY) === "1";
  } catch {
    return false;
  }
}

export function shouldAutoOpenLegacyMigrateModal(isLoggedIn: boolean): boolean {
  if (typeof window === "undefined") return false;
  if (isLoggedIn) return false;

  try {
    if (window.sessionStorage.getItem(AUTO_SHOWN_SESSION_KEY) === "1") return false;
    if (window.localStorage.getItem(HIDE_FOREVER_KEY) === "1") return false;

    const untilRaw = window.localStorage.getItem(HIDE_UNTIL_KEY);
    const until = untilRaw ? Number(untilRaw) : 0;
    if (Number.isFinite(until) && until > Date.now()) return false;

    window.sessionStorage.setItem(AUTO_SHOWN_SESSION_KEY, "1");
  } catch {
    return false;
  }

  return true;
}
