// features/sidebar/lib/sidebarLogic.ts
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { DropResult } from "@hello-pangea/dnd";
import type { MyeongSik } from "@/shared/lib/storage";
import { supabase } from "@/lib/supabase";
import {
  UNASSIGNED_LABEL,
  LS_FOLDER_FAVS,
  getEffectiveFolders,
  loadFolderOrder,
  saveFolderOrder,
  reconcileFolderOrder,
  FOLDER_EVENT,
  addCustomFolder,
  removeCustomFolder,
  disablePresetFolder,
  FOLDER_PRESETS,
  setCustomFolders,
} from "@/features/sidebar/model/folderModel";

type BoolMap = Record<string, boolean>;
type FolderFavMap = Record<string, boolean>;

type UseSidebarLogicResult = {
  folderFavMap: FolderFavMap;
  setFolderFavMap: Dispatch<SetStateAction<FolderFavMap>>;
  folderOpenMap: BoolMap;
  setFolderOpenMap: Dispatch<SetStateAction<BoolMap>>;
  memoOpenMap: BoolMap;
  setMemoOpenMap: Dispatch<SetStateAction<BoolMap>>;
  newFolderName: string;
  setNewFolderName: Dispatch<SetStateAction<string>>;
  orderedFolders: string[];
  grouped: Record<string, MyeongSik[]>;
  unassignedItems: MyeongSik[];
  handleDragEnd: (r: DropResult) => void; // ?�� FOLDER DnD ?�용
  createFolder: (name: string) => void;
  deleteFolder: (name: string) => void;
  UNASSIGNED_LABEL: string;
};

/**
 * ?�️ ?�기?�는 "?�더 메�?"�?관리한??
 *  - ?�더 ?�서, 즐겨찾기, ?�린 ?�태, ???�더 ?�성/??��
 *
 * ???�이???�서???�로 ???�고, ??�� useMyeongSikStore.list ?�서�?그�?�??�다.
 *    (?�더 ?�동?� Sidebar.tsx ?�서 update(id, { folder })로만 처리)
 */
