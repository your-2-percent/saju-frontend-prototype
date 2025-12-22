// src/shared/lib/hooks/useMyeongSikStore.ts
import { create } from "zustand";
import type { MyeongSik } from "@/shared/lib/storage";
import { reviveAndRecalc } from "@/shared/domain/meongsik";

import type { MyeongSikWithOrder } from "@/shared/lib/myeongsikStore/types";
import { fromRow, sortByOrder } from "@/shared/lib/myeongsikStore/mappers";
import {
  setSessionStartedAtMs,
  shouldHardReloadBecauseStaleSession,
} from "@/shared/lib/myeongsikStore/staleSession";
import { migrateLegacyLocalListToServer } from "@/shared/lib/myeongsikStore/migrateLocalToServer";
import { createReorderWriteQueue } from "@/shared/lib/myeongsikStore/reorderQueue";
import { toDnDArgs, type MoveItemArgs } from "@/shared/lib/myeongsikStore/dndArgs";
import { reduceListByRealtime } from "@/shared/lib/myeongsikStore/realtimeReducer";
import type { RealtimeSubscription } from "@/shared/lib/myeongsikStore/repo/ports";
import { makeSupabaseMyeongSikRepo } from "@/shared/lib/myeongsikStore/repo/supabaseRepo";

import {
  moveByDnD,
  toggleFavoriteAndReorder,
  unsetFolderForFolder as unsetFolderForFolderOp,
} from "@/shared/domain/myeongsikList/ops";

import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

const repo = makeSupabaseMyeongSikRepo();
const reorderQueue = createReorderWriteQueue(repo);

function canManageNowOrWarn(): boolean {
  const ent = useEntitlementsStore.getState();
  const ok = ent.canManageNow();
  if (!ok) console.warn("[myeongsik] blocked: canManageNow=false");
  return ok;
}

function canAddNowOrWarn(currentCount: number): boolean {
  const ent = useEntitlementsStore.getState();
  const res = ent.canAddMyeongsik(currentCount);
  if (!res.ok) console.warn("[myeongsik] blocked: canAddMyeongsik", res.message);
  return res.ok;
}

export type MyeongSikStore = {
  loading: boolean;
  realtimeReady: boolean;
  list: MyeongSikWithOrder[];
  currentId: string | null;

  // getters
  getCurrent: () => MyeongSikWithOrder | null;

  // realtime
  startRealtime: () => Promise<void>;
  stopRealtime: () => Promise<void>;

  // load/migrate
  loadFromServer: () => Promise<void>;
  migrateLocalToServer: () => Promise<void>;

  // CRUD
  setCurrentId: (id: string | null) => void;
  add: (m: MyeongSik) => Promise<void>;
  update: (id: string, patch: Partial<MyeongSikWithOrder>) => Promise<void>;
  remove: (id: string) => Promise<void>;

  // list ops
  moveItemByDnD: (args: MoveItemArgs) => Promise<void>;
  toggleFavoriteWithReorder: (id: string, orderedFolders: string[]) => Promise<void>;
  unsetFolderForFolder: (folderName: string) => Promise<void>;
  reorder: (newList: MyeongSikWithOrder[]) => Promise<void>;
  clear: () => void;

  // internal
  _rtSub: RealtimeSubscription | null;
  _rtUserId: string | null;
};

