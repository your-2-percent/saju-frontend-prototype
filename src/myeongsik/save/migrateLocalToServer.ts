import type { MyeongSik } from "@/shared/lib/storage";
import type { OldPersistRoot } from "@/myeongsik/calc/myeongsikStore/types";
import type { MyeongSikRepo } from "@/myeongsik/saveInterface/ports";
import { buildMyeongSik } from "@/myeongsik/calc";
import {
  loadGuestList,
  saveGuestList,
} from "@/myeongsik/calc/myeongsikStore/guestListStorage";

const LEGACY_KEY = "myeongsik-list";
const LEGACY_MYOWOON_KEYS = ["myeongsikList", "savedMyeongSikList"] as const;

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeLegacyGender(v: unknown): "남자" | "여자" {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "여" || s === "여자" ? "여자" : "남자";
}

function normalizeLegacyMingSikType(v: unknown): "자시" | "조자시/야자시" | "인시" {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "jasi" || s === "자시") return "자시";
  if (s === "insi" || s === "인시") return "인시";
  return "조자시/야자시";
}

function toDigits(v: unknown): string {
  if (typeof v !== "string") return "";
  return v.replace(/\D/g, "");
}

function hashIdSeed(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 33) ^ seed.charCodeAt(i);
  }
  return `legacy_${(h >>> 0).toString(36)}`;
}

function toSignature(v: {
  name: string;
  birthDay: string;
  birthTime: string;
  gender: string;
  folder: string;
}): string {
  return `${v.name}|${v.birthDay}|${v.birthTime}|${v.gender}|${v.folder}`;
}

type LegacyMyowoonRow = {
  birthday?: unknown;
  monthType?: unknown;
  birthtime?: unknown;
  isTimeUnknown?: unknown;
  gender?: unknown;
  birthPlace?: unknown;
  birthPlaceLongitude?: unknown;
  isPlaceUnknown?: unknown;
  name?: unknown;
  group?: unknown;
  selectedTime2?: unknown;
  isFavorite?: unknown;
  createdAt?: unknown;
};

function convertMyowoonRows(rawRows: unknown[]): MyeongSik[] {
  const out: MyeongSik[] = [];

  rawRows.forEach((raw, idx) => {
    const row = (raw ?? {}) as LegacyMyowoonRow;

    const birthDay = toDigits(row.birthday);
    if (birthDay.length !== 8) return;

    const unknownTime = row.isTimeUnknown === true;
    const birthTime = unknownTime ? "" : toDigits(row.birthtime);
    const unknownPlace = row.isPlaceUnknown === true;
    const lonRaw = Number(row.birthPlaceLongitude);
    const lon = Number.isFinite(lonRaw) ? lonRaw : 127.5;
    const placeName = typeof row.birthPlace === "string" && row.birthPlace.trim() ? row.birthPlace.trim() : "모름";
    const folder = typeof row.group === "string" && row.group.trim() ? row.group.trim() : undefined;
    const name = typeof row.name === "string" && row.name.trim() ? row.name.trim() : "이름없음";
    const monthType = typeof row.monthType === "string" ? row.monthType : "";
    const calendarType = monthType.includes("음력") ? "lunar" : "solar";
    const mingSikType = normalizeLegacyMingSikType(row.selectedTime2);
    const idSeed = [
      birthDay,
      birthTime,
      name,
      String(row.createdAt ?? ""),
      String(idx),
    ].join("|");
    const id = hashIdSeed(idSeed);

    const built = buildMyeongSik(
      {
        id,
        name,
        birthDay,
        calendarType,
        birthTime,
        unknownTime,
        gender: normalizeLegacyGender(row.gender),
        birthPlace: { name: unknownPlace ? "모름" : placeName, lat: 0, lon },
        unknownPlace,
        folder,
        mingSikType,
        favorite: row.isFavorite === true,
        sortOrder: idx + 1,
      },
      { requireName: false },
    );

    if (built.ok) out.push(built.value);
  });

  return out;
}

