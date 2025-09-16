// components/Sidebar.tsx
import { X, Plus, ChevronDown, ChevronUp, Star, GripVertical } from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import type { MyeongSik } from "@/shared/lib/storage";
import { useSidebarLogic } from "@/features/sidebar/lib/sidebarLogic";
import {
  fmtBirthKR,
  formatPlaceDisplay,
  calcAgeFromBirthDay,
  getGanjiString,
} from "@/features/sidebar/lib/sidebarUtils";
import { normalizeFolderValue } from "@/features/sidebar/model/folderModel";
import { useLocalStorageState } from "@/shared/lib/hooks/useLocalStorageState";
import type { DayBoundaryRule } from "@/shared/type";
import { recalcGanjiSnapshot } from "@/shared/domain/간지/recalcGanjiSnapshot";
import { formatLocalHM } from "@/shared/utils";
import { isDST } from "@/shared/lib/core/timeCorrection";
import type { CSSProperties } from "react";

type MemoOpenMap = Record<string, boolean>;
type OrderMap = Record<string, string[]>; // droppableId -> itemId[]

/** ITEM 드롭영역 id 규칙 */
const DROPPABLE_UNASSIGNED = "list:__unassigned__";
const listDroppableId = (folderName: string) => `list:${folderName}`;
const decodeListIdToFolder = (droppableId: string): string | undefined => {
  if (!droppableId.startsWith("list:")) return undefined;
  const key = droppableId.slice(5);
  return key === "__unassigned__" ? undefined : key;
};

/** 드래그 중인 노드를 body로 포털 */
function useDragPortal() {
  const portalEl = useMemo(() => {
    const el = document.createElement("div");
    el.style.position = "fixed";
    el.style.top = "0";
    el.style.left = "0";
    el.style.width = "100%";
    el.style.height = "100%";
    el.style.zIndex = "9999";
    el.style.pointerEvents = "none";
    return el;
  }, []);

  useEffect(() => {
    document.body.appendChild(portalEl);
    return () => {
      try {
        document.body.removeChild(portalEl);
      } catch {
        // noop
      }
    };
  }, [portalEl]);

  return (node: ReactNode, isDragging: boolean) =>
    isDragging ? createPortal(node, portalEl) : node;
}

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onView: (m: MyeongSik) => void;
  onAddNew: () => void;
  onEdit: (m: MyeongSik) => void;
};

