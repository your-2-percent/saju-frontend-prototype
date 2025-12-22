const SESSION_STARTED_AT_KEY = "hm_session_started_at_ms";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  return window.localStorage;
}

export function getOrInitSessionStartedAtMs(): number {
  const ls = getLocalStorage();
  if (!ls) return Date.now();

  const raw = ls.getItem(SESSION_STARTED_AT_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed)) return parsed;

  const now = Date.now();
  ls.setItem(SESSION_STARTED_AT_KEY, String(now));
  return now;
}

export function setSessionStartedAtMs(nowMs: number = Date.now()): void {
  const ls = getLocalStorage();
  if (!ls) return;
  try {
    ls.setItem(SESSION_STARTED_AT_KEY, String(nowMs));
  } catch {
    // ignore
  }
}

export function shouldHardReloadBecauseStaleSession(nowMs: number = Date.now()): boolean {
  const startedAt = getOrInitSessionStartedAtMs();
  return nowMs - startedAt >= TWO_HOURS_MS;
}
