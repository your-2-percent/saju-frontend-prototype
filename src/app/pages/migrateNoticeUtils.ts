export const NOTICE_HIDE_UNTIL_KEY = "legacy_migrate_notice_hide_until_v1";
export const NOTICE_HIDE_FOREVER_KEY = "legacy_migrate_notice_hide_forever_v1";
export const NOTICE_AUTO_SHOWN_SESSION_KEY = "legacy_migrate_notice_auto_shown_session_v1";

export function dismissMigrateNoticeForToday(): void {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  try {
    window.localStorage.setItem(NOTICE_HIDE_UNTIL_KEY, String(next));
  } catch {
    // ignore
  }
}

export function dismissMigrateNoticeForever(): void {
  try {
    window.localStorage.setItem(NOTICE_HIDE_FOREVER_KEY, "1");
  } catch {
    // ignore
  }
}

export function isMigrateNoticeDismissedNow(): boolean {
  if (typeof window === "undefined") return false;

  try {
    if (window.localStorage.getItem(NOTICE_HIDE_FOREVER_KEY) === "1") return true;

    const untilRaw = window.localStorage.getItem(NOTICE_HIDE_UNTIL_KEY);
    const until = untilRaw ? Number(untilRaw) : 0;
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

export function shouldAutoOpenMigrateNoticeModal(): boolean {
  if (typeof window === "undefined") return false;

  try {
    if (window.sessionStorage.getItem(NOTICE_AUTO_SHOWN_SESSION_KEY) === "1") return false;
    if (isMigrateNoticeDismissedNow()) return false;

    window.sessionStorage.setItem(NOTICE_AUTO_SHOWN_SESSION_KEY, "1");
    return true;
  } catch {
    return false;
  }
}

