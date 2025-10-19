// components/Sidebar.tsx
import {
  X,
  Plus,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import type { MyeongSik } from "@/shared/lib/storage";
import { useSidebarLogic } from "@/features/sidebar/lib/sidebarLogic";
import {
  fmtBirthKR,
  formatPlaceDisplay,
  getGanjiString,
} from "@/features/sidebar/lib/sidebarUtils";
import { normalizeFolderValue } from "@/features/sidebar/model/folderModel";
import { recalcGanjiSnapshot } from "@/shared/domain/간지/recalcGanjiSnapshot";
import { formatLocalHM } from "@/shared/utils";
import { isDST } from "@/shared/lib/core/timeCorrection";
import type { DayBoundaryRule } from "@/shared/type";
//import { toCorrected } from "@/shared/domain/meongsik";
//import { withSafeClockForUnknownTime } from "@/features/luck/utils/withSafeClockForUnknownTime";

type MemoOpenMap = Record<string, boolean>;
type OrderMap = Record<string, string[]>; // droppableId -> itemId[]

const LS_ORDER_KEY = "sidebar.orderMap.v1";
const LS_FOLDER_ORDER_KEY = "sidebar.folderOrder.v1";

// ITEM 드롭 영역 ID 규칙
const DROPPABLE_UNASSIGNED = "list:__unassigned__";
const listDroppableId = (folderName: string) => `list:${folderName}`;
const decodeListIdToFolder = (droppableId: string): string | undefined => {
  if (!droppableId.startsWith("list:")) return undefined;
  const key = droppableId.slice(5);
  return key === "__unassigned__" ? undefined : key;
};

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onView: (m: MyeongSik) => void;
  onAddNew: () => void;
  onEdit: (m: MyeongSik) => void;
  onDeleteView: () => void;
};

