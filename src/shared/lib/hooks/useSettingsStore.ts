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
  hiddenStem: "all" | "regular";        // 지장간: 전체 / 정기만
  hiddenStemMode: "classic" | "hgc";    // 지장간 유형: 고전 / 하건충
  ilunRule: "자시" | "조자시/야자시" | "인시";
  sinsalMode: "classic" | "modern";
  sinsalBase: "일지" | "연지";
  sinsalBloom: boolean;
  exposure: "원국" | "대운" | "세운" | "월운";
  charType: "한자" | "한글";
  thinEum: boolean;                     // 음간/음지 얇게
  showSipSin: boolean;                  // 십신
  showSibiSinsal: boolean;              // 십이신살
  showSibiUnseong: boolean;             // 십이운성
  showNabeum: boolean;                  // ✅ 납음 표시 (스토어에 정식 편입)
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
  showNabeum: true, // ✅ 기본 ON
  theme: "dark",
  difficultyMode: false,
  sectionOrder: [
    "hiddenStem","hiddenStemMode","ilunRule","sinsalMode","sinsalBase",
    "sinsalBloom","exposure","charType","thinEum","visibility","difficultyMode",
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
    ? (saved as unknown[]).filter((v): v is typeof SECTION_KEYS[number] => typeof v === "string" && (SECTION_KEYS as readonly string[]).includes(v))
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
  // 예전 persist 포맷: { state: { settings: {...} } } 또는 { settings: {...} }
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
      setKey: (key, value) =>
        set({ settings: withDefaults({ ...get().settings, [key]: value }) }),
      reset: () => set({ settings: defaultSettings }),
      loadFromServer: async () => {
        try {
          set({ syncing: true });
          purgeLocalSettings();

          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            set({ syncing: false, loaded: false });
            return;
          }

          const { data, error } = await supabase
            .from("user_settings")
            .select("payload")
            .eq("user_id", user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            console.error("loadFromServer(settings) error:", error);
            set({ syncing: false, loaded: true });
            return;
          }

          if (data?.payload) {
            const normalized = coerceSettings(data.payload);
            set({
              settings: normalized,
              syncing: false,
              loaded: true,
            });

            // 예전 포맷이면 정규화된 값으로 즉시 갱신
            if (needsMigration(data.payload)) {
              await supabase
                .from("user_settings")
                .upsert({
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

          const {
            data: { user },
            error: userError,
          } = await supabase.auth.getUser();

          if (userError || !user) {
            set({ syncing: false });
            return;
          }

          const normalized = withDefaults(get().settings);

          const { error } = await supabase
            .from("user_settings")
            .upsert({
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
          set({ syncing: false });
        }
      },
    }),
    {
      name: LS_KEY,
      // 로컬스토리지 사용 차단 및 기존 잔여 데이터 무시
      storage: {
        getItem: () => null,
        setItem: () => null,
        removeItem: () => null,
      },
      merge: (_persisted, current) => current,
    }
  )
);
