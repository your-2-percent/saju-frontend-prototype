import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import {
  addCustomFolder,
  disablePresetFolder,
  FOLDER_EVENT,
  FOLDER_PRESETS,
  getEffectiveFolders,
  loadFolderOrder,
  reconcileFolderOrder,
  removeCustomFolder,
  saveFolderOrder,
  setCustomFolders,
  UNASSIGNED_LABEL,
} from "@/features/sidebar/model/folderModel";
import {
  pinFavoriteFolders,
  type FolderFavMap,
} from "@/shared/domain/myeongsikList/ops";
import {
  deleteCustomFolderFromServer,
  deleteFolderOrderEntry,
  fetchCustomFolders,
  fetchFolderOrder,
  getUserId,
  saveCustomFolderToServer,
  saveFolderOrderToServer,
} from "@/features/sidebar/saveInterface/folderServer";
import { folderOrderKey, normalizeFolderOrder } from "@/features/sidebar/calc/folderOrder";

type UseSidebarFolderSaveArgs = {
  folderFavMap: FolderFavMap;
  setFolderFavMap: Dispatch<SetStateAction<FolderFavMap>>;
  setOrderedFolders: Dispatch<SetStateAction<string[]>>;
  unsetFolderForFolder: (folderName: string) => Promise<void> | void;
};

type SidebarFolderSave = {
  handleDragEnd: (r: DropResult) => void;
  createFolder: (name: string) => void;
  deleteFolder: (name: string) => void;
  UNASSIGNED_LABEL: string;
};

