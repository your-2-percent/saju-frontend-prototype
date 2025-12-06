// shared/lib/hooks/useMyeongSikStore.ts
import { create } from "zustand";
import type { MyeongSik } from "@/shared/lib/storage";
import { supabase } from "@/lib/supabase";
import { recalcGanjiSnapshot } from "@/shared/domain/간지/recalcGanjiSnapshot";

type Direction = MyeongSik extends { dir: infer D } ? D : string;

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
  created_at: string | null;
  updated_at: string | null;
}

type MyeongSikStore = {
  currentId: string | null;
  list: MyeongSik[];
  loading: boolean;

  setCurrent: (id: string | null) => void;

  loadFromServer: () => Promise<void>;
  migrateLocalToServer: () => Promise<void>;

  add: (m: MyeongSik) => Promise<void>;
  update: (id: string, patch: Partial<MyeongSik>) => Promise<void>;
  remove: (id: string) => Promise<void>;

  reorder: (newList: MyeongSik[]) => void;
  clear: () => void;
};

/** "남자"/"여자"로 강제 통일 */
function normalizeGender(
  raw: string | null | undefined,
): "남자" | "여자" {
  const v = (raw ?? "").trim();

  if (!v) return "남자";

  if (
    v === "여자" ||
    v.toLowerCase() === "female" ||
    v === "2" ||
    v.toUpperCase() === "F"
  ) {
    return "여자";
  }

  if (
    v === "남자" ||
    v.toLowerCase() === "male" ||
    v === "1" ||
    v.toUpperCase() === "M"
  ) {
    return "남자";
  }

  // 이상한 값 들어오면 남자로 처리 (기존 로직과 동일한 디폴트)
  return "남자";
}

/** "갑자년 경자월 …" 이런 문자열에서 연간(첫 글자) 뽑기 */
// ✅ "원국 : 병자년 경자월..." / "병자년 경자월..." 둘 다에서 연간만 정확히 뽑기
function extractYearStem(
  text: string | null | undefined,
): string | null {
  if (!text) return null;

  // 1) "병자년" 패턴에서 천간+지지 매칭
  const m = text.match(
    /(갑|을|병|정|무|기|경|신|임|계)(자|축|인|묘|진|사|오|미|신|유|술|해)년/,
  );
  if (m) {
    return m[1]; // "병자년" → "병"
  }

  // 2) 공백 기준 토큰 중에서 "~년"으로 끝나는 것 찾아서 첫 글자를 천간으로 사용
  const token = text
    .split(/\s+/)
    .find((t) => t.endsWith("년"));
  if (token && token.length > 0) {
    return token.charAt(0); // "병자년" → "병"
  }

  return null;
}


