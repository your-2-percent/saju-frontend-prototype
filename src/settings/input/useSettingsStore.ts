// src/shared/lib/hooks/useSettingsStore.ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

const LS_KEY = "settings_v1";

const purgeLocalSettings = () => {
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LS_KEY);
    }
  } catch {
    /* ignore */
  }
};

export type DaewoonDisplayBase = "정밀기준" | "표준기준";

export type Settings = {
  hiddenStem: "all" | "regular";
  hiddenStemMode: "classic" | "hgc";
  ilunRule: "자시" | "조자시/야자시" | "인시";
  sinsalMode: "classic" | "modern";
  sinsalBase: "일지" | "연지";
  sinsalBloom: boolean;
  exposure: "원국" | "대운" | "세운" | "월운";
  daewoonDisplayBase: DaewoonDisplayBase;
  charType: "한자" | "한글";
  thinEum: boolean;
  showSipSin: boolean;
  showSibiSinsal: boolean;
  showSibiUnseong: boolean;
  showNabeum: boolean;
  showEtcShinsal: boolean;
  showRelationBox: boolean;
  showPromptBox: boolean;
  theme: "dark" | "light";
  sectionOrder?: string[];
  difficultyMode?: boolean;
  sidebarCardsCollapsed: boolean;
  sidebarCardCollapsedMap: Record<string, boolean>;
  sidebarCollapseInitDone: boolean;
};

export const defaultSettings: Settings = {
  hiddenStem: "all",
  hiddenStemMode: "classic",
  ilunRule: "조자시/야자시",
  sinsalMode: "classic",
  sinsalBase: "일지",
  sinsalBloom: false,
  exposure: "원국",
  daewoonDisplayBase: "표준기준",
  charType: "한자",
  thinEum: false,
  showSipSin: true,
  showSibiSinsal: true,
  showSibiUnseong: true,
  showNabeum: true,
  showEtcShinsal: true,
  showRelationBox: true,
  showPromptBox: true,
  theme: "dark",
  difficultyMode: false,
  sidebarCardsCollapsed: false,
  sidebarCardCollapsedMap: {},
  sidebarCollapseInitDone: true,
  sectionOrder: [
    "hiddenStem",
    "hiddenStemMode",
    "ilunRule",
    "sinsalMode",
    "sinsalBase",
    "sinsalBloom",
    "exposure",
    "charType",
    "thinEum",
    "visibility",
    "difficultyMode",
  ],
};

const SECTION_KEYS = [
  "theme",
  "hiddenStem",
  "hiddenStemMode",
  "ilunRule",
  "sinsalMode",
  "sinsalBase",
  "sinsalBloom",
  "exposure",
  "charType",
  "thinEum",
  "visibility",
  "difficultyMode",
] as const;

const normalizeSectionOrder = (saved?: unknown): string[] => {
  const base = Array.isArray(saved)
    ? (saved as unknown[]).filter(
        (v): v is typeof SECTION_KEYS[number] =>
          typeof v === "string" && (SECTION_KEYS as readonly string[]).includes(v)
      )
    : [];
  const missing = SECTION_KEYS.filter((k) => !base.includes(k));
  return [...base, ...missing];
};

const withDefaults = (s: Settings): Settings => ({
  ...defaultSettings,
  ...s,
  sectionOrder: normalizeSectionOrder(s.sectionOrder),
});

const coerceSettings = (raw: unknown): Settings => {
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.settings && typeof obj.settings === "object") {
      return withDefaults(obj.settings as Settings);
    }
    if (obj.state && typeof obj.state === "object") {
      const state = obj.state as Record<string, unknown>;
      if (state.settings && typeof state.settings === "object") {
        return withDefaults(state.settings as Settings);
      }
    }
  }
  return withDefaults((raw ?? {}) as Settings);
};

const needsMigration = (raw: unknown): boolean => {
  if (!raw || typeof raw !== "object") return false;
  const obj = raw as Record<string, unknown>;
  if (obj.state || obj.settings) return true;
  return false;
};

type SettingsState = {
  settings: Settings;
  setSettings: (next: Settings) => void;
  setKey: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
  loadFromServer: () => Promise<void>;
  saveToServer: (force?: boolean) => Promise<void>;
  syncing: boolean;
  loaded: boolean;
};

