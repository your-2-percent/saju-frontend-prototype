// src/shared/lib/hooks/useMyeongSikStore.ts
import { create } from "zustand";
import type { MyeongSik } from "@/shared/lib/storage";
import { reviveAndRecalc } from "@/myeongsik/calc";

import type { MyeongSikWithOrder } from "@/myeongsik/calc/myeongsikStore/types";
import { fromRow, sortByOrder } from "@/myeongsik/calc/myeongsikStore/mappers";
import {
  setSessionStartedAtMs,
  shouldHardReloadBecauseStaleSession,
} from "@/myeongsik/calc/myeongsikStore/staleSession";
import {
  buildUserScopedMigratedId,
  isMigratedLegacyId,
  migrateLegacyLocalListToServer,
  migrateMyowoonLocalListToGuest,
  migrateMyowoonLocalListToServer,
} from "@/myeongsik/save/migrateLocalToServer";
import { createReorderWriteQueue } from "@/myeongsik/calc/myeongsikStore/reorderQueue";
import { toDnDArgs, type MoveItemArgs } from "@/myeongsik/calc/myeongsikStore/dndArgs";
import { reduceListByRealtime } from "@/myeongsik/calc/myeongsikStore/realtimeReducer";
import type { RealtimeSubscription } from "@/myeongsik/saveInterface/ports";
import { makeSupabaseMyeongSikRepo } from "@/myeongsik/saveInterface/supabaseRepo";

import {
  moveByDnD,
  toggleFavoriteAndReorder,
  unsetFolderForFolder as unsetFolderForFolderOp,
} from "@/myeongsik/calc/myeongsikList/ops";

import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { loadGuestList, saveGuestList, clearGuestList } from "@/myeongsik/calc/myeongsikStore/guestListStorage";
import { useLoginNudgeStore } from "@/auth/input/loginNudgeStore";

const repo = makeSupabaseMyeongSikRepo();
const reorderQueue = createReorderWriteQueue(repo);
const CURRENT_ID_STORAGE_KEY = "myeongsik_current_id_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function getCurrentIdStorageKey(userId: string | null): string {
  return userId ? `${CURRENT_ID_STORAGE_KEY}:user:${userId}` : `${CURRENT_ID_STORAGE_KEY}:guest`;
}

function readPersistedCurrentId(userId: string | null): string | null {
  if (!isBrowser()) return null;

  try {
    const raw = window.localStorage.getItem(getCurrentIdStorageKey(userId));
    return raw && raw.trim() !== "" ? raw : null;
  } catch {
    return null;
  }
}

function writePersistedCurrentId(userId: string | null, id: string | null): void {
  if (!isBrowser()) return;

  const key = getCurrentIdStorageKey(userId);

  try {
    if (!id) {
      window.localStorage.removeItem(key);
      return;
    }
    window.localStorage.setItem(key, id);
  } catch {
    // ignore storage failures
  }
}

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

function toMsSignature(v: {
  name?: string;
  birthDay?: string;
  birthTime?: string;
  gender?: string;
  folder?: string;
}): string {
  return `${v.name ?? ""}|${v.birthDay ?? ""}|${v.birthTime ?? ""}|${v.gender ?? ""}|${v.folder ?? ""}`;
}

function mergeServerAndGuestList(
  server: MyeongSikWithOrder[],
  guest: MyeongSikWithOrder[],
): MyeongSikWithOrder[] {
  if (!guest.length) return server;
  if (!server.length) return sortByOrder(guest);

  const merged: MyeongSikWithOrder[] = [...server];
  const idSet = new Set(server.map((x) => x.id));
  const sigSet = new Set(
    server.map((x) =>
      toMsSignature({
        name: x.name,
        birthDay: x.birthDay,
        birthTime: x.birthTime,
        gender: x.gender,
        folder: x.folder,
      }),
    ),
  );

  let nextOrder = merged.reduce((max, x) => Math.max(max, Number(x.sortOrder ?? 0)), 0);
  for (const item of guest) {
    const sig = toMsSignature({
      name: item.name,
      birthDay: item.birthDay,
      birthTime: item.birthTime,
      gender: item.gender,
      folder: item.folder,
    });

    if (idSet.has(item.id) || sigSet.has(sig)) continue;

    nextOrder += 1;
    merged.push({
      ...item,
      sortOrder:
        typeof item.sortOrder === "number" && Number.isFinite(item.sortOrder)
          ? item.sortOrder
          : nextOrder,
    });
    idSet.add(item.id);
    sigSet.add(sig);
  }

  return sortByOrder(merged);
}

