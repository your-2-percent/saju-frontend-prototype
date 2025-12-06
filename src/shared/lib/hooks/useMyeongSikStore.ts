// hooks/useMyeongSikStore.ts
import { create } from "zustand";
import type { MyeongSik } from "@/shared/lib/storage";
import { supabase } from "@/lib/supabase";

/**
 * dir 타입을 MyeongSik에서 자동으로 추론
 */
type Direction = MyeongSik extends { dir: infer D } ? D : string;

/**
 * 예전 persist 구조(로컬스토리지)에 저장돼 있던 형태
 * zustand/persist 기본 구조: { state: { ... }, version: number }
 */
type OldPersistRoot = {
  state?: {
    currentId?: string | null;
    list?: MyeongSik[];
  };
  version?: number;
};

type MyeongSikStore = {
  currentId: string | null;
  list: MyeongSik[];
  loading: boolean;

  // 현재 선택 변경
  setCurrent: (id: string | null) => void;

  // 서버에서 현재 계정 명식 불러오기
  loadFromServer: () => Promise<void>;

  // 예전 localStorage("myeongsik-list") → 서버로 1회 마이그레이션
  migrateLocalToServer: () => Promise<void>;

  // CRUD
  add: (m: MyeongSik) => Promise<void>;
  remove: (id: string) => Promise<void>;
  update: (id: string, patch: Partial<MyeongSik>) => Promise<void>;

  // 리스트 재정렬 (UI용, 서버엔 순서 저장 안 함)
  reorder: (newList: MyeongSik[]) => void;

  // 메모리 상태 초기화 (로그아웃 시 등)
  clear: () => void;
};

export const useMyeongSikStore = create<MyeongSikStore>((set, get) => ({
  currentId: null,
  list: [],
  loading: false,

  setCurrent: (id) => set({ currentId: id }),

  /**
   * 서버에서 내 계정 명식 리스트 불러오기
   */
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
      .select("id, raw_data")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error || !data) {
      console.error("loadFromServer error:", error);
      set({ loading: false });
      return;
    }

    // raw_data에 저장된 MyeongSik 복원 + Date 필드 revive
    const revive = (m: MyeongSik): MyeongSik => {
      const corrected =
        m.corrected instanceof Date
          ? m.corrected
          : m.corrected
          ? new Date(m.corrected as unknown as string | number | Date)
          : new Date();

      const dateObj =
        m.dateObj instanceof Date
          ? m.dateObj
          : m.dateObj
          ? new Date(m.dateObj as unknown as string | number | Date)
          : new Date();

      const dir: Direction = (m.dir ?? "forward") as Direction;

      return {
        ...m,
        corrected,
        dateObj,
        dir,
      };
    };

    const list: MyeongSik[] = data
      .map((row) => {
        const raw = row.raw_data as MyeongSik | null;
        if (!raw) return null;
        // id는 raw_data에 이미 들어있다고 가정 (예전 로컬 id 유지)
        return revive(raw);
      })
      .filter((x): x is MyeongSik => x !== null);

    const firstId = list[0]?.id ?? null;

    set({
      list,
      currentId: firstId,
      loading: false,
    });
  },

  /**
   * 예전 localStorage("myeongsik-list") → 서버로 1회 마이그레이션
   * - 서버에 이미 내 명식이 있으면 그냥 로컬만 지움
   * - 없으면 로컬 것을 전부 서버로 업로드 후 로컬 키 삭제
   */
  migrateLocalToServer: async () => {
    if (typeof window === "undefined") return;

    const raw = window.localStorage.getItem("myeongsik-list");
    if (!raw) return;

    // 현재 유저
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.warn("migrateLocalToServer: no user, skip");
      return;
    }

    // 서버에 이미 데이터가 있으면, 로컬 것은 그냥 폐기
    const { data: existing, error: existingError } = await supabase
      .from("myeongsik")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (!existingError && existing && existing.length > 0) {
      window.localStorage.removeItem("myeongsik-list");
      return;
    }

    let parsed: OldPersistRoot;
    try {
      parsed = JSON.parse(raw) as OldPersistRoot;
    } catch (e) {
      console.error("migrateLocalToServer: JSON parse error", e);
      window.localStorage.removeItem("myeongsik-list");
      return;
    }

    const state = parsed.state ?? {};
    const list = Array.isArray(state.list) ? state.list : [];

    if (list.length === 0) {
      window.localStorage.removeItem("myeongsik-list");
      return;
    }

    const revive = (m: MyeongSik): MyeongSik => {
      const corrected =
        m.corrected instanceof Date
          ? m.corrected
          : m.corrected
          ? new Date(m.corrected as unknown as string | number | Date)
          : new Date();

      const dateObj =
        m.dateObj instanceof Date
          ? m.dateObj
          : m.dateObj
          ? new Date(m.dateObj as unknown as string | number | Date)
          : new Date();

      const dir: Direction = (m.dir ?? "forward") as Direction;

      return {
        ...m,
        corrected,
        dateObj,
        dir,
      };
    };

    // 하나씩 서버로 업로드
    for (const item of list) {
      const revived = revive(item as MyeongSik);

      const { error } = await supabase.from("myeongsik").insert({
        id: revived.id, // uuid 문자열로 이미 존재한다고 가정
        user_id: user.id,
        raw_data: revived,
      });

      if (error) {
        console.error("migrateLocalToServer insert error:", error);
      }
    }

    // 마이그레이션 끝나면 로컬 데이터 삭제
    window.localStorage.removeItem("myeongsik-list");
  },

  /**
   * 명식 추가: 서버에 insert 후, 리스트 다시 로딩
   */
  add: async (m) => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("add: user not found", userError);
      return;
    }

    const { error } = await supabase.from("myeongsik").insert({
      id: m.id, // 기존 uuid 유지
      user_id: user.id,
      raw_data: m,
    });

    if (error) {
      console.error("add insert error:", error);
      return;
    }

    // 서버 기준으로 다시 로딩
    await get().loadFromServer();
  },

  /**
   * 명식 삭제
   */
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

  /**
   * 명식 수정
   */
  update: async (id, patch) => {
    const prev = get().list.find((x) => x.id === id);
    if (!prev) return;

    const next: MyeongSik = {
      ...prev,
      ...patch,
    };

    const { error } = await supabase
      .from("myeongsik")
      .update({ raw_data: next })
      .eq("id", id);

    if (error) {
      console.error("update error:", error);
      return;
    }

    await get().loadFromServer();
  },

  /**
   * 리스트 재정렬 (현재는 클라이언트에서만 순서 반영)
   * 서버 순서를 보존하려면 별도 order 컬럼을 두고 update 해야 함.
   */
  reorder: (newList) => {
    set({ list: newList });
  },

  /**
   * 메모리 상태 초기화 (로그아웃 시 등)
   */
  clear: () => {
    set({ currentId: null, list: [] });
  },
}));
