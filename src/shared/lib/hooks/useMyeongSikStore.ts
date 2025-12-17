// shared/lib/hooks/useMyeongSikStore.ts
import { create } from "zustand";
import type { MyeongSik } from "@/shared/lib/storage";
import { supabase } from "@/lib/supabase";
import { recalcGanjiSnapshot } from "@/shared/domain/간지/recalcGanjiSnapshot";

type Direction = MyeongSik extends { dir: infer D } ? D : string;
type MyeongSikWithOrder = MyeongSik & { sortOrder?: number | null };
type OldPersistRoot = {
  state?: {
    currentId?: string | null;
    list?: MyeongSik[];
  };
  version?: number;
};

interface MyeongSikRow {
  id: string;
  user_id: string;
  name: string | null;
  birth_day: string | null;
  birth_time: string | null;
  gender: string | null;
  birth_place_name: string | null;
  birth_place_lat: number | null;
  birth_place_lon: number | null;
  relationship: string | null;
  memo: string | null;
  folder: string | null;
  ming_sik_type: string | null;
  day_change_rule: string | null;
  favorite: boolean | null;
  sort_order: string | number | null;
  created_at: string | null;
  deleted_at: string | null;
  updated_at: string | null;
}

/* =========================
 * Realtime + 2시간 룰
 * ========================= */

const SESSION_STARTED_AT_KEY = "hm_session_started_at_ms";
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function getOrInitSessionStartedAt(): number {
  if (typeof window === "undefined") return Date.now();
  const raw = window.localStorage.getItem(SESSION_STARTED_AT_KEY);
  const parsed = raw ? Number(raw) : NaN;
  if (Number.isFinite(parsed)) return parsed;

  const now = Date.now();
  window.localStorage.setItem(SESSION_STARTED_AT_KEY, String(now));
  return now;
}

function shouldHardReloadBecauseStaleSession(): boolean {
  if (typeof window === "undefined") return false;
  const startedAt = getOrInitSessionStartedAt();
  return Date.now() - startedAt >= TWO_HOURS_MS;
}

async function safeRemoveRealtimeChannel(channel: unknown): Promise<void> {
  if (!channel) return;

  // supabase-js v2: removeChannel
  // supabase-js v1: removeSubscription (혹시)
  const client = supabase as unknown as {
    removeChannel?: (ch: unknown) => Promise<unknown>;
    removeSubscription?: (ch: unknown) => Promise<unknown>;
  };

  if (typeof client.removeChannel === "function") {
    await client.removeChannel(channel);
    return;
  }
  if (typeof client.removeSubscription === "function") {
    await client.removeSubscription(channel);
    return;
  }
}