export default function Sidebar({
  open,
  onClose,
  onView,
  onAddNew,
  onEdit,
  onDeleteView
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
    grouped,             // { [folderName]: MyeongSik[] }
    unassignedItems,     // MyeongSik[]
    handleDragEnd: handleFolderDragEnd, // 폴더 재정렬용 훅 내부 처리
    createFolder,
    deleteFolder,
    UNASSIGNED_LABEL,
    displayFolderLabel,
  } = useSidebarLogic(list, update);

  

  /** 폴더 렌더 순서 (로컬 유지) */
  const [folderOrder, setFolderOrder] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_FOLDER_ORDER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) setFolderOrder(parsed);
      }
    } catch {
      console.log('[Sidebar] Failed to load folderOrder from localStorage');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_FOLDER_ORDER_KEY, JSON.stringify(folderOrder));
    } catch {
      console.log('[Sidebar] Failed to save folderOrder to localStorage');
    }
  }, [folderOrder]);

  /** 리스트별 아이템 렌더 순서 (DroppableId -> itemId[]) */
  const [orderMap, setOrderMap] = useState<OrderMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_ORDER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as OrderMap;
        if (parsed && typeof parsed === "object") {
          // 현재 목록과 병합(없는 드롭영역은 그대로)
          setOrderMap((prev) => ({ ...parsed, ...prev }));
        }
      }
    } catch {
      console.log('[Sidebar] Failed to load orderMap from localStorage');
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LS_ORDER_KEY, JSON.stringify(orderMap));
    } catch {
      console.log('[Sidebar] Failed to save orderMap to localStorage');
    }
  }, [orderMap]);

  /** 전역 드래그 여부(모바일 스크롤 UX 보조) */
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  /** 현재 렌더 기준 배열을 orderMap 순서로 정렬 */
  const orderItems = (droppableId: string, arr: MyeongSik[]) => {
    const byId = new Map(arr.map((it) => [it.id, it]));
    const ord = orderMap[droppableId] ?? [];
    const out: MyeongSik[] = [];
    for (const id of ord) {
      const it = byId.get(id);
      if (it) {
        out.push(it);
        byId.delete(id);
      }
    }
    // 누락 보강(새/정리되지 않은 항목)
    byId.forEach((it) => out.push(it));
    return out;
  };

  /** 화면에 “현재 보이는 순서”의 id 배열(인덱스 일치 보장) */
  const getDisplayOrder = (droppableId: string): string[] => {
    const folder = decodeListIdToFolder(droppableId);
    const baseArr = folder ? (grouped[folder] || []) : unassignedItems;
    return orderItems(droppableId, baseArr).map((it) => it.id);
  };

  /** orderMap 초기화/보강: 누락 id 뒤에 추가, 새 폴더/항목 반영 */
  useEffect(() => {
    setOrderMap((prev) => {
      let changed = false;
      const next: OrderMap = { ...prev };

      // 바깥(미지정)
      {
        const outId = DROPPABLE_UNASSIGNED;
        const base = unassignedItems.map((it) => it.id);
        if (!next[outId]) {
          next[outId] = base;
          changed = true;
        } else {
          // 누락 보강
          const missing = base.filter((id) => !next[outId].includes(id));
          if (missing.length) {
            next[outId] = [...next[outId], ...missing];
            changed = true;
          }
          // orderMap에 있는데 실제 목록에서 사라진 id 제거
          const gone = next[outId].filter((id) => !base.includes(id));
          if (gone.length) {
            next[outId] = next[outId].filter((id) => !gone.includes(id));
            changed = true;
          }
        }
      }

      // 각 폴더
      for (const folderName of orderedFolders) {
        const listId = listDroppableId(folderName);
        const base = (grouped[folderName] || []).map((it) => it.id);
        if (!next[listId]) {
          next[listId] = base;
          changed = true;
        } else {
          const missing = base.filter((id) => !next[listId].includes(id));
          if (missing.length) {
            next[listId] = [...next[listId], ...missing];
            changed = true;
          }
          const gone = next[listId].filter((id) => !base.includes(id));
          if (gone.length) {
            next[listId] = next[listId].filter((id) => !gone.includes(id));
            changed = true;
          }
        }
      }

      return changed ? next : prev;
    });
  }, [unassignedItems, grouped, orderedFolders]);

  /** 폴더 렌더 순서: 저장된 순서 우선 + 신규 폴더 보강 */
  const foldersToRender = useMemo(
    () => [
      ...folderOrder.filter((f) => orderedFolders.includes(f)),
      ...orderedFolders.filter((f) => !folderOrder.includes(f)),
    ],
    [folderOrder, orderedFolders]
  );

  /** 드래그 아이템 스타일(필요 시만): 여기선 transition 커스텀 제거 */
  const getDragStyle = (base: CSSProperties | undefined): CSSProperties => {
    return base ?? {};
  };

  /** 개별 카드(아이템) 렌더 — li 전체 핸들 */
  const renderCard = (m: MyeongSik, index: number) => {
    const ganji = getGanjiString(m);
    const placeDisplay = formatPlaceDisplay(m.birthPlace?.name);
    const keyId = `item:${m.id}`;
    const memoOpen = !!memoOpenMap[m.id];

    let correctedDate = new Date(m.corrected);
    if (
      isDST(
        correctedDate.getFullYear(),
        correctedDate.getMonth() + 1,
        correctedDate.getDate()
      )
    ) {
      correctedDate = new Date(correctedDate.getTime() - 60 * 60 * 1000);
    }

  const isUnknownTime = !m.birthTime || m.birthTime === "모름";

    const rawBirth = String(m.birthDay).trim();

  let birthYear = NaN;
  if (/^\d{8}$/.test(rawBirth)) {
    const formatted = `${rawBirth.slice(0, 4)}-${rawBirth.slice(4, 6)}-${rawBirth.slice(6, 8)}`;
    const date = new Date(formatted);
    if (!isNaN(date.getTime())) {
      birthYear = date.getFullYear();
    }
  } else {
    const date = new Date(rawBirth);
    if (!isNaN(date.getTime())) {
      birthYear = date.getFullYear();
    }
  }

  function koreanAgeByYear(birthYear: number, targetYear: number): number {
    if (isNaN(birthYear)) return 0;
    return targetYear - birthYear + 1;
  }

  const thisYear = new Date().getFullYear();
  const age = koreanAgeByYear(birthYear, thisYear);

    return (
      <Draggable draggableId={keyId} index={index} key={keyId}>
        {(prov) => (
          <li
            ref={prov.innerRef}
            {...prov.draggableProps}
            {...prov.dragHandleProps} // ← li 전체가 핸들!
            style={getDragStyle(prov.draggableProps.style)}
            className="list-none select-none rounded-xl border
                       bg-white dark:bg-neutral-900
                       border-neutral-200 dark:border-neutral-800
                       text-neutral-900 dark:text-neutral-100
                       cursor-grab active:cursor-grabbing"
          >
            <div className="p-3">
              <div className="flex items-center gap-2">
                <div className="font-semibold text-sm desk:text-base">
                  {m.name} ({age}세, {m.gender})
                </div>
                <span className="opacity-40">｜</span>
                <div className="text-sm text-neutral-600 dark:text-neutral-300">
                  {m.relationship ? m.relationship : "관계 미지정"}
                </div>
                {/* 시각 힌트만 제공(실제 핸들은 li 전체) */}
                <span className="ml-auto opacity-50 select-none">☰</span>
              </div>

              <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                {fmtBirthKR(m.birthDay, m.birthTime)},{" "}
                {m.calendarType === "lunar" ? "음력" : "양력"}
              </div>

              {(placeDisplay || correctedDate) && (
                <div className="text-sm text-neutral-500 dark:text-neutral-400">
                  {placeDisplay}
                  {correctedDate && (
                    
                    <span className="opacity-70">
                      {" "}
                      · 보정시 {isUnknownTime ? "모름" : formatLocalHM(correctedDate)}
                    </span>
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
                    className={
                      memoOpen
                        ? "mt-1 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap"
                        : "hidden"
                    }
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
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    const raw = e.target.value;
                    const normalized = normalizeFolderValue(raw);
                    const itemId = m.id;

                    const srcListId = m.folder
                      ? listDroppableId(m.folder)
                      : DROPPABLE_UNASSIGNED;
                    const dstListId = normalized
                      ? listDroppableId(normalized)
                      : DROPPABLE_UNASSIGNED;

                    if (normalized && !orderedFolders.includes(normalized)) {
                      createFolder(normalized);
                    }

                    // orderMap 갱신 (화면 보이는 순서 기준)
                    setOrderMap((prev) => {
                      const next: OrderMap = { ...prev };
                      const srcDisplay = getDisplayOrder(srcListId);
                      const dstDisplay =
                        srcListId === dstListId
                          ? srcDisplay.slice()
                          : getDisplayOrder(dstListId).slice();

                      // src에서 제거
                      const si = srcDisplay.indexOf(itemId);
                      if (si >= 0) srcDisplay.splice(si, 1);

                      // dst 맨앞 삽입
                      const di = dstDisplay.indexOf(itemId);
                      if (di >= 0) dstDisplay.splice(di, 1);
                      dstDisplay.unshift(itemId);

                      next[srcListId] = srcDisplay;
                      next[dstListId] = dstDisplay;
                      return next;
                    });

                    // 실제 데이터 이동
                    update(itemId, { folder: normalized });
                  }}
                >
                  {[UNASSIGNED_LABEL, ...orderedFolders].map((f) => (
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
                  value={m.mingSikType ?? "조자시/야자시"}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    const nextRule = e.target.value as DayBoundaryRule;

                    const updated = { ...m, mingSikType: nextRule };
                    const snapshot = recalcGanjiSnapshot(updated);

                    update(m.id, { mingSikType: nextRule, ...snapshot });
                    onView({ ...updated, ...snapshot });
                    onClose();
                  }}
                >
                  <option value="자시">자시</option>
                  <option value="조자시/야자시">조자시/야자시</option>
                  <option value="인시">인시</option>
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
                    if (confirm(`'${m.name}' 명식을 삭제할까요?`)) {
                      remove(m.id);

                      if (onDeleteView) {
                        onDeleteView();
                      }
                    }
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
          </li>
        )}
      </Draggable>
    );
  };

  /** 드롭 처리: 폴더/아이템 모두 처리(보이는 순서 기반) */
  const handleDrop = (r: DropResult) => {
    const { source, destination, draggableId, type } = r;
    if (!destination) return;

    if (type === "FOLDER") {
      // 훅 내부 폴더 로직 호출 + 로컬 렌더 순서 업데이트
      handleFolderDragEnd(r);
      setFolderOrder((prev) => {
        const next = [...prev];
        const [moved] = next.splice(source.index, 1);
        next.splice(destination.index, 0, moved);
        return next;
      });
      return;
    }

    if (type === "ITEM") {
      const itemId = draggableId.replace(/^item:/, "");
      const srcListId = source.droppableId;
      const dstListId = destination.droppableId;

      setOrderMap((prev) => {
        const next: OrderMap = { ...prev };

        // 현재 화면 보이는 순서(인덱스 정확)로 가져오기
        const srcDisplay = getDisplayOrder(srcListId);
        const dstDisplay =
          srcListId === dstListId
            ? srcDisplay.slice()
            : getDisplayOrder(dstListId).slice();

        if (srcListId === dstListId) {
          // 같은 리스트 내 재정렬
          const [moved] = dstDisplay.splice(source.index, 1);
          dstDisplay.splice(destination.index, 0, moved);
          next[srcListId] = dstDisplay;
          return next;
        }

        // 서로 다른 리스트 간 이동
        const si = srcDisplay.indexOf(itemId);
        if (si >= 0) srcDisplay.splice(si, 1);

        const di = dstDisplay.indexOf(itemId);
        if (di >= 0) dstDisplay.splice(di, 1);
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

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 transition-opacity duration-300 z-90 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar — transform 제거, left 이동만 */}
      <div
        className={`fixed top-0 left-0 h-[100dvh] min-w-[320px] w-full desk:w-1/3
                    bg-white dark:bg-neutral-950
                    text-neutral-900 dark:text-white
                    shadow-lg z-99 transition-[left] duration-300
                    ${isDraggingAny ? "overflow-hidden" : "overflow-auto"}
                    ${open ? "left-0" : "left-[-100%]"}`}
      >
        {/* 헤더 */}
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
            className="p-4 h-[calc(100%-56px)] overflow-y-auto overscroll-contain"
            style={{ touchAction: "pan-y" }}
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
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                onClick={() => createFolder(newFolderName)}
                className="px-3 rounded h-30 text-sm cursor-pointer
                           bg-neutral-100 hover:bg-neutral-200
                           dark:bg-neutral-800 dark:hover:bg-neutral-700
                           text-neutral-900 dark:text-neutral-100
                           border border-neutral-200 dark:border-neutral-700"
                onClickCapture={(e) => e.stopPropagation()}
              >
                생성
              </button>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
              명식/폴더를 드래그 하여 순서를 바꿀 수 있습니다.
            </p>

            {/* 바깥(미지정) 드롭 영역 */}
            <Droppable
              droppableId={DROPPABLE_UNASSIGNED}
              type="ITEM"
              direction="vertical"
              ignoreContainerClipping
            >
              {(prov) => {
                const outItems = orderItems(DROPPABLE_UNASSIGNED, unassignedItems);
                return (
                  <div ref={prov.innerRef} {...prov.droppableProps} className="mb-6">
                    <ul className="flex flex-col gap-2">
                      {outItems.map((m, i) => renderCard(m, i))}
                      {prov.placeholder}
                    </ul>
                  </div>
                );
              }}
            </Droppable>

            {/* 폴더 섹션들 */}
            <Droppable
              droppableId="folders:root"
              type="FOLDER"
              direction="vertical"
              ignoreContainerClipping
            >
              {(foldersProv) => (
                <div ref={foldersProv.innerRef} {...foldersProv.droppableProps}>
                  {foldersToRender.map((folderName, folderIndex) => {
                    const listId = listDroppableId(folderName);
                    const inItemsOrdered = orderItems(
                      listId,
                      grouped[folderName] || []
                    );
                    const openF = !!folderOpenMap[folderName];
                    const isFavFolder = !!folderFavMap[folderName];

                    return (
                      <Draggable
                        key={`folder-${folderName}`}
                        draggableId={`folder-${folderName}`}
                        index={folderIndex}
                      >
                        {(prov) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps} // 폴더 헤더도 전체 핸들
                            className="mb-4 cursor-grab active:cursor-grabbing select-none"
                          >
                            {/* 폴더 헤더 */}
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

                              {/* 오른쪽 끝: 개수 + 삭제 */}
                              <div className="flex items-center gap-2">
                                <span className="opacity-60 text-xs">
                                  {inItemsOrdered.length}개
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (folderFavMap[folderName]) {
                                      alert(
                                        `'${folderName}' 폴더는 즐겨찾기 되어 있습니다.\n즐겨찾기 해제 후 삭제해주세요.`
                                      );
                                      return;
                                    }
                                    if (
                                      confirm(
                                        `'${folderName}' 폴더를 삭제할까요?\n(소속 항목은 바깥으로 이동합니다)`
                                      )
                                    ) {
                                      deleteFolder(folderName);
                                    }
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
                              <Droppable
                                droppableId={listId}
                                type="ITEM"
                                direction="vertical"
                                ignoreContainerClipping
                              >
                                {(prov) => (
                                  <div ref={prov.innerRef} {...prov.droppableProps} className="mt-2">
                                    <ul className="flex flex-col gap-2">
                                      {inItemsOrdered.map((m, i) => renderCard(m, i))}
                                      {prov.placeholder}
                                    </ul>
                                  </div>
                                )}
                              </Droppable>
                            )}
                          </div>
                        )}
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