export function useSidebarLogic(
  list: MyeongSik[],
  update: (id: string, patch: Partial<MyeongSik>) => void
): UseSidebarLogicResult {
  /* ---------- 즐겨찾기 ---------- */
  const [folderFavMap, setFolderFavMap] = useState<FolderFavMap>(() => {
    if (typeof window === "undefined") return {};
    try {
      const raw = localStorage.getItem(LS_FOLDER_FAVS);
      return raw ? (JSON.parse(raw) as FolderFavMap) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(LS_FOLDER_FAVS, JSON.stringify(folderFavMap));
    } catch {
      // ignore
    }
  }, [folderFavMap]);

  /* ---------- ?�더 ?�림/?�힘, 메모 ?�림/?�힘 ---------- */
  const [folderOpenMap, setFolderOpenMap] = useState<BoolMap>({});
  const [memoOpenMap, setMemoOpenMap] = useState<BoolMap>({});

  /* ---------- ???�더 ?�름 ?�풋 ---------- */
  const [newFolderName, setNewFolderName] = useState<string>("");

  // ?? ?? ?? ??? ??
  const [folderOrderFetched, setFolderOrderFetched] = useState(false);

  /* ---------- ?�제 ?�시 ?�더 목록 (FolderField?� ?�일 ?�스 ?�용) ---------- */
  const [orderedFolders, setOrderedFolders] = useState<string[]>(() => {
    const effective = getEffectiveFolders();      // ?�리???��? + 커스?� 모두 반영??목록
    const saved = loadFolderOrder();              // ?�?�된 ?�서
    return saved.length ? reconcileFolderOrder(effective, saved) : effective;
  });

  const selfOrderingRef = useRef(false);
  const customFolderSyncDisabledRef = useRef(false); // ?�이�??�을 ??404 방�???

  // ???? ?? ?? ??
  useEffect(() => {
    const loadFromServer = async () => {
      if (folderOrderFetched) return;
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      // 커스?� ?�더 목록???�버?�서 불러?� 로컬?�토리�??� ?�기??
      try {
        if (!customFolderSyncDisabledRef.current) {
          const { data: customRows, error: customErr } = await supabase
            .from("user_custom_folders")
            .select("folder_name")
            .eq("user_id", user.id);

          if (customErr?.code === "PGRST205") {
            // ?�이�??�으�??�후 ?�도 ?�킵
            customFolderSyncDisabledRef.current = true;
          } else if (!customErr && customRows) {
            type CustomFolderRow = { folder_name: string | null };
            const names = (customRows as CustomFolderRow[])
              .map((row) => (row.folder_name ? row.folder_name.trim() : ""))
              .filter((v) => v !== "");
            setCustomFolders(names);
          } else if (customErr) {
            console.error("load custom folders from server error:", customErr);
          }
        }
      } catch (e) {
        console.error("load custom folders exception:", e);
      }

      const { data, error } = await supabase
        .from("user_folder_order")
        .select("folder_name, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true, nullsFirst: true });

      if (error) {
        console.error("load folder order from server error:", error);
        setFolderOrderFetched(true);
        return;
      }

      const effective = getEffectiveFolders();
      const serverOrder = (data ?? [])
        .map((row) => (row.folder_name ? String(row.folder_name) : ""))
        .filter((v) => v.trim() !== "");
      const merged = serverOrder.length
        ? reconcileFolderOrder(effective, serverOrder)
        : reconcileFolderOrder(effective, loadFolderOrder());

      setOrderedFolders(merged);
      // ?�버 ?�서??로컬 ?�?�해 ?�기
      if (serverOrder.length) {
        saveFolderOrder(serverOrder);
      }
      setFolderOrderFetched(true);
    };

    loadFromServer();
  }, [folderOrderFetched]);

  const saveOrderToServer = useCallback(
    async (order: string[]) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const rows = order
        .filter((name) => typeof name === "string" && name.trim() !== "")
        .map((name, idx) => ({
          user_id: user.id,
          folder_name: name.trim(),
          sort_order: idx + 1,
          updated_at: new Date().toISOString(),
        }));

      // 비어 ?�으�??�선 ??�� ??종료
      if (!rows.length) {
        await supabase.from("user_folder_order").delete().eq("user_id", user.id);
        return;
      }

      const { error } = await supabase
        .from("user_folder_order")
        .upsert(rows, { onConflict: "user_id,folder_name" });

      if (error) {
        console.error("save folder order to server error:", error);
      }
    },
    []
  );

  const saveCustomFolderToServer = useCallback(async (name: string) => {
    if (customFolderSyncDisabledRef.current) return;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;
    const { error } = await supabase
      .from("user_custom_folders")
      .upsert({
        user_id: user.id,
        folder_name: name,
        updated_at: new Date().toISOString(),
      });
    if (error) {
      if (error.code === "PGRST205") {
        customFolderSyncDisabledRef.current = true;
      } else {
        console.error("save custom folder error:", error);
      }
    }
  }, []);

  const deleteCustomFolderFromServer = useCallback(async (name: string) => {
    if (customFolderSyncDisabledRef.current) return;
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;
    const { error } = await supabase
      .from("user_custom_folders")
      .delete()
      .eq("user_id", user.id)
      .eq("folder_name", name);
    if (error) {
      if (error.code === "PGRST205") {
        customFolderSyncDisabledRef.current = true;
      } else {
        console.error("delete custom folder error:", error);
      }
    }
  }, []);

  // FolderField / ?�른 컴포?�트?�서 ?�더 구조가 바뀌면 ?�기??
    // FolderField / ?�른 컴포?�트?�서 ?�더 구조가 바뀌면 ?�기??
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      // �??�리가 방금 DnD�?saveFolderOrder�??�출?�서 ?�긴 ?�벤?�면 무시
      if (selfOrderingRef.current) {
        selfOrderingRef.current = false;
        return;
      }

      const effective = getEffectiveFolders();
      const saved = loadFolderOrder();
      const next = saved.length
        ? reconcileFolderOrder(effective, saved)
        : effective;

      setOrderedFolders(next);
    };

    window.addEventListener(FOLDER_EVENT, handler);
    return () => window.removeEventListener(FOLDER_EVENT, handler);
  }, []);


  /* ---------- 기본 ?�림 ?�정 ---------- */
  useEffect(() => {
    setFolderOpenMap((prev) => {
      const next: BoolMap = { ...prev };
      for (const f of orderedFolders) {
        if (next[f] === undefined) next[f] = true;
      }
      return next;
    });
  }, [orderedFolders]);

  /* ---------- 그룹?? ???�이???�서??list ?�서�?그�?�??�용 ??---------- */
  const { grouped, unassignedItems } = useMemo(() => {
    const g: Record<string, MyeongSik[]> = {};
    orderedFolders.forEach((f) => {
      g[f] = [];
    });

    const unassigned: MyeongSik[] = [];
    const assignedIds = new Set<string>(); // ?�� 같�? id ??�????�어가�?방�?

    for (const m of list) {
      if (!m.id || assignedIds.has(m.id)) continue; // ?��? ?�어�?id�??�킵

      const f = m.folder;
      if (f && orderedFolders.includes(f)) {
        g[f].push(m); // list ?�서?��?
      } else {
        unassigned.push(m);
      }

      assignedIds.add(m.id);
    }

    return { grouped: g, unassignedItems: unassigned };
  }, [list, orderedFolders]);

  /* ---------- ?�더 DnD (type === "FOLDER") ---------- */
      /* ---------- ?�더 DnD (type === "FOLDER") ---------- */
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

        // �???변경�? ?�리 쪽에???�리거했?�는 ?�시
        selfOrderingRef.current = true;
        saveFolderOrder(next);
        void saveOrderToServer(next); // ?�기??FOLDER_EVENT 발생

        return next;
      });
    },
    [saveOrderToServer]
  );

  /* ---------- ???�더 ?�성 ---------- */
  const createFolder = (name: string) => {
    const n = name.trim();
    if (!n || n === UNASSIGNED_LABEL) return;

    // ?�역 커스?� ?�더 추�? (localStorage + FOLDER_EVENT)
    addCustomFolder(n);
    void saveCustomFolderToServer(n);

    // ?�재 ?�서?????�더�?붙이�??�서???�??
    setOrderedFolders((prev) => {
      if (prev.includes(n)) return prev;
      const next = [...prev, n];
      saveFolderOrder(next);
      void saveOrderToServer(next);
      void saveOrderToServer(next);
      return next;
    });
  };


  /* ---------- ?�더 ??�� (?�속 ??��?� ?�더 미�??�으�? ---------- */
  const deleteFolder = (name: string) => {
    // 1) ???�더???�한 명식?????�더 미�??�으�?
    list.forEach((m) => {
      if (m.folder === name) {
        update(m.id, { folder: undefined });
      }
    });

    // 2) 즐겨찾기 맵에???�거
    setFolderFavMap((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });

    // 3) ?�더 ?�서?�서 ?�거 + ?�??    
    setOrderedFolders((prev) => {
      const next = prev.filter((f) => f !== name);
      saveFolderOrder(next);
      void saveOrderToServer(next);
      void saveOrderToServer(next);
      // ?�버???��? ?�더 ?�렬 ?�도 ??��
      void (async () => {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) return;
        await supabase
          .from("user_folder_order")
          .delete()
          .eq("user_id", user.id)
          .eq("folder_name", name);
      })();
      return next;
    });

    // 4) ?�제 ?�더 ?�의?�서 ?�거
    //    - ?�리?�이�?disablePresetFolder (?��?)
    //    - 커스?�?�면 removeCustomFolder
    if (FOLDER_PRESETS.includes(name)) {
      disablePresetFolder(name);
    } else {
      removeCustomFolder(name);
      void deleteCustomFolderFromServer(name);
    }
  };

  return {
    folderFavMap,
    setFolderFavMap,
    folderOpenMap,
    setFolderOpenMap,
    memoOpenMap,
    setMemoOpenMap,
    newFolderName,
    setNewFolderName,
    orderedFolders,
    grouped,
    unassignedItems,
    handleDragEnd,
    createFolder,
    deleteFolder,
    UNASSIGNED_LABEL,
  };
}

