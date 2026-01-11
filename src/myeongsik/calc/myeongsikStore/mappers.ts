import type { MyeongSik } from "@/shared/lib/storage";
import { coerceBirthDayDigits, coerceBirthTimeDigits } from "@/shared/lib/core/birthFields";
import { normalizeGender, reviveAndRecalc } from "@/myeongsik/calc";
import { isRecord } from "@/myeongsik/calc/myeongsikStore/guards";
import type { MyeongSikRow, MyeongSikWithOrder } from "@/myeongsik/calc/myeongsikStore/types";

export function sortByOrder(list: MyeongSikWithOrder[]): MyeongSikWithOrder[] {
  return [...list].sort((a, b) => {
    const ao = typeof a.sortOrder === "number" && Number.isFinite(a.sortOrder) ? a.sortOrder : -1;
    const bo = typeof b.sortOrder === "number" && Number.isFinite(b.sortOrder) ? b.sortOrder : -1;
    if (ao !== bo) return ao - bo;

    const an = (a.name ?? "").toString();
    const bn = (b.name ?? "").toString();
    const nc = an.localeCompare(bn);
    if (nc !== 0) return nc;
    return a.id.localeCompare(b.id);
  });
}

export function normalizeRowLoose(rowLike: unknown): MyeongSikRow | null {
  if (!isRecord(rowLike)) return null;
  const id = typeof rowLike.id === "string" ? rowLike.id : null;
  const user_id = typeof rowLike.user_id === "string" ? rowLike.user_id : null;
  if (!id || !user_id) return null;

  const numOrNull = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;

  const strOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);
  const boolOrNull = (v: unknown): boolean | null => (typeof v === "boolean" ? v : null);

  return {
    id,
    user_id,
    name: strOrNull(rowLike.name),
    birth_day: strOrNull(rowLike.birth_day),
    birth_time: strOrNull(rowLike.birth_time),
    gender: strOrNull(rowLike.gender),
    birth_place_name: strOrNull(rowLike.birth_place_name),
    birth_place_lat: numOrNull(rowLike.birth_place_lat),
    birth_place_lon: numOrNull(rowLike.birth_place_lon),
    relationship: strOrNull(rowLike.relationship),
    memo: strOrNull(rowLike.memo),
    folder: strOrNull(rowLike.folder),
    ming_sik_type: strOrNull(rowLike.ming_sik_type),
    day_change_rule: strOrNull(rowLike.day_change_rule),
    calendar_type: strOrNull(rowLike.calendar_type),
    favorite: boolOrNull(rowLike.favorite),
    sort_order:
      typeof rowLike.sort_order === "string" || typeof rowLike.sort_order === "number"
        ? rowLike.sort_order
        : null,
    created_at: strOrNull(rowLike.created_at),
    deleted_at: strOrNull(rowLike.deleted_at),
    updated_at: strOrNull(rowLike.updated_at),
  };
}

export function fromRow(row: MyeongSikRow): MyeongSikWithOrder {
  const birthPlace: MyeongSik["birthPlace"] = {
    name: row.birth_place_name ?? "",
    lat: row.birth_place_lat ?? 0,
    lon: row.birth_place_lon ?? 127.5,
  };

  const sortOrderRaw =
    row.sort_order === null || row.sort_order === undefined ? undefined : Number(row.sort_order);
  const sortOrder =
    typeof sortOrderRaw === "number" && Number.isFinite(sortOrderRaw) ? sortOrderRaw : undefined;

  const base: MyeongSikWithOrder = {
    id: row.id,
    name: row.name ?? "",
    birthDay: coerceBirthDayDigits(row.birth_day ?? ""),
    birthTime: coerceBirthTimeDigits(row.birth_time ?? ""),
    gender: normalizeGender(row.gender),
    birthPlace,
    relationship: row.relationship ?? "",
    memo: row.memo ?? "",
    folder: row.folder ?? "",
    mingSikType: (['자시', '조자시/야자시', '인시'].includes(row.ming_sik_type as string)
      ? row.ming_sik_type
      : '자시') as '자시' | '조자시/야자시' | '인시',
    DayChangeRule: (row.day_change_rule === '자시일수론' || row.day_change_rule === '인시일수론'
      ? row.day_change_rule
      : '자시일수론') as '자시일수론' | '인시일수론',
    favorite: row.favorite ?? false,
    deletedAt: row.deleted_at ?? null,
    sortOrder,

    dateObj: new Date(),
    corrected: new Date(NaN),
    correctedLocal: "",
    dayStem: "",
    ganjiText: "",
    ganji: "",
    calendarType: row.calendar_type === "lunar" ? "lunar" : "solar",
    dir: "forward",
  };

  return reviveAndRecalc(base);
}

export function buildRowForOrderPatch(m: MyeongSikWithOrder, userId: string) {
  const folder = typeof m.folder === "string" ? m.folder.trim() : "";
  const sortOrderVal = typeof m.sortOrder === "number" && Number.isFinite(m.sortOrder) ? m.sortOrder : null;

  return {
    id: m.id,
    user_id: userId,
    sort_order: sortOrderVal,
    folder: folder ? folder : null,
    favorite: !!m.favorite,
    updated_at: new Date().toISOString(),
  };
}

export function buildRowForUpsert(m: MyeongSikWithOrder, userId: string) {
  const birthDay = coerceBirthDayDigits(m.birthDay ?? "");
  const birthTime = coerceBirthTimeDigits(m.birthTime ?? "");
  const bp = m.birthPlace ?? { name: "", lat: 0, lon: 127.5 };

  const sortOrderVal = typeof m.sortOrder === "number" && Number.isFinite(m.sortOrder) ? m.sortOrder : null;

  return {
    id: m.id,
    user_id: userId,
    name: m.name ?? null,
    birth_day: birthDay ? birthDay : null,
    birth_time: birthTime ? birthTime : null,
    gender: normalizeGender(m.gender),
    birth_place_name: bp.name ?? null,
    birth_place_lat: typeof bp.lat === "number" ? bp.lat : null,
    birth_place_lon: typeof bp.lon === "number" ? bp.lon : null,
    relationship: m.relationship ?? null,
    memo: m.memo ?? null,
    folder: typeof m.folder === "string" ? m.folder : null,
    ming_sik_type: m.mingSikType ?? null,
    day_change_rule: m.DayChangeRule ?? null,
    calendar_type: m.calendarType ?? "solar",
    favorite: m.favorite ?? false,
    deleted_at: m.deletedAt ?? null,
    sort_order: sortOrderVal,
    updated_at: new Date().toISOString(),
  };
}