async function migrateGuestListToServerIfAny(
  userId: string,
): Promise<{ ok: boolean; remainingGuest: MyeongSikWithOrder[] }> {
  const guest = loadGuestList();
  if (!guest.length) return { ok: true, remainingGuest: [] };
  const migrationReadyGuest = guest.map((item, idx) => {
    if (!isMigratedLegacyId(item.id)) return item;
    return {
      ...item,
      id: buildUserScopedMigratedId(userId, item, idx),
    };
  });
  if (migrationReadyGuest.some((item, idx) => item.id !== guest[idx]?.id)) {
    saveGuestList(migrationReadyGuest);
  }

  // ✅ soft-deleted 포함 서버 전체 id를 먼저 확인
  // (이미 존재하는 항목은 upsert/merge 금지 → 삭제 복원 버그 방지)
  let existingIds: Set<string> = new Set();
  try {
    existingIds = new Set(await repo.fetchExistingIds(userId));
  } catch (e) {
    console.warn("[myeongsik] fetchExistingIds failed:", e);
    // 서버 상태를 알 수 없으면 guest를 merge에 포함하지 않음
    return { ok: false, remainingGuest: [] };
  }

  try {
    for (const item of migrationReadyGuest) {
      if (!existingIds.has(item.id)) {
        await repo.upsertOne(userId, item);
      }
    }

    const serverRows = await repo.fetchRows(userId);
    const serverList = sortByOrder(serverRows.map(fromRow));
    const serverIdSet = new Set(serverList.map((x) => x.id));
    const serverSigSet = new Set(
      serverList.map((x) =>
        toMsSignature({
          name: x.name,
          birthDay: x.birthDay,
          birthTime: x.birthTime,
          gender: x.gender,
          folder: x.folder,
        }),
      ),
    );

    const remainingGuest = migrationReadyGuest.filter((item) => {
      // 서버에 존재(soft-deleted 포함)하면 guest에서도 제거
      if (existingIds.has(item.id)) return false;
      if (serverIdSet.has(item.id)) return false;
      const sig = toMsSignature({
        name: item.name,
        birthDay: item.birthDay,
        birthTime: item.birthTime,
        gender: item.gender,
        folder: item.folder,
      });
      return !serverSigSet.has(sig);
    });

    if (remainingGuest.length === 0) {
      clearGuestList();
      return { ok: true, remainingGuest: [] };
    }

    saveGuestList(remainingGuest);
    console.warn("[myeongsik] guest->server migration partial, keeping guest fallback", {
      total: migrationReadyGuest.length,
      remaining: remainingGuest.length,
    });
    return { ok: false, remainingGuest };
  } catch (e) {
    console.warn("[myeongsik] migrateGuestListToServerIfAny failed:", e);
    // ✅ existingIds로 안전하게 필터링 (삭제된 항목 되살아남 방지)
    const safeRemaining = migrationReadyGuest.filter((item) => !existingIds.has(item.id));
    return { ok: false, remainingGuest: safeRemaining };
  }
}

export type MyeongSikStore = {
  loading: boolean;
  loaded: boolean;
  loadedUserId: string | null;
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
  applyNextList: (nextList: MyeongSikWithOrder[]) => Promise<void>;
  toggleFavoriteWithReorder: (id: string, orderedFolders: string[]) => Promise<void>;
  unsetFolderForFolder: (folderName: string) => Promise<void>;
  reorder: (newList: MyeongSikWithOrder[]) => Promise<void>;
  clear: () => void;

  _rtSub: RealtimeSubscription | null;
  _rtUserId: string | null;
};