function sortByOrder(list: MyeongSikWithOrder[]): MyeongSikWithOrder[] {
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

function normalizeRowLoose(rowLike: unknown): MyeongSikRow | null {
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

/* =========================
 * 기존 로직(네 코드 그대로)
 * ========================= */

/** "남자"/"여자"로 강제 통일 */
function normalizeGender(raw: string | null | undefined): "남자" | "여자" {
  const v = (raw ?? "").trim();

  if (!v) return "남자";

  if (v === "여자" || v.toLowerCase() === "female" || v === "2" || v.toUpperCase() === "F") {
    return "여자";
  }

  if (v === "남자" || v.toLowerCase() === "male" || v === "1" || v.toUpperCase() === "M") {
    return "남자";
  }

  return "남자";
}

/** "갑자년 경자월 …" 이런 문자열에서 연간(첫 글자) 뽑기 */
function extractYearStem(text: string | null | undefined): string | null {
  if (!text) return null;

  const m = text.match(
    /(갑|을|병|정|무|기|경|신|임|계)(자|축|인|묘|진|사|오|미|신|유|술|해)년/,
  );
  if (m) return m[1];

  const token = text.split(/\s+/).find((t) => t.endsWith("년"));
  if (token && token.length > 0) return token.charAt(0);

  return null;
}

/** 성별 + 연간 음양 기반으로 대운 방향 계산 */
function computeDaewoonDir(ms: MyeongSik): Direction {
  const gender = normalizeGender(ms.gender);
  const yearStem = extractYearStem(ms.ganjiText) ?? extractYearStem(ms.ganji);

  if (!yearStem) return "forward" as Direction;

  const yangStems = ["갑", "병", "무", "경", "임"];
  const isYang = yangStems.includes(yearStem);
  const isFemale = gender === "여자";

  const isForward = (isYang && !isFemale) || (!isYang && isFemale);
  return (isForward ? "forward" : "backward") as Direction;
}

/** Date 복원 + 간지/교정 재계산 + dir 재계산 */
function reviveAndRecalc(base: MyeongSik): MyeongSik {
  const dateObj =
    base.dateObj instanceof Date
      ? base.dateObj
      : base.dateObj
        ? new Date(base.dateObj as unknown as string | number | Date)
        : new Date();

  const corrected =
    base.corrected instanceof Date
      ? base.corrected
      : base.corrected
        ? new Date(base.corrected as unknown as string | number | Date)
        : new Date(NaN);

  const normalized: MyeongSik = {
    ...base,
    dateObj,
    corrected,
  };

  try {
    const snapshot = recalcGanjiSnapshot(normalized);
    const merged: MyeongSik = { ...normalized, ...snapshot };
    const dir = computeDaewoonDir(merged);
    return { ...merged, dir };
  } catch (e) {
    console.error("[useMyeongSikStore] recalcGanjiSnapshot error:", e);
    const dir = computeDaewoonDir(normalized);
    return { ...normalized, dir };
  }
}

/** DB row → MyeongSik */
function fromRow(row: MyeongSikRow): MyeongSikWithOrder {
  const birthPlace: MyeongSik["birthPlace"] = {
    name: row.birth_place_name ?? "",
    lat: row.birth_place_lat ?? 0,
    lon: row.birth_place_lon ?? 127.5,
  };

  const sortOrderRaw =
    row.sort_order === null || row.sort_order === undefined ? undefined : Number(row.sort_order);
  const sortOrder = typeof sortOrderRaw === "number" && Number.isFinite(sortOrderRaw) ? sortOrderRaw : undefined;

  const base: MyeongSikWithOrder = {
    id: row.id,
    name: row.name ?? "",
    birthDay: row.birth_day ?? "",
    birthTime: row.birth_time ?? "",
    gender: normalizeGender(row.gender),
    birthPlace,
    relationship: row.relationship ?? "",
    memo: row.memo ?? "",
    folder: row.folder ?? "",
    mingSikType: (["자시", "조자시/야자시", "인시"].includes(row.ming_sik_type as string)
      ? row.ming_sik_type
      : "자시") as "자시" | "조자시/야자시" | "인시",
    DayChangeRule: (row.day_change_rule === "자시일수론" || row.day_change_rule === "인시일수론"
      ? row.day_change_rule
      : "자시일수론") as "자시일수론" | "인시일수론",
    favorite: row.favorite ?? false,
    deletedAt: row.deleted_at ?? null,
    sortOrder,

    dateObj: new Date(),
    corrected: new Date(NaN),
    correctedLocal: "",
    dayStem: "",
    ganjiText: "",
    ganji: "",
    calendarType: "solar",
    dir: "forward",
  };

  return reviveAndRecalc(base);
}

/** MyeongSik → Supabase upsert용 row */
function buildRowForUpsert(m: MyeongSikWithOrder, userId: string) {
  const bp = m.birthPlace ?? { name: "", lat: 0, lon: 127.5 };

  const sortOrderVal =
    typeof m.sortOrder === "number" && Number.isFinite(m.sortOrder) ? m.sortOrder : null;

  return {
    id: m.id,
    user_id: userId,
    name: m.name ?? null,
    birth_day: m.birthDay ?? null,
    birth_time: m.birthTime ?? null,
    gender: normalizeGender(m.gender),
    birth_place_name: bp.name ?? null,
    birth_place_lat: typeof bp.lat === "number" ? bp.lat : null,
    birth_place_lon: typeof bp.lon === "number" ? bp.lon : null,
    relationship: m.relationship ?? null,
    memo: m.memo ?? null,
    folder: m.folder ?? null,
    ming_sik_type: m.mingSikType ?? null,
    day_change_rule: m.DayChangeRule ?? null,
    favorite: m.favorite ?? false,
    deleted_at: m.deletedAt ?? null,
    sort_order: sortOrderVal,
    updated_at: new Date().toISOString(),
  };
}

type MyeongSikStore = {
  currentId: string | null;
  list: MyeongSikWithOrder[];
  loading: boolean;

  // realtime
  realtimeReady: boolean;
  startRealtime: () => Promise<void>;
  stopRealtime: () => Promise<void>;

  setCurrent: (id: string | null) => void;

  loadFromServer: () => Promise<void>;
  migrateLocalToServer: () => Promise<void>;

  add: (m: MyeongSik) => Promise<void>;
  update: (id: string, patch: Partial<MyeongSikWithOrder>) => Promise<void>;
  remove: (id: string) => Promise<void>;

  reorder: (newList: MyeongSikWithOrder[]) => Promise<void>;
  clear: () => void;

  _rtChannel: unknown;
  _rtUserId: string | null;
};

export const useMyeongSikStore = create<MyeongSikStore>((set, get) => ({
  currentId: null,
  list: [],
  loading: true,

  realtimeReady: false,
  _rtChannel: null,
  _rtUserId: null,

  setCurrent: (id) => set({ currentId: id }),

  stopRealtime: async () => {
    const ch = get()._rtChannel;
    await safeRemoveRealtimeChannel(ch);
    set({ _rtChannel: null, _rtUserId: null, realtimeReady: false });
  },

  startRealtime: async () => {
    getOrInitSessionStartedAt();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      await get().stopRealtime();
      return;
    }

    if (get()._rtChannel && get()._rtUserId === user.id) {
      set({ realtimeReady: true });
      return;
    }

    await get().stopRealtime();

    const channel = supabase
      .channel(`myeongsik:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "myeongsik",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: unknown) => {
          // 2시간 넘었으면 “DB 변경 들어오는 순간” 하드 리로드
          if (shouldHardReloadBecauseStaleSession()) {
            if (typeof window !== "undefined") window.location.reload();
            return;
          }

          if (!isRecord(payload)) return;
          const eventType = typeof payload.eventType === "string" ? payload.eventType : "";
          const newLike = isRecord(payload["new"]) ? payload["new"] : null;
          const oldLike = isRecord(payload["old"]) ? payload["old"] : null;

          const newRow = normalizeRowLoose(newLike);
          const oldRow = normalizeRowLoose(oldLike);

          const id = newRow?.id ?? oldRow?.id ?? null;
          if (!id) return;

          // UPDATE로 soft delete 올 수 있음
          const deletedAt =
            newRow && typeof newRow.deleted_at === "string" && newRow.deleted_at.trim()
              ? newRow.deleted_at
              : null;

          set((state) => {
            // DELETE 또는 deleted_at 처리
            if (eventType === "DELETE" || deletedAt) {
              const filtered = state.list.filter((x) => x.id !== id);
              const newCurrentId =
                state.currentId === id ? filtered[0]?.id ?? null : state.currentId;
              return { list: filtered, currentId: newCurrentId };
            }

            // INSERT/UPDATE upsert
            if (newRow) {
              const item = fromRow(newRow);
              const exists = state.list.some((x) => x.id === item.id);
              const merged = exists
                ? state.list.map((x) => (x.id === item.id ? item : x))
                : [...state.list, item];

              return {
                list: sortByOrder(merged),
                currentId: state.currentId ?? item.id,
              };
            }

            return state;
          });
        },
      )
      .subscribe((status: unknown) => {
        if (status === "SUBSCRIBED") {
          set({ realtimeReady: true });
        }
      });

    set({ _rtChannel: channel, _rtUserId: user.id });
  },

  loadFromServer: async () => {
    set({ loading: true });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("loadFromServer: user not found / error", userError);
      set({ list: [], currentId: null, loading: false });
      await get().stopRealtime();
      return;
    }

    const baseSelect =
      "id, user_id, name, birth_day, birth_time, gender, birth_place_name, birth_place_lat, birth_place_lon, relationship, memo, folder, ming_sik_type, day_change_rule, favorite, deleted_at, created_at, updated_at";

    const withOrder = await supabase
      .from("myeongsik")
      .select(baseSelect + ", sort_order")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("sort_order", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: false });

    const data = withOrder.data;
    const error = withOrder.error;

    if (error || !data) {
      console.error("loadFromServer error:", error);
      set({ loading: false });
      return;
    }

    const filtered = (data as unknown as MyeongSikRow[]).filter((row) => row.user_id === user.id);
    const list: MyeongSikWithOrder[] = sortByOrder(filtered.map(fromRow));

    const prevCurrent = get().currentId;
    const firstId =
      prevCurrent && list.some((m) => m.id === prevCurrent) ? prevCurrent : list[0]?.id ?? null;

    set({ list, currentId: firstId, loading: false });

    // ✅ 서버 로딩 끝나면 Realtime 자동 시작
    await get().startRealtime();
  },

  migrateLocalToServer: async () => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem("myeongsik-list");
    if (!raw) return;

    let parsed: OldPersistRoot;
    try {
      parsed = JSON.parse(raw) as OldPersistRoot;
    } catch (e) {
      console.error("migrateLocalToServer: JSON parse error", e);
      window.localStorage.removeItem("myeongsik-list");
      return;
    }

    const state = parsed.state ?? {};
    const localList = Array.isArray(state.list) ? state.list : [];

    if (localList.length === 0) {
      window.localStorage.removeItem("myeongsik-list");
      return;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.warn("migrateLocalToServer: no user, skip");
      return;
    }

    const { data: existing, error: existingError } = await supabase
      .from("myeongsik")
      .select("id")
      .eq("user_id", user.id);

    if (existingError) {
      console.error("migrateLocalToServer: fetch existing ids error", existingError);
      return;
    }

    const existingIds = new Set<string>((existing ?? []).map((row) => row.id as string));

    const toInsert = localList.filter((item): item is MyeongSik => !!item && !existingIds.has(item.id));
    if (toInsert.length === 0) {
      window.localStorage.removeItem("myeongsik-list");
      return;
    }

    const payload = toInsert.map((item) => buildRowForUpsert(item as MyeongSikWithOrder, user.id));
    const { error } = await supabase.from("myeongsik").upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("migrateLocalToServer upsert error:", error);
      return;
    }

    window.localStorage.removeItem("myeongsik-list");
  },

  add: async (m) => {
    const nextOrder = (get().list.length || 0) + 1;
    const withOrder: MyeongSikWithOrder = {
      ...m,
      sortOrder: (m as MyeongSikWithOrder).sortOrder ?? nextOrder,
    };

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("add: user not found", userError);
      return;
    }

    set((state) => ({
      list: sortByOrder([...state.list, withOrder]),
      currentId: state.currentId ?? withOrder.id,
    }));

    const row = buildRowForUpsert(withOrder, user.id);
    const { error } = await supabase.from("myeongsik").upsert(row, { onConflict: "id" });

    if (error) console.error("add upsert error:", error);
  },

  update: async (id, patch) => {
    const prev = get().list.find((x) => x.id === id);
    if (!prev) return;

    const merged: MyeongSikWithOrder = { ...prev, ...patch };

    set((state) => ({
      list: sortByOrder(state.list.map((x) => (x.id === id ? merged : x))),
    }));

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("update: user not found", userError);
      return;
    }

    const row = buildRowForUpsert(merged, user.id);
    const { error } = await supabase.from("myeongsik").update(row).eq("id", id);
    if (error) console.error("update error:", error);
  },

  remove: async (id) => {
    set((state) => {
      const filtered = state.list.filter((x) => x.id !== id);
      const newCurrentId = state.currentId === id ? filtered[0]?.id ?? null : state.currentId;
      return { list: filtered, currentId: newCurrentId };
    });

    const deletedAt = new Date().toISOString();
    const { error } = await supabase.from("myeongsik").update({ deleted_at: deletedAt }).eq("id", id);
    if (error) console.error("remove error:", error);
  },

  reorder: async (newList) => {
    const withOrder: MyeongSikWithOrder[] = newList.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    set({ list: sortByOrder(withOrder) });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("reorder: user not found", userError);
      return;
    }

    const rows = withOrder.map((m) => buildRowForUpsert(m, user.id));
    const { error } = await supabase.from("myeongsik").upsert(rows, { onConflict: "id" });
    if (error) console.error("reorder upsert error:", error);
  },

  clear: () => {
    set({ currentId: null, list: [] });
  },
}));
