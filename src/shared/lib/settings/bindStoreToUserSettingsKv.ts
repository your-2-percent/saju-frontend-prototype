import type { StoreApi, UseBoundStore } from "zustand";
import { fetchUserSettingKv, upsertUserSettingKv, type UserSettingKey } from "./userSettingsKvApi";

type BoundStore<TState> = UseBoundStore<StoreApi<TState>>;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

function stableStringify(v: unknown): string {
  if (v === null) return "null";
  if (v === undefined) return "undefined";
  const t = typeof v;
  if (t === "string") return JSON.stringify(v);
  if (t === "number" || t === "boolean") return String(v);

  if (Array.isArray(v)) {
    return `[${v.map(stableStringify).join(",")}]`;
  }

  if (isPlainObject(v)) {
    const keys = Object.keys(v).sort();
    const body = keys
      .map((k) => `${JSON.stringify(k)}:${stableStringify(v[k])}`)
      .join(",");
    return `{${body}}`;
  }

  // Date 같은 케이스: 문자열화로 통일
  if (v instanceof Date) return `{"$date":${JSON.stringify(v.toISOString())}}`;

  return JSON.stringify(String(v));
}

function debounce<T extends (...args: never[]) => void>(fn: T, ms: number) {
  let timer: number | null = null;

  return (...args: Parameters<T>) => {
    if (timer !== null) window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      timer = null;
      fn(...args);
    }, ms);
  };
}

export type SettingBinding<TState, TSlice> = {
  dbKey: UserSettingKey;
  store: BoundStore<TState>;
  select: (state: TState) => TSlice;
  apply: (slice: TSlice) => void;
  validate?: (raw: unknown) => raw is TSlice;
  debounceMs?: number;
};

export type RunningBinding = {
  dbKey: UserSettingKey;
  loadFromDb: () => Promise<void>;
  applyRemote: (raw: unknown) => void;
  stop: () => void;
};

export function startBinding<TState, TSlice>(
  userId: string,
  cfg: SettingBinding<TState, TSlice>,
): RunningBinding {
  const debounceMs = cfg.debounceMs ?? 400;

  let muted = false;
  let unsub: (() => void) | null = null;

  let lastSavedSig = stableStringify(cfg.select(cfg.store.getState()));

  const saveDebounced = debounce(async (nextSlice: TSlice) => {
    try {
      await upsertUserSettingKv(userId, cfg.dbKey, nextSlice);
      lastSavedSig = stableStringify(nextSlice);
    } catch (e) {
      console.error(`[settings] save failed key=${cfg.dbKey}`, e);
    }
  }, debounceMs);

  const applySlice = (slice: TSlice) => {
    muted = true;
    try {
      cfg.apply(slice);
      lastSavedSig = stableStringify(slice);
    } finally {
      muted = false;
    }
  };

  const applyRemote = (raw: unknown) => {
    if (cfg.validate && !cfg.validate(raw)) return;
    applySlice(raw as TSlice);
  };

  const loadFromDb = async () => {
    const raw = await fetchUserSettingKv<unknown>(userId, cfg.dbKey);
    if (raw === null) return;
    applyRemote(raw);
  };

  // store 변화 감지 → DB 저장(자동)
  unsub = cfg.store.subscribe((state) => {
    if (muted) return;

    const slice = cfg.select(state);
    const sig = stableStringify(slice);

    // 이미 저장된 값이면 스킵
    if (sig === lastSavedSig) return;

    saveDebounced(slice as never);
  });

  const stop = () => {
    if (unsub) unsub();
    unsub = null;
  };

  return { dbKey: cfg.dbKey, loadFromDb, applyRemote, stop };
}