export const useMyeongSikStore = create<MyeongSikStore>((set, get) => ({
  loading: false,
  loaded: false,
  loadedUserId: null,
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

  setCurrentId: (id) => {
    writePersistedCurrentId(get().loadedUserId, id);
    set({ currentId: id });
  },

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
    if (get().loading) return;
    set({ loading: true });

    try {
      const user = await repo.getUser();

      const st2 = get();
      if (user && st2.loaded && st2.loadedUserId === user.id && st2.list.length > 0) {
        set({ loading: false });
        return;
      }

      // ✅ 게스트: 로컬에서 불러오기
      if (!user) {
        const guest = loadGuestList();
        const persistedCurrent = readPersistedCurrentId(null);
        const firstId =
          persistedCurrent && guest.some((m) => m.id === persistedCurrent)
            ? persistedCurrent
            : guest[0]?.id ?? null;
        writePersistedCurrentId(null, firstId);
        set({ list: guest, currentId: firstId, loaded: true, loadedUserId: null });
        await get().stopRealtime();
        return;
      }

      // ✅ 로그인: 게스트가 있으면 서버로 자동 이관
      const migrateResult = await migrateGuestListToServerIfAny(user.id);

      const rows = await repo.fetchRows(user.id);
      const serverList = sortByOrder(rows.map(fromRow));
      const list = mergeServerAndGuestList(serverList, migrateResult.remainingGuest);

      const prevCurrent = get().currentId;
      const persistedCurrent = readPersistedCurrentId(user.id);
      const firstId =
        prevCurrent && list.some((m) => m.id === prevCurrent)
          ? prevCurrent
          : persistedCurrent && list.some((m) => m.id === persistedCurrent)
            ? persistedCurrent
          : list[0]?.id ?? null;

      writePersistedCurrentId(user.id, firstId);
      set({ list, currentId: firstId, loaded: true, loadedUserId: user.id });
      await get().startRealtime();
    } catch (e) {
      console.error("useMyeongSikStore.loadFromServer exception:", e);
    } finally {
      set({ loading: false });
    }
  },

  migrateLocalToServer: async () => {
    try {
      // 로그인 상태면 먼저 서버로 이관하고, 실패/로그아웃 상태 대비로 guest에도 보존
      await migrateLegacyLocalListToServer(repo);
      await migrateMyowoonLocalListToServer(repo);
      migrateMyowoonLocalListToGuest();
      // ✅ 게스트→서버 이관은 loadFromServer 내부에서만 수행 (중복 방지)
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

    writePersistedCurrentId(user?.id ?? get().loadedUserId, newCurrentId);
    set({ list: filtered, currentId: newCurrentId });

    if (!user) {
      saveGuestList(filtered);
      return;
    }

    // Keep guest fallback in sync to avoid deleted rows being re-migrated on next login.
    const guestNow = loadGuestList();
    if (guestNow.length) {
      const guestFiltered = guestNow.filter((x) => x.id !== id);
      if (guestFiltered.length !== guestNow.length) {
        saveGuestList(guestFiltered);
      }
    }

    await repo.softDelete(user.id, id);
  },

  moveItemByDnD: async (args) => {
    const prevList = get().list;

    const v2 = toDnDArgs(args);
    const result = moveByDnD({
      list: prevList,
      orderedFolders: v2.orderedFolders,
      source: v2.source,
      destination: v2.destination,
    });

    const nextList = result.nextList;

    // ✅ 1) UI 반영은 무조건 즉시(동기)
    set({ list: nextList });

    // ✅ 2) 그 다음부터 느린 작업(권한/저장)
    const user = await repo.getUser();

    // 로그인 유저인데 권한 없으면 원복
    if (user && !canManageNowOrWarn()) {
      set({ list: prevList });
      return;
    }

    if (!user) {
      saveGuestList(nextList);
      return;
    }

    await get().reorder(nextList);
  },

  applyNextList: async (nextList: MyeongSik[]) => {
    const prevList = get().list;

    // ✅ UI는 즉시
    set({ list: nextList });

    const user = await repo.getUser();

    // ✅ 로그인인데 권한 없으면 원복
    if (user && !canManageNowOrWarn()) {
      set({ list: prevList });
      return;
    }

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
    writePersistedCurrentId(get().loadedUserId, null);
    set({ currentId: null, list: [], loaded: false, loadedUserId: null });
    clearGuestList();
  },
}));
