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
import { loadGuestList, saveGuestList, clearGuestList } from "@/shared/lib/myeongsikStore/guestListStorage";
import { useLoginNudgeStore } from "@/shared/auth/loginNudgeStore";

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

async function migrateGuestListToServerIfAny(userId: string): Promise<void> {
  const guest = loadGuestList();
  if (!guest.length) return;

  try {
    for (const item of guest) {
      await repo.upsertOne(userId, item);
    }
    clearGuestList();
  } catch (e) {
    console.warn("[myeongsik] migrateGuestListToServerIfAny failed:", e);
  }
}

export type MyeongSikStore = {
  loading: boolean;
  realtimeReady: boolean;
  list: MyeongSikWithOrder[];
  currentId: string | null;

  getCurrent: () => MyeongSikWithOrder | null;

  startRealtime: () => Promise<void>;
  stopRealtime: () => Promise<void>;

  loadFromServer: () => Promise<void>;
  migrateLocalToServer: () => Promise<void>;

  setCurrentId: (id: string | null) => void;
  add: (m: MyeongSik) => Promise<void>;
  update: (id: string, patch: Partial<MyeongSikWithOrder>) => Promise<void>;
  remove: (id: string) => Promise<void>;

  moveItemByDnD: (args: MoveItemArgs) => Promise<void>;
  toggleFavoriteWithReorder: (id: string, orderedFolders: string[]) => Promise<void>;
  unsetFolderForFolder: (folderName: string) => Promise<void>;
  reorder: (newList: MyeongSikWithOrder[]) => Promise<void>;
  clear: () => void;

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
      }
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

      // ✅ 게스트: 로컬에서 불러오기
      if (!user) {
        const guest = loadGuestList();
        const firstId = guest[0]?.id ?? null;
        set({ list: guest, currentId: firstId });
        await get().stopRealtime();
        return;
      }

      // ✅ 로그인: 게스트가 있으면 서버로 자동 이관
      await migrateGuestListToServerIfAny(user.id);

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

      const user = await repo.getUser();
      if (user) await migrateGuestListToServerIfAny(user.id);
    } catch (e) {
      console.error("useMyeongSikStore.migrateLocalToServer exception:", e);
    }
  },

  add: async (m) => {
    const user = await repo.getUser();
    const currentCount = get().list.length;

    if (!canAddNowOrWarn(currentCount)) {
      if (!user) useLoginNudgeStore.getState().openWith("ADD_LIMIT");
      return;
    }

    const nextOrder = (currentCount || 0) + 1;
    const base: MyeongSikWithOrder = { ...m, sortOrder: m.sortOrder ?? nextOrder } as MyeongSikWithOrder;
    const withOrder: MyeongSikWithOrder = reviveAndRecalc(base);

    // ✅ 여기서 nextList를 확정(게스트/로그인 공통)
    const prev = get().list;
    const nextList = sortByOrder([...prev, withOrder]);
    const nextCurrentId = get().currentId ?? withOrder.id;

    set({ list: nextList, currentId: nextCurrentId });

    // ✅ 게스트: 로컬 저장 + 첫 저장이면 로그인 유도
    if (!user) {
      saveGuestList(nextList);

      if (nextList.length === 1) {
        useLoginNudgeStore.getState().openWith("PERSIST_SAVE");
      }
      return;
    }

    await repo.upsertOne(user.id, withOrder);
  },

  update: async (id, patch) => {
    const user = await repo.getUser();
    if (user && !canManageNowOrWarn()) return;

    const prevItem = get().list.find((x) => x.id === id);
    if (!prevItem) return;

    const merged: MyeongSikWithOrder = reviveAndRecalc({ ...prevItem, ...patch });

    const nextList = sortByOrder(get().list.map((x) => (x.id === id ? merged : x)));
    set({ list: nextList });

    if (!user) {
      saveGuestList(nextList);
      return;
    }

    await repo.updateOne(user.id, id, merged);
  },

  remove: async (id) => {
    const user = await repo.getUser();
    if (user && !canManageNowOrWarn()) return;

    const prev = get().list;
    const filtered = prev.filter((x) => x.id !== id);
    const newCurrentId = get().currentId === id ? filtered[0]?.id ?? null : get().currentId;

    set({ list: filtered, currentId: newCurrentId });

    if (!user) {
      saveGuestList(filtered);
      return;
    }

    await repo.softDelete(id);
  },

  moveItemByDnD: async (args) => {
    const user = await repo.getUser();
    if (user && !canManageNowOrWarn()) return;

    const v2 = toDnDArgs(args);
    const result = moveByDnD({
      list: get().list,
      orderedFolders: v2.orderedFolders,
      source: v2.source,
      destination: v2.destination,
    });

    const nextList = result.nextList;
    set({ list: nextList });

    if (!user) {
      saveGuestList(nextList);
      return;
    }

    await get().reorder(nextList);
  },

  toggleFavoriteWithReorder: async (id, orderedFolders) => {
    const user = await repo.getUser();
    if (user && !canManageNowOrWarn()) return;

    const result = toggleFavoriteAndReorder({
      list: get().list,
      targetId: id,
      orderedFolders,
    });

    const nextList = result.nextList;
    set({ list: nextList });

    if (!user) {
      saveGuestList(nextList);
      return;
    }

    await get().reorder(nextList);
  },

  unsetFolderForFolder: async (folderName) => {
    const user = await repo.getUser();
    if (user && !canManageNowOrWarn()) return;

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

    if (!user) {
      saveGuestList(nextList);
      return;
    }

    const changed = nextList.filter((m) => changedIds.has(m.id));
    await repo.upsertOrderPatch(user.id, changed);
  },

  reorder: async (newList) => {
    const user = await repo.getUser();
    if (user && !canManageNowOrWarn()) return;

    const withOrder: MyeongSikWithOrder[] = newList.map((item, idx) => ({
      ...item,
      sortOrder: idx + 1,
    }));

    const next = sortByOrder(withOrder);
    set({ list: next });

    if (!user) {
      saveGuestList(next);
      return;
    }

    await reorderQueue.queue(next);
  },

  clear: () => {
    set({ currentId: null, list: [] });
    clearGuestList();
  },
}));
