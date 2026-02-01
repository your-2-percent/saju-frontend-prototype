const SESSION_STARTED_AT_KEY = "app_session_started_at_ms";

export const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function getSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function getSessionStartedAtMs(): number {
  const ss = getSessionStorage();
  if (!ss) return Date.now();

  const raw = ss.getItem(SESSION_STARTED_AT_KEY);
  const parsed = raw ? Number(raw) : NaN;

  if (!Number.isFinite(parsed) || parsed <= 0) {
    const now = Date.now();
    try {
      ss.setItem(SESSION_STARTED_AT_KEY, String(now));
    } catch {
      // ignore storage write errors
    }
    return now;
  }

  return parsed;
}

export function getSessionAgeMs(nowMs: number = Date.now()): number {
  const startedAt = getSessionStartedAtMs();
  return Math.max(0, nowMs - startedAt);
}

export function isSessionOlderThan(ms: number, nowMs: number = Date.now()): boolean {
  return getSessionAgeMs(nowMs) >= ms;
}