export const useSidebarFolderSave = ({
  folderFavMap,
  setFolderFavMap,
  setOrderedFolders,
  unsetFolderForFolder,
}: UseSidebarFolderSaveArgs): SidebarFolderSave => {
  const [folderOrderFetched, setFolderOrderFetched] = useState(false);
  const folderFavMapRef = useRef<FolderFavMap>(folderFavMap);
  const selfOrderingRef = useRef(false);
  const customFolderSyncDisabledRef = useRef(false);

  useEffect(() => {
    folderFavMapRef.current = folderFavMap;
  }, [folderFavMap]);

  useEffect(() => {
    const loadFromServer = async () => {
      if (folderOrderFetched) return;
      const userId = await getUserId();
      if (!userId) return;

      try {
        if (!customFolderSyncDisabledRef.current) {
          const custom = await fetchCustomFolders(userId);
          if (custom.disabled) customFolderSyncDisabledRef.current = true;
          if (custom.error) {
            console.error("load custom folders from server error:", custom.error);
          } else if (custom.data.length) {
            setCustomFolders(custom.data);
          }
        }
      } catch (e) {
        console.error("load custom folders exception:", e);
      }

      const orderResult = await fetchFolderOrder(userId);
      if (orderResult.error) {
        console.error("load folder order from server error:", orderResult.error);
        setFolderOrderFetched(true);
        return;
      }

      const effective = getEffectiveFolders();
      const serverOrder = orderResult.data;
      const merged = serverOrder.length
        ? reconcileFolderOrder(effective, serverOrder)
        : reconcileFolderOrder(effective, loadFolderOrder());

      setOrderedFolders(pinFavoriteFolders(merged, folderFavMapRef.current));

      if (serverOrder.length) {
        saveFolderOrder(serverOrder);
      }
      setFolderOrderFetched(true);
    };

    void loadFromServer();
  }, [folderOrderFetched, setOrderedFolders]);

  const saveOrderToServer = useCallback(async (order: string[]) => {
    const userId = await getUserId();
    if (!userId) return;

    const result = await saveFolderOrderToServer(userId, order);
    if (result.error) {
      console.error("save folder order to server error:", result.error);
    }
  }, []);

  const pendingOrderRef = useRef<string[] | null>(null);
  const saveOrderTimerRef = useRef<number | null>(null);
  const lastSavedOrderKeyRef = useRef<string>("");

  const queueSaveOrderToServer = useCallback(
    (order: string[], opts?: { immediate?: boolean }) => {
      const normalized = normalizeFolderOrder(order);
      const key = folderOrderKey(normalized);

      if (key && key === lastSavedOrderKeyRef.current) return;

      pendingOrderRef.current = normalized;

      const flush = async () => {
        const pending = pendingOrderRef.current;
        pendingOrderRef.current = null;
        if (!pending) return;

        const nextKey = folderOrderKey(pending);
        if (nextKey && nextKey === lastSavedOrderKeyRef.current) return;

        await saveOrderToServer(pending);
        lastSavedOrderKeyRef.current = nextKey;
      };

      if (opts?.immediate) {
        if (saveOrderTimerRef.current) {
          window.clearTimeout(saveOrderTimerRef.current);
          saveOrderTimerRef.current = null;
        }
        void flush();
        return;
      }

      if (saveOrderTimerRef.current) window.clearTimeout(saveOrderTimerRef.current);
      saveOrderTimerRef.current = window.setTimeout(() => {
        saveOrderTimerRef.current = null;
        void flush();
      }, 300);
    },
    [saveOrderToServer]
  );

  useEffect(() => {
    return () => {
      if (saveOrderTimerRef.current) {
        window.clearTimeout(saveOrderTimerRef.current);
        saveOrderTimerRef.current = null;
      }
      const pending = pendingOrderRef.current;
      pendingOrderRef.current = null;
      if (pending && pending.length) {
        void saveOrderToServer(pending);
      }
    };
  }, [saveOrderToServer]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      if (selfOrderingRef.current) {
        selfOrderingRef.current = false;
        return;
      }

      const effective = getEffectiveFolders();
      const saved = loadFolderOrder();
      const next = saved.length
        ? reconcileFolderOrder(effective, saved)
        : effective;

      setOrderedFolders(pinFavoriteFolders(next, folderFavMapRef.current));
    };

    window.addEventListener(FOLDER_EVENT, handler);
    return () => window.removeEventListener(FOLDER_EVENT, handler);
  }, [setOrderedFolders]);

  const handleDragEnd = useCallback(
    (r: DropResult) => {
      const { source, destination, type } = r;
      if (!destination) return;
      if (type !== "FOLDER") return;

      const srcIdx = source.index;
      const dstIdx = destination.index;
      if (srcIdx === dstIdx) return;

      setOrderedFolders((current) => {
        if (!current.length) return current;

        const next = [...current];
        const [moved] = next.splice(srcIdx, 1);
        next.splice(dstIdx, 0, moved);

        const pinned = pinFavoriteFolders(next, folderFavMapRef.current);

        selfOrderingRef.current = true;
        saveFolderOrder(pinned);
        queueSaveOrderToServer(pinned);

        return pinned;
      });
    },
    [queueSaveOrderToServer, setOrderedFolders]
  );

  const createFolder = useCallback(
    (name: string) => {
      const n = name.trim();
      if (!n || n === UNASSIGNED_LABEL) return;

      addCustomFolder(n);
      void (async () => {
        if (customFolderSyncDisabledRef.current) return;
        const userId = await getUserId();
        if (!userId) return;
        const result = await saveCustomFolderToServer(userId, n);
        if (result.disabled) customFolderSyncDisabledRef.current = true;
        if (result.error) {
          console.error("save custom folder error:", result.error);
        }
      })();

      setOrderedFolders((prev) => {
        if (prev.includes(n)) return prev;
        const next = [...prev, n];
        const pinned = pinFavoriteFolders(next, folderFavMapRef.current);
        saveFolderOrder(pinned);
        queueSaveOrderToServer(pinned, { immediate: true });
        return pinned;
      });
    },
    [queueSaveOrderToServer, setOrderedFolders]
  );

  const deleteFolder = useCallback(
    (name: string) => {
      void unsetFolderForFolder(name);

      setFolderFavMap((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });

      setOrderedFolders((prev) => {
        const next = prev.filter((f) => f !== name);
        saveFolderOrder(next);
        queueSaveOrderToServer(next, { immediate: true });
        void (async () => {
          const userId = await getUserId();
          if (!userId) return;
          const result = await deleteFolderOrderEntry(userId, name);
          if (result.error) {
            console.error("delete folder order entry error:", result.error);
          }
        })();
        return next;
      });

      if (FOLDER_PRESETS.includes(name)) {
        disablePresetFolder(name);
      } else {
        removeCustomFolder(name);
        void (async () => {
          if (customFolderSyncDisabledRef.current) return;
          const userId = await getUserId();
          if (!userId) return;
          const result = await deleteCustomFolderFromServer(userId, name);
          if (result.disabled) customFolderSyncDisabledRef.current = true;
          if (result.error) {
            console.error("delete custom folder error:", result.error);
          }
        })();
      }
    },
    [queueSaveOrderToServer, setFolderFavMap, setOrderedFolders, unsetFolderForFolder]
  );

  return {
    handleDragEnd,
    createFolder,
    deleteFolder,
    UNASSIGNED_LABEL,
  };
};
