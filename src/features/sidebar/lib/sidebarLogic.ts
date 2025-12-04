// features/sidebar/lib/sidebarLogic.ts
import { useEffect, useMemo, useRef, useState } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { confirmToast } from "@/shared/ui/feedback/ConfirmToast";
import type { DropResult } from "@hello-pangea/dnd";
import {
  UNASSIGNED_LABEL,
  FOLDER_PRESETS,
  LS_FOLDER_FAVS,
  LS_DISABLED_PRESETS,
  displayFolderLabel,
  FOLDER_EVENT,
  getCustomFolders,
  getEffectiveFolders,
  addCustomFolder,
  removeCustomFolder,
  loadFolderOrder,
  saveFolderOrder,
  reconcileFolderOrder,
} from "@/features/sidebar/model/folderModel";
import { useLocalStorageState } from "@/shared/lib/hooks/useLocalStorageState";

function arrayMove<T>(arr: T[], from: number, to: number) {
  const a = arr.slice();
  const [m] = a.splice(from, 1);
  a.splice(to, 0, m);
  return a;
}

function equalStringArray(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

const LIST_PREFIX = "list:";
const DROPPABLE_UNASSIGNED = "list:__unassigned__";
// 아이템 순서 전용 키 (폴더 순서랑 별개)
const LS_ORDERMAP = "sidebar.orderMap.v1";

type OrderMap = Record<string, string[]>;

function toListId(folder?: string): string {
  return folder ? `${LIST_PREFIX}${folder}` : DROPPABLE_UNASSIGNED;
}

export function useSidebarLogic(
  list: MyeongSik[],
  update: (id: string, patch: Partial<MyeongSik>) => void
) {
  // ===== 폴더 관련 로컬 상태들 =====
  const [folderFavMap, setFolderFavMap] =
    useLocalStorageState<Record<string, boolean>>(LS_FOLDER_FAVS, {});
  const [disabledPresets, setDisabledPresets] =
    useLocalStorageState<string[]>(LS_DISABLED_PRESETS, []);

  // UI 상태
  const [folderOpenMap, setFolderOpenMap] =
    useLocalStorageState<Record<string, boolean>>("ms_folder_open", {});
  const [memoOpenMap, setMemoOpenMap] =
    useLocalStorageState<Record<string, boolean>>("ms_memo_open", {});
  const [newFolderName, setNewFolderName] =
    useLocalStorageState<string>("ms_new_folder_tmp", "");

  // 커스텀 폴더 목록 (localStorage → 동기화)
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  // 폴더 순서(UNASSIGNED 제외, localStorage → 동기화)
  const [folderOrder, setFolderOrder] = useState<string[]>([]);

  // Confirm 쓰로틀
  const lastConfirmAtRef = useRef(0);
  function confirmThrottled(
    message: string,
    onOk: () => void,
    onCancel?: () => void
  ) {
    const now = Date.now();
    if (now - lastConfirmAtRef.current < 450) return;
    lastConfirmAtRef.current = now;
    confirmToast(message, {
      onConfirm: onOk,
      onCancel,
      duration: Number.POSITIVE_INFINITY,
    });
  }

  // 숨김 프리셋 제외
  const presetsEffective = useMemo(
    () => FOLDER_PRESETS.filter((f) => !disabledPresets.includes(f)),
    [disabledPresets]
  );

  // 🔹 localStorage 기반으로 커스텀폴더 + 폴더순서 동기화
  useEffect(() => {
    if (typeof window === "undefined") return;

    const sync = () => {
      // 1) 커스텀 폴더
      const custom = getCustomFolders();
      setCustomFolders(custom);

      // 2) 실제 존재하는 폴더들(프리셋-숨김 제외 + 커스텀)
      const effective = getEffectiveFolders();

      // 3) 저장된 순서와 reconcile
      const saved = loadFolderOrder();
      const next = reconcileFolderOrder(effective, saved);

      setFolderOrder(next);
      if (!equalStringArray(saved, next)) {
        saveFolderOrder(next);
      }
    };

    sync(); // 최초 1회

    window.addEventListener(FOLDER_EVENT, sync);
    return () => window.removeEventListener(FOLDER_EVENT, sync);
  }, [presetsEffective]);

  // 전체 폴더 레지스트리 (중복 제거)
  const allFoldersBase = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const name of [...presetsEffective, ...customFolders]) {
      if (!seen.has(name)) {
        seen.add(name);
        out.push(name);
      }
    }
    return out;
  }, [presetsEffective, customFolders]);

  // 🔹 즐겨찾기 반영된 최종 폴더 순서
  const orderedFolders = useMemo(() => {
    const base = folderOrder.length ? folderOrder : allFoldersBase;
    const favs = base.filter((f) => !!folderFavMap[f]);
    const nonFavs = base.filter((f) => !folderFavMap[f]);
    return [...favs, ...nonFavs];
  }, [folderOrder, folderFavMap, allFoldersBase]);

  // 기본 열림
  useEffect(() => {
    setFolderOpenMap((prev) => {
      const next = { ...prev };
      for (const f of orderedFolders) {
        if (next[f] === undefined) next[f] = true;
      }
      return next;
    });
  }, [orderedFolders, setFolderOpenMap]);

  // 레거시/유령 폴더 정리
  useEffect(() => {
    const registry = new Set(allFoldersBase);
    list.forEach((m) => {
      if (m.folder === "미분류") {
        update(m.id, { folder: undefined });
      } else if (m.folder && !registry.has(m.folder)) {
        update(m.id, { folder: undefined });
      }
    });
  }, [list, allFoldersBase, update]);

  // ===== 아이템 orderMap (폴더 순서랑 별개) =====
  const orderMapRaw =
    typeof window === "undefined"
      ? ""
      : window.localStorage.getItem(LS_ORDERMAP) ?? "";

  const orderMap: OrderMap = useMemo(() => {
    try {
      return orderMapRaw ? (JSON.parse(orderMapRaw) as OrderMap) : {};
    } catch {
      console.log("[Sidebar] Failed to parse orderMap from localStorage.");
      return {};
    }
  }, [orderMapRaw]);

  // ===== 그룹/바깥 리스트 (orderMap + 즐겨찾기 반영) =====
  const { grouped, unassignedItems } = useMemo(() => {
    // 원본 분류
    const g: Record<string, MyeongSik[]> = {};
    for (const f of orderedFolders) g[f] = [];
    const outside: MyeongSik[] = [];

    for (const it of list) {
      const f = it.folder;
      if (!f) {
        outside.push(it);
      } else if (g[f]) {
        g[f].push(it);
      } else {
        outside.push(it);
      }
    }

    // 지역 함수: orderMap 순서 → 즐겨찾기 우선
    const applyOrder = (arr: MyeongSik[], listId: string): MyeongSik[] => {
      const ord = orderMap[listId] ?? [];
      const byId = new Map(arr.map((it) => [it.id, it]));
      const seq: MyeongSik[] = [];

      // 1) orderMap 순서대로
      for (const id of ord) {
        const it = byId.get(id);
        if (it) {
          seq.push(it);
          byId.delete(id); // 🔧 여기 꼭 id로 삭제해야 함
        }
      }

      // 2) orderMap에 없던 새 항목은 뒤에
      for (const it of byId.values()) seq.push(it);

      // 3) 즐겨찾기 우선(상대 순서 보존)
      const favs = seq.filter((x) => !!x.favorite);
      const rest = seq.filter((x) => !x.favorite);
      return [...favs, ...rest];
    };

    const outsideOrdered = applyOrder(outside, DROPPABLE_UNASSIGNED);
    const outGrouped: Record<string, MyeongSik[]> = {};
    for (const f of orderedFolders) {
      outGrouped[f] = applyOrder(g[f], toListId(f));
    }

    return { grouped: outGrouped, unassignedItems: outsideOrdered };
  }, [list, orderedFolders, orderMap]);

  // ===== 폴더 드래그 (ITEM은 Sidebar.tsx에서 처리) =====
  function handleDragEnd(result: DropResult) {
    const { destination, draggableId, type, source } = result;
    if (!destination) return;
    if (type !== "FOLDER") return;
    if (destination.index === source.index) return;

    const name = draggableId.replace(/^folder-/, "");
    const base = folderOrder.length ? folderOrder : allFoldersBase;

    const favs = base.filter((f) => !!folderFavMap[f]);
    const nonFavs = base.filter((f) => !folderFavMap[f]);
    const isFav = !!folderFavMap[name];

    let merged: string[] = base;

    if (isFav) {
      const from = favs.indexOf(name);
      if (from === -1) return;
      const to = Math.min(favs.length - 1, destination.index);
      const nextFavs = arrayMove(favs, from, to);
      merged = [...nextFavs, ...nonFavs];
    } else {
      const from = nonFavs.indexOf(name);
      if (from === -1) return;
      const to = Math.min(
        nonFavs.length - 1,
        destination.index - favs.length
      );
      const nextNonFavs = arrayMove(nonFavs, from, to);
      merged = [...favs, ...nextNonFavs];
    }

    setFolderOrder(merged);
    saveFolderOrder(merged); // 🔹 localStorage + 이벤트
  }

  // ===== 폴더 생성 =====
  function createFolder(name: string) {
    const base = name.trim();
    if (!base) return;

    const exists = new Set([...allFoldersBase, ...customFolders]);
    let unique = base;
    let i = 2;
    while (exists.has(unique)) unique = `${base} ${i++}`;

    // localStorage 갱신 + 이벤트
    addCustomFolder(unique);

    // UI 열림 상태
    setFolderOpenMap((s) => ({ ...s, [unique]: true }));
    setNewFolderName("");
  }

  // ===== 폴더 삭제 =====
  function deleteFolder(name: string) {
    // 1) 해당 폴더의 항목들 → 바깥(=undefined)
    const needMove = list.filter((it) => it.folder === name);
    needMove.forEach((it) => update(it.id, { folder: undefined }));

    // 2) 프리셋이면 숨김, 커스텀은 제거
    if (FOLDER_PRESETS.includes(name)) {
      setDisabledPresets((prev) => {
        if (prev.includes(name)) return prev;
        const next = [...prev, name];
        // useLocalStorageState가 알아서 저장함
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event(FOLDER_EVENT));
        }
        return next;
      });
    } else {
      removeCustomFolder(name); // localStorage + 이벤트
    }

    // 3) UI 상태 정리
    setFolderOpenMap((s) => {
      const n = { ...s };
      delete n[name];
      return n;
    });
    setFolderFavMap((s) => {
      const n = { ...s };
      delete n[name];
      return n;
    });
  }

  return {
    // states
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

    // actions
    confirmThrottled,
    handleDragEnd,
    createFolder,
    deleteFolder,

    // helpers
    displayFolderLabel,
    UNASSIGNED_LABEL,
    DROPPABLE_UNASSIGNED,
  };
}
