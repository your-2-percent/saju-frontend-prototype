// src/shared/lib/myeongsikStore/guestListStorage.ts
import type { MyeongSikWithOrder } from "@/shared/lib/myeongsikStore/types";
import { reviveAndRecalc } from "@/shared/domain/meongsik";
import { sortByOrder } from "@/shared/lib/myeongsikStore/mappers";

const KEY = "guest_myeongsik_v1";

type GuestPersisted = {
  id: string;
  sortOrder: number;

  name: string;
  birthDay: string;
  birthTime: string;
  gender: string;
  birthPlace: { name: string; lat: number; lon: number };

  relationship: string;
  memo: string;
  folder: string;

  mingSikType: string;
  DayChangeRule: string;

  favorite: boolean;
  calendarType: string;
  dir: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toNumber(v: unknown, fallback: number): number {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function toString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}

function toBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function toBirthPlace(v: unknown): GuestPersisted["birthPlace"] {
  if (!isRecord(v)) return { name: "", lat: 0, lon: 0 };
  return {
    name: toString(v.name, ""),
    lat: toNumber(v.lat, 0),
    lon: toNumber(v.lon, 0),
  };
}

function toPersisted(m: MyeongSikWithOrder): GuestPersisted {
  return {
    id: m.id,
    sortOrder: typeof m.sortOrder === "number" ? m.sortOrder : 1,

    name: m.name ?? "",
    birthDay: m.birthDay ?? "",
    birthTime: m.birthTime ?? "",
    gender: m.gender ?? "",
    birthPlace: m.birthPlace ?? { name: "", lat: 0, lon: 0 },

    relationship: m.relationship ?? "",
    memo: m.memo ?? "",
    folder: m.folder ?? "",

    mingSikType: (m as unknown as { mingSikType?: string }).mingSikType ?? "조자시/야자시",
    DayChangeRule: (m as unknown as { DayChangeRule?: string }).DayChangeRule ?? "자시일수론",

    favorite: !!m.favorite,
    calendarType: (m as unknown as { calendarType?: string }).calendarType ?? "solar",
    dir: (m as unknown as { dir?: string }).dir ?? "forward",
  };
}

function fromPersisted(raw: unknown): MyeongSikWithOrder | null {
  if (!isRecord(raw)) return null;

  const base = {
    id: toString(raw.id, ""),
    sortOrder: toNumber(raw.sortOrder, 1),

    name: toString(raw.name, ""),
    birthDay: toString(raw.birthDay, ""),
    birthTime: toString(raw.birthTime, ""),
    gender: toString(raw.gender, ""),
    birthPlace: toBirthPlace(raw.birthPlace),

    relationship: toString(raw.relationship, ""),
    memo: toString(raw.memo, ""),
    folder: toString(raw.folder, ""),

    mingSikType: toString(raw.mingSikType, "조자시/야자시"),
    DayChangeRule: toString(raw.DayChangeRule, "자시일수론"),

    favorite: toBool(raw.favorite, false),
    calendarType: toString(raw.calendarType, "solar"),
    dir: toString(raw.dir, "forward"),
  };

  if (!base.id) return null;

  // ✅ reviveAndRecalc로 dateObj/ganjiText 같은 파생값 복구
  return reviveAndRecalc(base as unknown as MyeongSikWithOrder);
}

export function loadGuestList(): MyeongSikWithOrder[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];

    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];

    const list = arr
      .map(fromPersisted)
      .filter((v): v is MyeongSikWithOrder => v !== null);

    return sortByOrder(list);
  } catch {
    return [];
  }
}

export function saveGuestList(list: MyeongSikWithOrder[]): void {
  try {
    const persisted = list.map(toPersisted);
    localStorage.setItem(KEY, JSON.stringify(persisted));
  } catch {
    // ignore
  }
}

export function clearGuestList(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
