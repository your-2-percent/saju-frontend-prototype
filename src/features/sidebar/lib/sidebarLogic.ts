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
  handleDragEnd: (r: DropResult) => void; // 🔹 FOLDER DnD 전용
  createFolder: (name: string) => void;
  deleteFolder: (name: string) => void;
  UNASSIGNED_LABEL: string;
};

/**
 * ⚠️ 여기서는 "폴더 메타"만 관리한다.
 *  - 폴더 순서, 즐겨찾기, 열린 상태, 새 폴더 생성/삭제
 *
 * ❌ 아이템 순서는 따로 안 들고, 항상 useMyeongSikStore.list 순서를 그대로 쓴다.
 *    (폴더 이동은 Sidebar.tsx 에서 update(id, { folder })로만 처리)
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

  /* ---------- 폴더 열림/닫힘, 메모 열림/닫힘 ---------- */
  const [folderOpenMap, setFolderOpenMap] = useState<BoolMap>({});
  const [memoOpenMap, setMemoOpenMap] = useState<BoolMap>({});

  /* ---------- 새 폴더 이름 인풋 ---------- */
  const [newFolderName, setNewFolderName] = useState<string>("");

  // ?? ?? ?? ??? ??
  const [folderOrderFetched, setFolderOrderFetched] = useState(false);

  /* ---------- 실제 표시 폴더 목록 (FolderField와 동일 소스 사용) ---------- */
  const [orderedFolders, setOrderedFolders] = useState<string[]>(() => {
    const effective = getEffectiveFolders();      // 프리셋 숨김 + 커스텀 모두 반영된 목록
    const saved = loadFolderOrder();              // 저장된 순서
    return saved.length ? reconcileFolderOrder(effective, saved) : effective;
  });

  const selfOrderingRef = useRef(false);

  // ???? ?? ?? ??
  useEffect(() => {
    const loadFromServer = async () => {
      if (folderOrderFetched) return;
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

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
        .map((row: any) => String(row.folder_name))
        .filter(Boolean);
      const merged = serverOrder.length
        ? reconcileFolderOrder(effective, serverOrder)
        : reconcileFolderOrder(effective, loadFolderOrder());

      setOrderedFolders(merged);
      setFolderOrderFetched(true);
    };

    loadFromServer();
  }, [folderOrderFetched]);

  const saveOrderToServer = useCallback(
    async (order: string[]) => {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const rows = order.map((name, idx) => ({
        user_id: user.id,
        folder_name: name,
        sort_order: idx + 1,
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from("user_folder_order")
        .upsert(rows, { onConflict: "user_id,folder_name" });

      if (error) {
        console.error("save folder order to server error:", error);
      }
    },
    []
  );

  // FolderField / 다른 컴포넌트에서 폴더 구조가 바뀌면 동기화
    // FolderField / 다른 컴포넌트에서 폴더 구조가 바뀌면 동기화
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handler = () => {
      // ⬇ 우리가 방금 DnD로 saveFolderOrder를 호출해서 생긴 이벤트면 무시
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


  /* ---------- 기본 열림 설정 ---------- */
  useEffect(() => {
    setFolderOpenMap((prev) => {
      const next: BoolMap = { ...prev };
      for (const f of orderedFolders) {
        if (next[f] === undefined) next[f] = true;
      }
      return next;
    });
  }, [orderedFolders]);

  /* ---------- 그룹핑: ★ 아이템 순서는 list 순서를 그대로 사용 ★ ---------- */
  const { grouped, unassignedItems } = useMemo(() => {
    const g: Record<string, MyeongSik[]> = {};
    orderedFolders.forEach((f) => {
      g[f] = [];
    });

    const unassigned: MyeongSik[] = [];
    const assignedIds = new Set<string>(); // 🔹 같은 id 두 번 안 들어가게 방지

    for (const m of list) {
      if (!m.id || assignedIds.has(m.id)) continue; // 이미 들어간 id면 스킵

      const f = m.folder;
      if (f && orderedFolders.includes(f)) {
        g[f].push(m); // list 순서대로
      } else {
        unassigned.push(m);
      }

      assignedIds.add(m.id);
    }

    return { grouped: g, unassignedItems: unassigned };
  }, [list, orderedFolders]);

  /* ---------- 폴더 DnD (type === "FOLDER") ---------- */
      /* ---------- 폴더 DnD (type === "FOLDER") ---------- */
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

        // ⬇ 이 변경은 우리 쪽에서 트리거했다는 표시
        selfOrderingRef.current = true;
        saveFolderOrder(next); // 여기서 FOLDER_EVENT 발생

        return next;
      });
    },
    []
  );

  /* ---------- 새 폴더 생성 ---------- */
    const createFolder = (name: string) => {
    const n = name.trim();
    if (!n || n === UNASSIGNED_LABEL) return;

    // 전역 커스텀 폴더 추가 (localStorage + FOLDER_EVENT)
    addCustomFolder(n);

    // 현재 순서에 새 폴더를 붙이고 순서도 저장
    setOrderedFolders((prev) => {
      if (prev.includes(n)) return prev;
      const next = [...prev, n];
      saveFolderOrder(next);
      void saveOrderToServer(next);
      return next;
    });
  };


  /* ---------- 폴더 삭제 (소속 항목은 폴더 미지정으로) ---------- */
    const deleteFolder = (name: string) => {
    // 1) 이 폴더에 속한 명식들 → 폴더 미지정으로
    list.forEach((m) => {
      if (m.folder === name) {
        update(m.id, { folder: undefined });
      }
    });

    // 2) 즐겨찾기 맵에서 제거
    setFolderFavMap((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });

    // 3) 폴더 순서에서 제거 + 저장
    setOrderedFolders((prev) => {
      const next = prev.filter((f) => f !== name);
      saveFolderOrder(next);
      void saveOrderToServer(next);
      return next;
    });

    // 4) 실제 폴더 정의에서 제거
    //    - 프리셋이면 disablePresetFolder (숨김)
    //    - 커스텀이면 removeCustomFolder
    if (FOLDER_PRESETS.includes(name)) {
      disablePresetFolder(name);
    } else {
      removeCustomFolder(name);
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
