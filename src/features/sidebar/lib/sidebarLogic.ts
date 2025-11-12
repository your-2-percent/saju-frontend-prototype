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

const LIST_PREFIX = "list:";
const DROPPABLE_UNASSIGNED = "list:__unassigned__";
const LS_ORDERMAP = "sidebar.orderMap.v1";

type OrderMap = Record<string, string[]>;

function toListId(folder?: string): string {
  return folder ? `${LIST_PREFIX}${folder}` : DROPPABLE_UNASSIGNED;
}
function decodeListId(id: string): string | undefined {
  if (!id.startsWith(LIST_PREFIX)) return undefined;
  const key = id.slice(LIST_PREFIX.length);
  return key === "__unassigned__" ? undefined : key;
}

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
      onCancel,
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

  // 즐겨/비즐겨 + (리버스 저장 감지 시 자동 복구)
  const orderedFolders = useMemo(() => {
    const base = folderOrder.slice();
    // 간단 리버스 휴리스틱: 첫/끝이 프리셋 배열과 거꾸로 맞물리면 리버스 추정
    const looksReversed =
      base.length >= 2 &&
      allFoldersBase.length >= 2 &&
      base[0] === allFoldersBase[allFoldersBase.length - 1] &&
      base[base.length - 1] === allFoldersBase[0];

    const effective = looksReversed ? base.reverse() : base;
    const favs = effective.filter((f) => !!folderFavMap[f]);
    const nonFavs = effective.filter((f) => !folderFavMap[f]);
    return [...favs, ...nonFavs];
  }, [folderOrder, folderFavMap, allFoldersBase]);

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
    const legacy = list.filter((m) => m.folder === "미분류");
    legacy.forEach((m) => update(m.id, { folder: undefined }));
    const registry = new Set(allFoldersBase);
    const invalid = list.filter((m) => m.folder && !registry.has(m.folder));
    invalid.forEach((m) => update(m.id, { folder: undefined }));
  }, [list, allFoldersBase, update]);

  // ===== orderMap 최신 스냅샷 문자열 (렌더 시점에 읽음)
  const orderMapRaw =
    typeof window === "undefined" ? "" : localStorage.getItem(LS_ORDERMAP) ?? "";

  // 파싱된 orderMap (문자열이 바뀌면 재계산)
  const orderMap: OrderMap = useMemo(() => {
    try {
      return orderMapRaw ? (JSON.parse(orderMapRaw) as OrderMap) : {};
    } catch {
      console.log("[Sidebar] Failed to parse orderMap from localStorage.");
      return {};
    }
  }, [orderMapRaw]);

  // ===== 그룹/바깥 리스트 (orderMap 적용)
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
          byId.delete(id);
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
        const to = Math.min(
          nonFavs.length - 1,
          destination.index - favs.length
        );
        setFolderOrder([...favs, ...arrayMove(nonFavs, from, to)]);
      }
      return;
    }

    // 아이템 이동(폴더 안/바깥/폴더 간)
    if (type === "ITEM") {
      const itemId = draggableId.replace(/^item:/, "");
      const srcDroppable = source?.droppableId ?? "";
      const dstDroppable = destination?.droppableId ?? "";

      const srcFolder = decodeListId(srcDroppable);
      const dstFolder = decodeListId(dstDroppable);
      if (srcFolder === dstFolder) return; // 같은 리스트 내 재정렬은 상위에서 관리

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
    setFolderOrder((prev) => prev.filter((n) => n !== name));
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