/** 성별 + 연간 음양 기반으로 대운 방향 계산 */
function computeDaewoonDir(ms: MyeongSik): Direction {
  const gender = normalizeGender(ms.gender);

  const yearStem =
    extractYearStem(ms.ganjiText) ?? extractYearStem(ms.ganji);

  if (!yearStem) {
    // 연간 못 뽑으면 일단 순행 기본
    return "forward" as Direction;
  }

  const yangStems = ["갑", "병", "무", "경", "임"];
  const isYang = yangStems.includes(yearStem);
  const isFemale = gender === "여자";

  // 양간: 남 순 / 여 역, 음간: 남 역 / 여 순
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
      : new Date();

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
function fromRow(row: MyeongSikRow): MyeongSik {
  const birthPlace: MyeongSik["birthPlace"] = {
    name: row.birth_place_name ?? "",
    lat: row.birth_place_lat ?? 0,
    lon: row.birth_place_lon ?? 127.5,
  };

  const base: MyeongSik = {
    id: row.id,
    name: row.name ?? "",
    birthDay: row.birth_day ?? "",
    birthTime: row.birth_time ?? "",
    gender: normalizeGender(row.gender),
    birthPlace,
    relationship: row.relationship ?? "",
    memo: row.memo ?? "",
    folder: row.folder ?? "",
    mingSikType: (["자시", "조자시/야자시", "인시"].includes(row.ming_sik_type as string) ? row.ming_sik_type : "자시") as "자시" | "조자시/야자시" | "인시",
    DayChangeRule: (row.day_change_rule === "자시일수론" || row.day_change_rule === "인시일수론"
      ? row.day_change_rule
      : "자시일수론") as "자시일수론" | "인시일수론",
    favorite: row.favorite ?? false,

    dateObj: new Date(),
    corrected: new Date(),
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
function buildRowForUpsert(m: MyeongSik, userId: string) {
  const bp = m.birthPlace ?? { name: "", lat: 0, lon: 127.5 };

  return {
    id: m.id,
    user_id: userId,
    name: m.name ?? null,
    birth_day: m.birthDay ?? null,
    birth_time: m.birthTime ?? null,
    gender: normalizeGender(m.gender),
    birth_place_name: bp.name ?? null,
    birth_place_lat:
      typeof bp.lat === "number" ? (bp.lat as number) : null,
    birth_place_lon:
      typeof bp.lon === "number" ? (bp.lon as number) : null,
    relationship: m.relationship ?? null,
    memo: m.memo ?? null,
    folder: m.folder ?? null,
    ming_sik_type: m.mingSikType ?? null,
    day_change_rule: m.DayChangeRule ?? null,
    favorite: m.favorite ?? false,
    updated_at: new Date().toISOString(),
  };
}

export const useMyeongSikStore = create<MyeongSikStore>((set, get) => ({
  currentId: null,
  list: [],
  loading: false,

  setCurrent: (id) => set({ currentId: id }),

  loadFromServer: async () => {
    set({ loading: true });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("loadFromServer: user not found / error", userError);
      set({ list: [], currentId: null, loading: false });
      return;
    }

    const { data, error } = await supabase
      .from("myeongsik")
      .select(
        "id, user_id, name, birth_day, birth_time, gender, birth_place_name, birth_place_lat, birth_place_lon, relationship, memo, folder, ming_sik_type, day_change_rule, favorite, created_at, updated_at",
      )
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("loadFromServer error:", error);
      set({ loading: false });
      return;
    }

    const filtered = data.filter((row) => row.user_id === user.id);

    const list: MyeongSik[] = filtered.map(fromRow);
    const firstId = list[0]?.id ?? null;

    set({
      list,
      currentId: firstId,
      loading: false,
    });
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

    // 1) 서버에 이미 있는 내 명식들의 id 목록 가져오기
    const { data: existing, error: existingError } = await supabase
      .from("myeongsik")
      .select("id")
      .eq("user_id", user.id);

    if (existingError) {
      console.error(
        "migrateLocalToServer: fetch existing ids error",
        existingError,
      );
      return;
    }

    const existingIds = new Set<string>(
      (existing ?? []).map((row) => row.id as string),
    );

    // 2) 서버에 아직 없는 id 만 추려서 insert 대상으로 삼기
    const toInsert = localList.filter(
      (item): item is MyeongSik => !!item && !existingIds.has(item.id),
    );

    if (toInsert.length === 0) {
      console.log(
        "migrateLocalToServer: nothing new to insert, just clear localStorage",
      );
      window.localStorage.removeItem("myeongsik-list");
      return;
    }

    const payload = toInsert.map((item) =>
      buildRowForUpsert(item as MyeongSik, user.id),
    );

    const { error } = await supabase
      .from("myeongsik")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("migrateLocalToServer upsert error:", error);
      return;
    }

    // 3) 이 기기 로컬 데이터는 더 이상 필요 없으니 제거
    window.localStorage.removeItem("myeongsik-list");
  },

  add: async (m) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("add: user not found", userError);
      return;
    }

    const row = buildRowForUpsert(m, user.id);

    const { error } = await supabase
      .from("myeongsik")
      .upsert(row, { onConflict: "id" });

    if (error) {
      console.error("add upsert error:", error);
      return;
    }

    await get().loadFromServer();
  },

  update: async (id, patch) => {
    const prev = get().list.find((x) => x.id === id);
    if (!prev) return;

    const merged: MyeongSik = {
      ...prev,
      ...patch,
    };

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("update: user not found", userError);
      return;
    }

    const row = buildRowForUpsert(merged, user.id);

    const { error } = await supabase
      .from("myeongsik")
      .update(row)
      .eq("id", id);

    if (error) {
      console.error("update error:", error);
      return;
    }

    await get().loadFromServer();
  },

  remove: async (id) => {
    const { error } = await supabase
      .from("myeongsik")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("remove error:", error);
      return;
    }

    await get().loadFromServer();
  },

  reorder: (newList) => {
    set({ list: newList });
  },

  clear: () => {
    set({ currentId: null, list: [] });
  },
}));