export const useMyeongSikStore = create<MyeongSikStore>((set, get) => ({
  loading: false,
  realtimeReady: false,
  list: [],
  currentId: null,

  _rtSub: null,
  _rtUserId: null,

  getCurrent: () => {
    const { list, currentId } = get();
    if (!currentId) return null;
    return list.find((m) => m.id === currentId) ?? null;
  },

  setCurrentId: (id) => set({ currentId: id }),

  startRealtime: async () => {
    if (typeof window === "undefined") return;

    if (shouldHardReloadBecauseStaleSession()) {
      setSessionStartedAtMs(Date.now());
      window.location.reload();
      return;
    }

    const user = await repo.getUser();
    if (!user) {
      await get().stopRealtime();
      set({ realtimeReady: false });
      return;
    }

    if (get()._rtUserId === user.id && get()._rtSub) {
      set({ realtimeReady: true });
      return;
    }

    await get().stopRealtime();

    const sub = await repo.subscribe(
      user.id,
      (payload) => {
        set((state) => ({ list: reduceListByRealtime(state.list, payload) }));
      },
      (status) => {
        if (status === "SUBSCRIBED") set({ realtimeReady: true });
      },
    );

    set({ _rtSub: sub, _rtUserId: user.id });
  },

  stopRealtime: async () => {
    const sub = get()._rtSub;
    if (sub) {
      try {
        await sub.unsubscribe();
      } catch (e) {
        console.warn("stopRealtime error", e);
      }
    }

    set({ _rtSub: null, _rtUserId: null, realtimeReady: false });
  },

  loadFromServer: async () => {
    set({ loading: true });

    try {
      const user = await repo.getUser();
      if (!user) {
        set({ list: [], currentId: null });
        await get().stopRealtime();
        return;
      }

      const rows = await repo.fetchRows(user.id);
      const list = sortByOrder(rows.map(fromRow));

      const prevCurrent = get().currentId;
      const firstId =
        prevCurrent && list.some((m) => m.id === prevCurrent)
          ? prevCurrent
          : list[0]?.id ?? null;

      set({ list, currentId: firstId });
      await get().startRealtime();
    } catch (e) {
      console.error("useMyeongSikStore.loadFromServer exception:", e);
    } finally {
      set({ loading: false });
    }
  },

  migrateLocalToServer: async () => {
    try {
      await migrateLegacyLocalListToServer(repo);
    } catch (e) {
      console.error("useMyeongSikStore.migrateLocalToServer exception:", e);
    }
  },

  add: async (m) => {
    const user = await repo.getUser();
    if (!user) return;

    const currentCount = get().list.length;

    // ✅ 플랜 기반 “추가 가능” 체크 (FREE=1, BASIC=3/5/10, PRO=9999)
    if (!canAddNowOrWarn(currentCount)) return;

    const nextOrder = (currentCount || 0) + 1;
    const base: MyeongSikWithOrder = { ...m, sortOrder: m.sortOrder ?? nextOrder };
    const withOrder: MyeongSikWithOrder = reviveAndRecalc(base);

    set((state) => ({
      list: sortByOrder([...state.list, withOrder]),
      currentId: state.currentId ?? withOrder.id,
    }));

    await repo.upsertOne(user.id, withOrder);
  },

  update: async (id, patch) => {
    if (!canManageNowOrWarn()) return;

    const prev = get().list.find((x) => x.id === id);
    if (!prev) return;

    const merged: MyeongSikWithOrder = reviveAndRecalc({ ...prev, ...patch });

    set((state) => ({
      list: sortByOrder(state.list.map((x) => (x.id === id ? merged : x))),
    }));

    const user = await repo.getUser();
    if (!user) return;

    await repo.updateOne(user.id, id, merged);
  },

  remove: async (id) => {
    if (!canManageNowOrWarn()) return;

    set((state) => {
      const filtered = state.list.filter((x) => x.id !== id);
      const newCurrentId =
        state.currentId === id ? filtered[0]?.id ?? null : state.currentId;
      return { list: filtered, currentId: newCurrentId };
    });

    await repo.softDelete(id);
  },

  moveItemByDnD: async (args) => {
    if (!canManageNowOrWarn()) return;

    const { list } = get();
    const v2 = toDnDArgs(args);

    const result = moveByDnD({
      list,
      orderedFolders: v2.orderedFolders,
      source: v2.source,
      destination: v2.destination,
    });

    const nextList = result.nextList;
    set({ list: nextList });
    await get().reorder(nextList);
  },

  toggleFavoriteWithReorder: async (id, orderedFolders) => {
    if (!canManageNowOrWarn()) return;

    const { list } = get();

    const result = toggleFavoriteAndReorder({
      list,
      targetId: id,
      orderedFolders,
    });

    const nextList = result.nextList;
    set({ list: nextList });
    await get().reorder(nextList);
  },

  unsetFolderForFolder: async (folderName) => {
    if (!canManageNowOrWarn()) return;

    const name = (folderName ?? "").trim();
    if (!name) return;

    const prev = get().list;

    const result = unsetFolderForFolderOp({
      list: prev,
      folderName: name,
    });

    const nextList = sortByOrder(result.nextList);
    const changedIds = new Set(result.changedIds);
    if (changedIds.size === 0) return;

    set({ list: nextList });

    const user = await repo.getUser();
    if (!user) return;

    const changed = nextList.filter((m) => changedIds.has(m.id));
    await repo.upsertOrderPatch(user.id, changed);
  },

  reorder: async (newList) => {
    if (!canManageNowOrWarn()) return;

    const withOrder: MyeongSikWithOrder[] = newList.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    const next = sortByOrder(withOrder);
    set({ list: next });

    await reorderQueue.queue(next);
  },

  clear: () => {
    set({ currentId: null, list: [] });
  },
}));
