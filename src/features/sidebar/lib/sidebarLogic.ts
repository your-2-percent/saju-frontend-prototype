// components/sidebarLogic.ts
import { useEffect, useMemo, useRef } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { confirmToast } from "@/shared/ui/feedback/ConfirmToast";
import { type DropResult } from "@hello-pangea/dnd";
import {
  UNASSIGNED_LABEL,
  FOLDER_PRESETS,
  LS_FOLDERS,
  LS_FOLDER_ORDER,
  LS_FOLDER_FAVS,
  LS_DISABLED_PRESETS,
  displayFolderLabel,
} from "@/features/sidebar/model/folderModel";
import { useLocalStorageState } from "@/shared/lib/hooks/useLocalStorageState";

function arrayMove<T>(arr: T[], from: number, to: number) {
  const a = arr.slice();
  const [m] = a.splice(from, 1);
  a.splice(to, 0, m);
  return a;
}

const DROPPABLE_UNASSIGNED = "list:__unassigned__";
const LIST_PREFIX = "list:";

export function useSidebarLogic(
  list: MyeongSik[],
  update: (id: string, patch: Partial<MyeongSik>) => void
) {
  // ===== 로컬스토리지 상태들
  const [customFolders, setCustomFolders] =
    useLocalStorageState<string[]>(LS_FOLDERS, []);
  const [folderFavMap, setFolderFavMap] =
    useLocalStorageState<Record<string, boolean>>(LS_FOLDER_FAVS, {});
  const [folderOrder, setFolderOrder] =
    useLocalStorageState<string[]>(LS_FOLDER_ORDER, []);
  const [disabledPresets, setDisabledPresets] =
    useLocalStorageState<string[]>(LS_DISABLED_PRESETS, []);

  // 임시 UI 상태
  const [folderOpenMap, setFolderOpenMap] =
    useLocalStorageState<Record<string, boolean>>("ms_folder_open", {});
  const [memoOpenMap, setMemoOpenMap] =
    useLocalStorageState<Record<string, boolean>>("ms_memo_open", {});
  const [newFolderName, setNewFolderName] =
    useLocalStorageState<string>("ms_new_folder_tmp", "");

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
    onCancel,  // 👈 추가
    duration: Number.POSITIVE_INFINITY,
  });
}

  // ===== 폴더 레지스트리(등록된 폴더만): 파생 제거, 숨김 제외
  const presetsEffective = useMemo(
    () => FOLDER_PRESETS.filter((f) => !disabledPresets.includes(f)),
    [disabledPresets]
  );

  // 폴더 목록(UNASSIGNED 제외)
  const allFoldersBase = useMemo(
    () => [...presetsEffective, ...customFolders],
    [presetsEffective, customFolders]
  );

  // ===== 폴더 순서 정합성 유지
  useEffect(() => {
    setFolderOrder((prev) => {
      const next = prev.filter((f) => allFoldersBase.includes(f));
      for (const f of allFoldersBase) if (!next.includes(f)) next.push(f);
      return next;
    });
  }, [allFoldersBase, setFolderOrder]);

  // 즐겨/비즐겨
  const orderedFolders = useMemo(() => {
    const favs = folderOrder.filter((f) => !!folderFavMap[f]);
    const nonFavs = folderOrder.filter((f) => !folderFavMap[f]);
    return [...favs, ...nonFavs];
  }, [folderOrder, folderFavMap]);

  // 기본 열림
  useEffect(() => {
    setFolderOpenMap((prev) => {
      const next = { ...prev };
      for (const f of orderedFolders) if (next[f] === undefined) next[f] = true;
      return next;
    });
  }, [orderedFolders, setFolderOpenMap]);

  // ===== 레거시/유령 폴더 정리
  useEffect(() => {
    // "미분류" 문자열 저장 → undefined
    const legacy = list.filter((m) => m.folder === "미분류");
    legacy.forEach((m) => update(m.id, { folder: undefined }));
    // 등록되지 않은 폴더는 undefined로
    const registry = new Set(allFoldersBase);
    const invalid = list.filter((m) => m.folder && !registry.has(m.folder));
    invalid.forEach((m) => update(m.id, { folder: undefined }));
  }, [list, allFoldersBase, update]);

  // ===== 그룹/바깥 리스트
  const { grouped, unassignedItems } = useMemo(() => {
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

    const byFav = (a: MyeongSik, b: MyeongSik) =>
      Number(!!b.favorite) - Number(!!a.favorite);

    for (const k of Object.keys(g)) g[k] = g[k].slice().sort(byFav);
    outside.sort(byFav);

    return { grouped: g, unassignedItems: outside };
  }, [list, orderedFolders]);

  // ===== 드래그
  function handleDragEnd(result: DropResult) {
    const { destination, draggableId, type, source } = result;
    if (!destination) return;

    // 폴더 재정렬
    if (type === "FOLDER") {
      const name = draggableId.replace(/^folder-/, "");
      const favs = folderOrder.filter((f) => !!folderFavMap[f]);
      const nonFavs = folderOrder.filter((f) => !folderFavMap[f]);
      const isFav = !!folderFavMap[name];

      if (isFav) {
        const from = favs.indexOf(name);
        const to = Math.min(favs.length - 1, destination.index);
        setFolderOrder([...arrayMove(favs, from, to), ...nonFavs]);
      } else {
        const from = nonFavs.indexOf(name);
        const to = Math.min(nonFavs.length - 1, destination.index - favs.length);
        setFolderOrder([...favs, ...arrayMove(nonFavs, from, to)]);
      }
      return;
    }

    // 아이템 이동(폴더 안/바깥/폴더 간)
    if (type === "ITEM") {
      const itemId = draggableId.replace(/^item:/, "");
      const srcDroppable = source?.droppableId ?? "";
      const dstDroppable = destination?.droppableId ?? "";

      const decode = (id: string): string | undefined => {
        if (!id.startsWith(LIST_PREFIX)) return undefined;
        const key = id.slice(LIST_PREFIX.length);
        return key === "__unassigned__" ? undefined : key;
      };

      const srcFolder = decode(srcDroppable);
      const dstFolder = decode(dstDroppable);

      // 같은 리스트 내 재정렬은 현재 별도 저장 안 함 (order 필드가 없어서)
      if (srcFolder === dstFolder) return;

      const item = list.find((x) => x.id === itemId);
      if (!item) return;

      update(item.id, { folder: dstFolder });
      return;
    }
  }

  // ===== 폴더 생성/삭제
  function createFolder(name: string) {
    const base = name.trim();
    if (!base) return;
    const exists = new Set([...orderedFolders, ...customFolders]);
    let unique = base;
    let i = 2;
    while (exists.has(unique)) unique = `${base} ${i++}`;
    setCustomFolders((prev) => [...prev, unique]);
    setFolderOpenMap((s) => ({ ...s, [unique]: true }));
    setNewFolderName("");
  }

  function deleteFolder(name: string) {
    // 1) 해당 폴더의 항목들 → 바깥(=undefined)
    const needMove = list.filter((it) => it.folder === name);
    needMove.forEach((it) => update(it.id, { folder: undefined }));

    // 2) 프리셋이면 숨김, 커스텀은 제거
    if (FOLDER_PRESETS.includes(name)) {
      setDisabledPresets((prev) => Array.from(new Set([...prev, name])));
    } else {
      setCustomFolders((prev) => prev.filter((n) => n !== name));
    }

    // 3) 상태 정리
    setFolderOpenMap((s) => { const n = { ...s }; delete n[name]; return n; });
    setFolderFavMap((s) => { const n = { ...s }; delete n[name]; return n; });
    setFolderOrder((prev) => prev.filter((n) => n !== name));
  }

  return {
    // states
    folderFavMap, setFolderFavMap,
    folderOpenMap, setFolderOpenMap,
    memoOpenMap, setMemoOpenMap,
    newFolderName, setNewFolderName,
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