export default function Sidebar({
  open,
  onClose,
  onView,
  onAddNew,
  onEdit,
}: SidebarProps) {
  const { list, remove, update } = useMyeongSikStore();

  const {
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
    confirmThrottled,
    handleDragEnd: handleFolderDragEnd, // 폴더 재정렬용
    createFolder,
    deleteFolder,
    UNASSIGNED_LABEL,
    displayFolderLabel,
  } = useSidebarLogic(list, update);

  // 리스트별 아이템 순서(로컬 전용)
  const [orderMap, setOrderMap] = useLocalStorageState<OrderMap>("ms_order_map", {});
  const [folderOrder, setFolderOrder] = useLocalStorageState<string[]>("folder_order", []);

  // 전역 드래그 상태 (모바일 최적화용)
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  // 포털
  const portalize = useDragPortal();

  /** 현재 렌더기준 배열을 orderMap 순서로 정렬 */
  const orderItems = (droppableId: string, arr: MyeongSik[]) => {
    const byId = new Map(arr.map((it) => [it.id, it]));
    const order = orderMap[droppableId] ?? [];
    const out: MyeongSik[] = [];
    for (const id of order) {
      const it = byId.get(id);
      if (it) {
        out.push(it);
        byId.delete(id);
      }
    }
    byId.forEach((it) => out.push(it));
    return out;
  };

  // 드롭다운 옵션: 바깥 선택 포함
  const folderOptions = [UNASSIGNED_LABEL, ...orderedFolders];

  /** orderMap 초기화 (누락 id 보강) */
  useEffect(() => {
    setOrderMap((prev) => {
      let changed = false;
      const next: OrderMap = { ...prev };

      // 바깥(미지정)
      const outId = DROPPABLE_UNASSIGNED;
      if (!next[outId]) {
        next[outId] = unassignedItems.map((it) => it.id);
        changed = true;
      } else {
        const missing = unassignedItems.map((it) => it.id).filter((id) => !next[outId].includes(id));
        if (missing.length) {
          next[outId] = [...next[outId], ...missing];
          changed = true;
        }
      }

      // 각 폴더
      for (const folderName of orderedFolders) {
        const listId = listDroppableId(folderName);
        const arr = grouped[folderName] || [];
        if (!next[listId]) {
          next[listId] = arr.map((it) => it.id);
          changed = true;
        } else {
          const missing = arr.map((it) => it.id).filter((id) => !next[listId].includes(id));
          if (missing.length) {
            next[listId] = [...next[listId], ...missing];
            changed = true;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [unassignedItems, grouped, orderedFolders, setOrderMap]);

  // 화면에 “현재 보이는 순서”의 id 배열을 만든다 (인덱스 일치 보장용)
  const getDisplayOrder = (droppableId: string): string[] => {
    const folder = decodeListIdToFolder(droppableId);
    const baseArr = folder ? (grouped[folder] || []) : unassignedItems;
    return orderItems(droppableId, baseArr).map((it) => it.id);
  };

  // 드래그 아이템 스타일: 드롭 애니메이션 약간 더 짧게
  const getDragStyle = (base: CSSProperties | undefined, isDropAnimating: boolean): CSSProperties => {
    if (!base) return {};
    return isDropAnimating
      ? { ...base, transition: "transform 160ms cubic-bezier(0.2, 0, 0.2, 1)" }
      : base;
  };

  // 카드(아이템) Draggable (포털 적용) — 전용 핸들 사용
  const renderCard = (m: MyeongSik, index: number) => {
    const memoOpen = !!memoOpenMap[m.id];
    const ganji = getGanjiString(m);
    const placeDisplay = formatPlaceDisplay(m.birthPlace?.name);
    const keyId = `item:${m.id}`;

    let correctedDate = new Date(m.corrected);

    const useDST = isDST(
      correctedDate.getFullYear(),
      correctedDate.getMonth() + 1, // JS는 0~11월 → +1 필요
      correctedDate.getDate()
    );

    if (useDST) {
      correctedDate = new Date(correctedDate.getTime() - 60 * 60 * 1000);
    }

    return (
      <Draggable draggableId={keyId} index={index} key={keyId}>
        {(drag, snapshot) =>
          portalize(
            <li
              ref={drag.innerRef}
              {...drag.draggableProps}
              // 핸들 분리: dragHandleProps 는 아래 Grip 버튼에만 붙임
              style={getDragStyle(drag.draggableProps.style, snapshot.isDropAnimating)}
              className="list-none select-none rounded-xl border
                         bg-white dark:bg-neutral-900
                         border-neutral-200 dark:border-neutral-800
                         text-neutral-900 dark:text-neutral-100"
            >
              <div className="p-3">
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-sm desk:text-base">
                    {m.name} ({calcAgeFromBirthDay(m.birthDay)}세, {m.gender})
                  </div>
                  <span className="opacity-40">｜</span>
                  <div className="text-sm text-neutral-600 dark:text-neutral-300">
                    {m.relationship ? m.relationship : "관계 미지정"}
                  </div>
                  {/* 전용 드래그 핸들 (모바일 스크롤 충돌 방지) */}
                  <button
                    aria-label="드래그"
                    {...drag.dragHandleProps}
                    className="ml-auto p-1.5 rounded cursor-grab active:cursor-grabbing hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    style={{ touchAction: "none" }}
                  >
                    <GripVertical size={16} />
                  </button>
                </div>

                <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                  {fmtBirthKR(m.birthDay, m.birthTime)}, {m.calendarType === "lunar" ? "음력" : "양력"}
                </div>

                {(placeDisplay || correctedDate) && (
                  <div className="text-sm text-neutral-500 dark:text-neutral-400">
                    {placeDisplay}
                    {correctedDate && (
                      <span className="opacity-70"> · 보정시 {formatLocalHM(correctedDate)}</span>
                    )}
                  </div>
                )}

                {ganji && (
                  <div className="text-sm text-neutral-800 dark:text-neutral-200 mt-1 whitespace-pre-wrap break-keep">
                    {ganji}
                  </div>
                )}

                {m.memo && m.memo.trim() !== "" && (
                  <div>
                    <button
                      type="button"
                      className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 inline-flex items-center gap-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        setMemoOpenMap((s: MemoOpenMap) => ({
                          ...s,
                          [m.id]: !s[m.id],
                        }));
                      }}
                    >
                      {memoOpen ? "메모 닫기" : "메모 열기"}
                    </button>
                    <div
                      className={memoOpen ? "mt-1 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap" : "hidden"}
                    >
                      {m.memo}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 mt-3">
                  {/* 폴더 선택 */}
                  <select
                    className="h-30 text-xs rounded px-2 py-1 cursor-pointer
                               bg-white dark:bg-neutral-900
                               border border-neutral-300 dark:border-neutral-700
                               text-neutral-900 dark:text-neutral-100
                               focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    value={displayFolderLabel(m.folder)}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const normalized = normalizeFolderValue(raw);
                      const itemId = m.id;

                      const srcListId = m.folder ? listDroppableId(m.folder) : DROPPABLE_UNASSIGNED;
                      const dstListId = normalized ? listDroppableId(normalized) : DROPPABLE_UNASSIGNED;

                      if (normalized && !orderedFolders.includes(normalized)) {
                        createFolder(normalized);
                      }

                      // orderMap 갱신 (항상 화면 기준 배열로)
                      setOrderMap((prev) => {
                        const next: OrderMap = { ...prev };
                        const src = getDisplayOrder(srcListId);
                        const dst = srcListId === dstListId ? src.slice() : getDisplayOrder(dstListId).slice();

                        // src에서 제거
                        const si = src.indexOf(itemId);
                        if (si >= 0) src.splice(si, 1);

                        // dst 맨앞으로
                        const di = dst.indexOf(itemId);
                        if (di >= 0) dst.splice(di, 1);
                        dst.unshift(itemId);

                        next[srcListId] = src;
                        next[dstListId] = dst;
                        return next;
                      });

                      // 실제 데이터 이동
                      update(itemId, { folder: normalized });
                    }}
                  >
                    {folderOptions.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>

                  {/* 명식 기준 선택 */}
                  <select
                    className="h-30 text-xs rounded px-2 py-1 cursor-pointer
                               bg-white dark:bg-neutral-900
                               border border-neutral-300 dark:border-neutral-700
                               text-neutral-900 dark:text-neutral-100
                               focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                    value={m.mingSikType ?? "야자시"}
                    onChange={(e) => {
                      const nextRule = e.target.value as DayBoundaryRule;

                      const updated = { ...m, mingSikType: nextRule };
                      const snapshot = recalcGanjiSnapshot(updated);

                      update(m.id, { mingSikType: nextRule, ...snapshot });
                      onView({ ...updated, ...snapshot });
                      onClose();
                    }}
                  >
                    <option value="야자시">야자시명식</option>
                    <option value="조자시">조자시명식</option>
                    <option value="인시">인시명식</option>
                  </select>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(m);
                      onClose();
                    }}
                    className="px-3 py-1 rounded text-white text-sm cursor-pointer
                               bg-indigo-600 hover:bg-indigo-500"
                  >
                    보기
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(m);
                    }}
                    className="px-3 py-1 rounded text-white text-sm cursor-pointer
                               bg-amber-600 hover:bg-amber-500"
                  >
                    수정
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmThrottled(`'${m.name}' 명식을 삭제할까요?`, () => remove(m.id));
                    }}
                    className="px-3 py-1 rounded text-white text-sm cursor-pointer
                               bg-red-600 hover:bg-red-500"
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      update(m.id, { favorite: !m.favorite });
                    }}
                    className={`ml-auto p-1 rounded cursor-pointer ${
                      m.favorite ? "text-yellow-400" : "text-neutral-400"
                    } hover:text-yellow-400`}
                  >
                    <Star size={16} fill={m.favorite ? "currentColor" : "none"} />
                  </button>
                </div>
              </div>
            </li>,
            snapshot.isDragging
          )
        }
      </Draggable>
    );
  };

  // onDragEnd: 화면에 보이는 순서를 기준으로 재배열
  const handleDrop = (r: DropResult) => {
    const { source, destination, draggableId, type } = r;
    if (!destination) return;

    if (type === "FOLDER") {
      handleFolderDragEnd(r);
      const newOrder = Array.from(folderOrder);
      const [moved] = newOrder.splice(source.index, 1);
      newOrder.splice(destination.index, 0, moved);
      setFolderOrder(newOrder);
      return;
    }

    if (type === "ITEM") {
      const itemId = draggableId.replace(/^item:/, "");
      const srcListId = source.droppableId;
      const dstListId = destination.droppableId;

      setOrderMap((prev) => {
        const next: OrderMap = { ...prev };

        // ✅ 지금 화면에 보이는 순서를 기준으로 가져옴
        const srcDisplay = getDisplayOrder(srcListId);
        const dstDisplay = srcListId === dstListId ? srcDisplay.slice() : getDisplayOrder(dstListId).slice();

        // 같은 리스트 재정렬
        if (srcListId === dstListId) {
          const [moved] = dstDisplay.splice(source.index, 1);
          dstDisplay.splice(destination.index, 0, moved);
          next[srcListId] = dstDisplay;
          return next;
        }

        // 서로 다른 리스트 이동
        const fromIdx = srcDisplay.indexOf(itemId);
        if (fromIdx >= 0) srcDisplay.splice(fromIdx, 1);

        // 목적지에 끼워넣기 (드랍 인덱스 기준)
        const existIdx = dstDisplay.indexOf(itemId);
        if (existIdx >= 0) dstDisplay.splice(existIdx, 1);
        dstDisplay.splice(destination.index, 0, itemId);

        next[srcListId] = srcDisplay;
        next[dstListId] = dstDisplay;
        return next;
      });

      // 폴더 이동 반영
      const srcFolder = decodeListIdToFolder(srcListId);
      const dstFolder = decodeListIdToFolder(dstListId);
      if (srcFolder !== dstFolder) {
        update(itemId, { folder: dstFolder });
      }
    }
  };

  // 폴더 렌더 순서
  const foldersToRender = [
    ...folderOrder.filter((f) => orderedFolders.includes(f)),
    ...orderedFolders.filter((f) => !folderOrder.includes(f)),
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 transition-opacity duration-300 z-90 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar (모바일 드래그 중에는 transform 제거) */}
      <div
        className={`fixed top-0 left-0 h-[calc(100dvh_-_0px)] w-full sm:w-1/3
                    bg-white dark:bg-neutral-950
                    text-neutral-900 dark:text-white
                    shadow-lg z-99
                    ${isDraggingAny ? "transform-none" : "transform transition-transform duration-300"}
                    ${open ? (isDraggingAny ? "" : "translate-x-0") : "-translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex justify-between items-center h-12 desk:h-16 p-4 border-b border-neutral-200 dark:border-neutral-800">
          <h2 className="text-lg font-bold">명식 리스트</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onAddNew();
                onClose();
              }}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm cursor-pointer
                         bg-purple-600 hover:bg-purple-500 text-white"
            >
              <Plus size={16} /> 명식추가
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        <DragDropContext
          onDragStart={() => setIsDraggingAny(true)}
          onDragEnd={(r) => {
            setIsDraggingAny(false);
            handleDrop(r);
          }}
        >
          <div
            className="p-4 overflow-y-auto h-[calc(100%-56px)] overscroll-contain"
            style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch" }}
          >
            {/* 새 폴더 생성 */}
            <div className="flex items-center mb-2 gap-2">
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="새 폴더 이름"
                className="flex-1 w-[60%] px-2 py-1 rounded h-30
                           bg-white dark:bg-neutral-900
                           border border-neutral-300 dark:border-neutral-700
                           text-sm text-neutral-900 dark:text-neutral-100
                           placeholder-neutral-400 dark:placeholder-neutral-500"
              />
              <button
                type="button"
                onClick={() => createFolder(newFolderName)}
                className="px-3 rounded h-30 text-sm cursor-pointer
                           bg-neutral-100 hover:bg-neutral-200
                           dark:bg-neutral-800 dark:hover:bg-neutral-700
                           text-neutral-900 dark:text-neutral-100
                           border border-neutral-200 dark:border-neutral-700"
              >
                생성
              </button>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
              명식/폴더를 드래그 하여 순서를 바꿀 수 있습니다.
            </p>

            {/* 바깥(미지정) 드롭 영역 */}
            <Droppable droppableId={DROPPABLE_UNASSIGNED} type="ITEM" direction="vertical" ignoreContainerClipping>
              {(prov) => {
                const outItems = orderItems(DROPPABLE_UNASSIGNED, unassignedItems);
                return (
                  <div ref={prov.innerRef} {...prov.droppableProps} className="mb-6">
                    <ul className="space-y-3">
                      {outItems.map((m, i) => renderCard(m, i))}
                      {prov.placeholder}
                    </ul>
                  </div>
                );
              }}
            </Droppable>

            {/* 폴더 섹션들 */}
            <Droppable droppableId="folders:root" type="FOLDER" direction="vertical" ignoreContainerClipping>
              {(foldersProv) => (
                <div ref={foldersProv.innerRef} {...foldersProv.droppableProps}>
                  {foldersToRender.map((folderName, folderIndex) => {
                    const listId = listDroppableId(folderName);
                    const inItems = orderItems(listId, grouped[folderName] || []);
                    const openF = !!folderOpenMap[folderName];
                    const isFavFolder = !!folderFavMap[folderName];

                    return (
                      <Draggable
                        key={`folder-${folderName}`}
                        draggableId={`folder-${folderName}`}
                        index={folderIndex}
                      >
                        {(folderDrag, folderSnap) =>
                          portalize(
                            <div
                              ref={folderDrag.innerRef}
                              {...folderDrag.draggableProps}
                              style={getDragStyle(folderDrag.draggableProps.style, folderSnap.isDropAnimating)}
                              className="mb-4"
                            >
                              {/* 헤더 */}
                              <div
                                className="flex items-center justify-between px-2 py-2 rounded
                                           bg-neutral-50 dark:bg-neutral-900/70
                                           border border-neutral-200 dark:border-neutral-800
                                           text-neutral-800 dark:text-neutral-200"
                              >
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFolderOpenMap((s: MemoOpenMap) => ({
                                        ...s,
                                        [folderName]: !openF,
                                      }));
                                    }}
                                    className="inline-flex items-center gap-1 text-sm font-semibold cursor-pointer"
                                  >
                                    {openF ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    <span className="text-sm font-semibold">{folderName}</span>
                                  </button>

                                  {/* 폴더 전용 드래그 핸들 */}
                                  <button
                                    aria-label="폴더 드래그"
                                    {...folderDrag.dragHandleProps}
                                    className="p-1 rounded cursor-grab active:cursor-grabbing hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    style={{ touchAction: "none" }}
                                  >
                                    <GripVertical size={16} />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setFolderFavMap((s: MemoOpenMap) => ({
                                        ...s,
                                        [folderName]: !s[folderName],
                                      }));
                                    }}
                                    className={`p-1 rounded cursor-pointer ${
                                      isFavFolder ? "text-yellow-400" : "text-neutral-400"
                                    } hover:text-yellow-400`}
                                  >
                                    <Star size={16} fill={isFavFolder ? "currentColor" : "none"} />
                                  </button>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="opacity-60 text-xs">{inItems.length}개</span>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (folderFavMap[folderName]) {
                                        confirmThrottled(
                                          `'${folderName}' 폴더는 즐겨찾기 되어 있습니다.\n즐겨찾기 해제 후 삭제해주세요.`,
                                          () => {}
                                        );
                                        return;
                                      }
                                      confirmThrottled(
                                        `'${folderName}' 폴더를 삭제할까요?\n(소속 항목은 바깥으로 이동합니다)`,
                                        () => deleteFolder(folderName)
                                      );
                                    }}
                                    className="px-2 py-1 rounded text-xs cursor-pointer
                                               border border-red-300 dark:border-red-700
                                               text-red-700 dark:text-red-300
                                               hover:bg-red-50 dark:hover:bg-red-900/30"
                                  >
                                    삭제
                                  </button>
                                </div>
                              </div>

                              {/* 폴더 내부 아이템 드롭 영역 */}
                              {openF && (
                                <Droppable droppableId={listId} type="ITEM" direction="vertical" ignoreContainerClipping>
                                  {(prov) => (
                                    <div ref={prov.innerRef} {...prov.droppableProps} className="mt-2">
                                      <ul className="space-y-3">
                                        {inItems.map((m, i) => renderCard(m, i))}
                                        {prov.placeholder}
                                      </ul>
                                    </div>
                                  )}
                                </Droppable>
                              )}
                            </div>,
                            folderSnap.isDragging
                          )
                        }
                      </Draggable>
                    );
                  })}
                  {foldersProv.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </DragDropContext>
      </div>
    </>
  );
}