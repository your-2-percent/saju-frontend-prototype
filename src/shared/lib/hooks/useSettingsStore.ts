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

export type Settings = {
  hiddenStem: "all" | "regular";
  hiddenStemMode: "classic" | "hgc";
  ilunRule: "자시" | "조자시/야자시" | "인시";
  sinsalMode: "classic" | "modern";
  sinsalBase: "일지" | "연지";
  sinsalBloom: boolean;
  exposure: "원국" | "대운" | "세운" | "월운";
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
};

export const defaultSettings: Settings = {
  hiddenStem: "all",
  hiddenStemMode: "classic",
  ilunRule: "조자시/야자시",
  sinsalMode: "classic",
  sinsalBase: "일지",
  sinsalBloom: false,
  exposure: "원국",
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

      loadFromServer: async () => {
        try {
          set({ syncing: true });
          purgeLocalSettings();

          const { data, error: userError } = await supabase.auth.getUser();
          const user = data?.user ?? null;

          // ✅ 핵심: 로그인 X면 “기본값으로 로드 완료 처리”
          if (userError || !user) {
            set({
              settings: defaultSettings,
              syncing: false,
              loaded: true,
            });
            return;
          }

          const { data: row, error } = await supabase
            .from("user_settings")
            .select("payload")
            .eq("user_id", user.id)
            .maybeSingle();

          // row가 없으면 만들어두기
          if (!row) {
            await supabase.from("user_settings").upsert({
              user_id: user.id,
              payload: {},
            });
          }

          if (error && error.code !== "PGRST116") {
            console.error("loadFromServer(settings) error:", error);
            set({ syncing: false, loaded: true });
            return;
          }

          if (row?.payload) {
            const normalized = coerceSettings(row.payload);
            set({
              settings: normalized,
              syncing: false,
              loaded: true,
            });

            if (needsMigration(row.payload)) {
              await supabase.from("user_settings").upsert({
                user_id: user.id,
                payload: normalized,
                updated_at: new Date().toISOString(),
              });
            }
            return;
          }

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