purgeLocalSettings(); // 모듈 로드 시 한 번 제거

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      settings: defaultSettings,
      syncing: false,
      loaded: false,

      setSettings: (next) => set({ settings: withDefaults(next) }),
      setKey: (key, value) => set({ settings: withDefaults({ ...get().settings, [key]: value }) }),

      // ✅ reset은 “기본값 세팅 완료”니까 loaded=true로 두는 게 안전
      reset: () => set({ settings: defaultSettings, loaded: true }),

      loadFromServer: async (opts?: { force?: boolean }) => {
        const st = get();

        // ✅ 1) 중복 호출 방지(StrictMode, 연타)
        if (st.syncing) return;

        // ✅ 2) 이미 로드 끝났으면 재호출 막기 (필요하면 force로 뚫기)
        if (!opts?.force && st.loaded) return;

        try {
          set({ syncing: true });

          // purge는 한 번만 하는 게 안전(중복 호출 시 local 설정 날려먹을 수 있음)
          purgeLocalSettings();

          const { data, error: userError } = await supabase.auth.getUser();
          const user = data?.user ?? null;

          // ✅ 로그인 X면 기본값으로 “로드 완료”
          if (userError || !user) {
            set({
              settings: defaultSettings,
              syncing: false,
              loaded: true,
            });
            return;
          }

          // ✅ 같은 유저로 이미 loaded면 스킵(세션 안정화 전 중복 방지)
          const st2 = get();
          // user id를 store에 저장하고 있다면 그걸로 비교하는 게 더 좋음
          if (!opts?.force && st2.loaded && !st2.syncing) {
            // 이미 로드완료 상태면 종료
            // (StrictMode로 2번 들어올 때 1번째가 먼저 로드 끝낸 경우)
            // 그냥 return 하면 됨
            // 단, 여기서 return 하면 syncing true가 안 되므로 위에서 체크한 syncing 조건 때문에 여기까지 못 오는 게 보통이긴 함
          }

          const { data: row, error } = await supabase
            .from("user_settings")
            .select("payload")
            .eq("user_id", user.id)
            .maybeSingle();

          // ✅ row 없으면 생성(중복 upsert 방지 위해 조건부)
          if (!row && !error) {
            await supabase.from("user_settings").upsert({
              user_id: user.id,
              payload: {},
            });
          }

          // PGRST116: maybeSingle 결과 없음 케이스로 자주 나옴(상황에 따라)
          if (error && error.code !== "PGRST116") {
            console.error("loadFromServer(settings) error:", error);
            set({ syncing: false, loaded: true });
            return;
          }

          if (row?.payload) {
            const normalized = coerceSettings(row.payload);
            const raw = row.payload as Record<string, unknown>;
            const initDone = raw?.sidebarCollapseInitDone === true;

            if (!initDone) {
              normalized.sidebarCardsCollapsed = defaultSettings.sidebarCardsCollapsed;
              normalized.sidebarCardCollapsedMap = {};
              normalized.sidebarCollapseInitDone = true;
            }
            set({
              settings: normalized,
              syncing: false,
              loaded: true,
            });

            // ✅ migration은 백그라운드로 (StrictMode로 중복 호출돼도 syncing 가드로 1회만)
            if (needsMigration(row.payload) || !initDone) {
              await supabase.from("user_settings").upsert({
                user_id: user.id,
                payload: normalized,
                updated_at: new Date().toISOString(),
              });
            }
            return;
          }

          // payload 없으면 서버 저장으로 초기화
          await get().saveToServer(true);
          set({ syncing: false, loaded: true });
        } catch (e) {
          console.error("loadFromServer(settings) exception:", e);
          set({ syncing: false, loaded: true });
        }
      },


      saveToServer: async (force = false) => {
        try {
          if (!get().loaded && !force) return;
          set({ syncing: true });
          purgeLocalSettings();

          const { data, error: userError } = await supabase.auth.getUser();
          const user = data?.user ?? null;

          // ✅ 게스트면 서버 저장 스킵, 대신 syncing만 종료
          if (userError || !user) {
            // ✅ 게스트도 기본 설정으로 "로드 완료" 처리해야 화면이 안 멈춤
            set({ syncing: false, loaded: true, settings: defaultSettings });
            return;
          }

          const normalized = withDefaults(get().settings);

          const { error } = await supabase.from("user_settings").upsert({
            user_id: user.id,
            payload: normalized,
            updated_at: new Date().toISOString(),
          });

          if (error) {
            console.error("saveToServer(settings) error:", error);
          }

          set({ syncing: false, loaded: true });
        } catch (e) {
          console.error("saveToServer(settings) exception:", e);
          set({ syncing: false, loaded: true });
        }
      },
    }),
    {
      name: LS_KEY,
      storage: {
        getItem: () => null,
        setItem: () => null,
        removeItem: () => null,
      },
      merge: (_persisted, current) => current,
    }
  )
);
