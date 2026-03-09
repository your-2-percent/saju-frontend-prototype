export const NOTICE_HIDE_UNTIL_KEY = "legacy_migrate_notice_hide_until_v6";
export const NOTICE_HIDE_FOREVER_KEY = "legacy_migrate_notice_hide_forever_v6";
export const NOTICE_AUTO_SHOWN_SESSION_KEY = "legacy_migrate_notice_auto_shown_session_v6";

function getNoticeScope(userId?: string | null): string {
  return userId ? `user:${userId}` : "guest";
}

export function getMigrateNoticeStorageKeys(userId?: string | null) {
  const scope = getNoticeScope(userId);
  return {
    hideUntilKey: `${NOTICE_HIDE_UNTIL_KEY}:${scope}`,
    hideForeverKey: `${NOTICE_HIDE_FOREVER_KEY}:${scope}`,
    autoShownSessionKey: `${NOTICE_AUTO_SHOWN_SESSION_KEY}:${scope}`,
  };
}

export function clearMigrateNoticeDismissState(userId?: string | null): void {
  if (typeof window === "undefined") return;

  const { hideUntilKey, hideForeverKey, autoShownSessionKey } = getMigrateNoticeStorageKeys(userId);
  try {
    window.localStorage.removeItem(hideUntilKey);
    window.localStorage.removeItem(hideForeverKey);
    window.sessionStorage.removeItem(autoShownSessionKey);
  } catch {
    // ignore
  }
}

export function dismissMigrateNoticeForToday(userId?: string | null): void {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).getTime();
  const { hideUntilKey } = getMigrateNoticeStorageKeys(userId);
  try {
    window.localStorage.setItem(hideUntilKey, String(next));
  } catch {
    // ignore
  }
}

export function dismissMigrateNoticeForever(userId?: string | null): void {
  const { hideForeverKey } = getMigrateNoticeStorageKeys(userId);
  try {
    window.localStorage.setItem(hideForeverKey, "1");
  } catch {
    // ignore
  }
}

export function isMigrateNoticeDismissedNow(userId?: string | null): boolean {
  if (typeof window === "undefined") return false;

  const { hideUntilKey, hideForeverKey } = getMigrateNoticeStorageKeys(userId);
  try {
    if (window.localStorage.getItem(hideForeverKey) === "1") return true;

    const untilRaw = window.localStorage.getItem(hideUntilKey);
    const until = untilRaw ? Number(untilRaw) : 0;
    return Number.isFinite(until) && until > Date.now();
  } catch {
    return false;
  }
}

export function shouldAutoOpenMigrateNoticeModal(userId?: string | null): boolean {
  if (typeof window === "undefined") return false;

  const { autoShownSessionKey } = getMigrateNoticeStorageKeys(userId);
  try {
    if (window.sessionStorage.getItem(autoShownSessionKey) === "1") return false;
    if (isMigrateNoticeDismissedNow(userId)) return false;

    window.sessionStorage.setItem(autoShownSessionKey, "1");
    return true;
  } catch {
    return false;
  }
}

