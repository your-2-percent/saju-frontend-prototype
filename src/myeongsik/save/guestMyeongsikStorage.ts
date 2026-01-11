// src/shared/myeongsik/guestMyeongsikStorage.ts
import type { MyeongSik } from "@/shared/lib/storage";

const KEY = "guest_myeongsik_v1";

type GuestPayload = {
  version: 1;
  items: MyeongSik[];
};

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function isGuestPayload(v: unknown): v is GuestPayload {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  if (o["version"] !== 1) return false;
  if (!Array.isArray(o["items"])) return false;
  return true;
}

export function loadGuestMyeongsik(): MyeongSik[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = safeParse(raw);
    if (!isGuestPayload(parsed)) return [];
    return parsed.items;
  } catch {
    return [];
  }
}

export function saveGuestMyeongsik(items: MyeongSik[]): void {
  try {
    const payload: GuestPayload = { version: 1, items };
    localStorage.setItem(KEY, JSON.stringify(payload));
  } catch {
    // ignore
  }
}

export function appendGuestMyeongsik(ms: MyeongSik): number {
  const items = loadGuestMyeongsik();

  // id가 있으면 중복 방지(없으면 그냥 append)
  const next = (() => {
    const id = (ms as unknown as { id?: string }).id;
    if (!id) return [...items, ms];
    const exists = items.some((x) => (x as unknown as { id?: string }).id === id);
    return exists ? items : [...items, ms];
  })();

  saveGuestMyeongsik(next);
  return next.length;
}

export function clearGuestMyeongsik(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