export function migrateMyowoonLocalListToGuest(): void {
  if (typeof window === "undefined") return;

  let raw: string | null = null;
  for (const key of LEGACY_MYOWOON_KEYS) {
    const v = window.localStorage.getItem(key);
    if (typeof v === "string" && v.trim()) {
      raw = v;
      break;
    }
  }
  if (!raw) return;

  const parsed = safeJsonParse(raw);
  if (!Array.isArray(parsed)) return;

  const converted = convertMyowoonRows(parsed);
  if (converted.length === 0) {
    for (const key of LEGACY_MYOWOON_KEYS) window.localStorage.removeItem(key);
    return;
  }

  const existing = loadGuestList();
  const merged: MyeongSik[] = [...existing];
  const existingIds = new Set<string>(existing.map((x) => x.id));
  const existingSigs = new Set<string>(
    existing.map((x) =>
      toSignature({
        name: x.name ?? "",
        birthDay: x.birthDay ?? "",
        birthTime: x.birthTime ?? "",
        gender: x.gender ?? "",
        folder: x.folder ?? "",
      }),
    ),
  );

  for (const item of converted) {
    const sig = toSignature({
      name: item.name ?? "",
      birthDay: item.birthDay ?? "",
      birthTime: item.birthTime ?? "",
      gender: item.gender ?? "",
      folder: item.folder ?? "",
    });
    if (existingIds.has(item.id) || existingSigs.has(sig)) continue;
    merged.push(item);
    existingIds.add(item.id);
    existingSigs.add(sig);
  }

  const normalizedOrder = merged.map((m, idx) => ({
    ...m,
    sortOrder: idx + 1,
  }));
  saveGuestList(normalizedOrder);

  for (const key of LEGACY_MYOWOON_KEYS) window.localStorage.removeItem(key);
}

export async function migrateMyowoonLocalListToServer(repo: MyeongSikRepo): Promise<void> {
  if (typeof window === "undefined") return;

  let raw: string | null = null;
  for (const key of LEGACY_MYOWOON_KEYS) {
    const v = window.localStorage.getItem(key);
    if (typeof v === "string" && v.trim()) {
      raw = v;
      break;
    }
  }
  if (!raw) return;

  const parsed = safeJsonParse(raw);
  if (!Array.isArray(parsed)) return;

  const converted = convertMyowoonRows(parsed);
  if (converted.length === 0) {
    for (const key of LEGACY_MYOWOON_KEYS) window.localStorage.removeItem(key);
    return;
  }

  const user = await repo.getUser();
  if (!user) return;

  const existingIds = new Set<string>(await repo.fetchExistingIds(user.id));
  const serverRows = await repo.fetchRows(user.id);
  const existingSigs = new Set<string>(
    serverRows.map((r) =>
      toSignature({
        name: r.name ?? "",
        birthDay: r.birth_day ?? "",
        birthTime: r.birth_time ?? "",
        gender: r.gender ?? "",
        folder: r.folder ?? "",
      }),
    ),
  );

  for (const item of converted) {
    const sig = toSignature({
      name: item.name ?? "",
      birthDay: item.birthDay ?? "",
      birthTime: item.birthTime ?? "",
      gender: item.gender ?? "",
      folder: item.folder ?? "",
    });

    if (existingIds.has(item.id) || existingSigs.has(sig)) continue;
    await repo.upsertOne(user.id, item);
    existingIds.add(item.id);
    existingSigs.add(sig);
  }

  for (const key of LEGACY_MYOWOON_KEYS) window.localStorage.removeItem(key);
}

export async function migrateLegacyLocalListToServer(repo: MyeongSikRepo): Promise<void> {
  if (typeof window === "undefined") return;

  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return;

  const parsed = safeJsonParse(raw) as OldPersistRoot | null;
  if (!parsed) {
    window.localStorage.removeItem(LEGACY_KEY);
    return;
  }

  const state = parsed.state ?? {};
  const localList = Array.isArray(state.list) ? state.list : [];

  if (localList.length === 0) {
    window.localStorage.removeItem(LEGACY_KEY);
    return;
  }

  const user = await repo.getUser();
  if (!user) return;

  const existingIds = new Set<string>(await repo.fetchExistingIds(user.id));

  const toInsert = localList.filter((item): item is MyeongSik => {
    return !!item && typeof item.id === "string" && item.id.trim() !== "" && !existingIds.has(item.id);
  });

  for (const item of toInsert) {
    // legacy list에는 계산 필드가 없을 수 있어서 서버 write는 최소필드만 넣는다.
    await repo.upsertOne(user.id, item);
  }

  window.localStorage.removeItem(LEGACY_KEY);
}
