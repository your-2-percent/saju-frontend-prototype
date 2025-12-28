// features/sidebar/components/Sidebar.tsx
import { useState } from "react";
import { flushSync } from "react-dom";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import type { MyeongSik } from "@/shared/lib/storage";
import { useSidebarLogic } from "@/features/sidebar/lib/sidebarLogic";
import { SidebarHeader } from "@/features/sidebar/ui/SidebarHeader";
import { SidebarSearchBar } from "@/features/sidebar/ui/SidebarSearchBar";
import { SidebarNewFolderRow } from "@/features/sidebar/ui/SidebarNewFolderRow";
import { SidebarItemDroppable } from "@/features/sidebar/ui/SidebarItemDroppable";
import { SidebarFolderBlock } from "@/features/sidebar/ui/SidebarFolderBlock";
import { MyeongsikCard } from "@/features/sidebar/ui/MyeongsikCard";
import { DROPPABLE_UNASSIGNED, listDroppableId } from "@/features/sidebar/calc/dndIds";
import { useSidebarCalc } from "@/features/sidebar/calc/useSidebarCalc";
import { useSidebarInput } from "@/features/sidebar/input/useSidebarInput";
import { useSidebarSave } from "@/features/sidebar/save/useSidebarSave";
import { useLoginNudgeStore } from "@/shared/auth/loginNudgeStore";

type SidebarProps = {
  open: boolean;
  onClose: () => void;
  onView: (m: MyeongSik) => void;
  onAddNew: () => void;
  onEdit: (m: MyeongSik) => void;
  onDeleteView: () => void;
  isLoggedIn: boolean;
};

export default function Sidebar({
  open,
  onClose,
  onView,
  onAddNew,
  onEdit,
  onDeleteView,
  isLoggedIn,
}: SidebarProps) {
  const [isDragging, setIsDragging] = useState(false);

  const {
    list,
    remove,
    update,
    moveItemByDnD,
    toggleFavoriteWithReorder,
    unsetFolderForFolder,
    applyNextList,
  } = useMyeongSikStore();

  const {
    folderFavMap,
    setFolderFavMap,
    folderOpenMap,
    setFolderOpenMap,
    newFolderName,
    setNewFolderName,
    orderedFolders,
    grouped,
    unassignedItems,
    handleDragEnd: handleFolderDragEnd,
    createFolder,
    deleteFolder,
    UNASSIGNED_LABEL,
  } = useSidebarLogic(list, { unsetFolderForFolder });

  const input = useSidebarInput({ list, orderedFolders });

  const { isFiltering, filteredUnassigned, filteredGrouped, totalMatches } = useSidebarCalc({
    search: input.search,
    searchMode: input.searchMode,
    orderedFolders,
    unassignedItems,
    grouped,
  });

  const save = useSidebarSave({
    list,                 // ✅ 추가
    applyNextList,        // ✅ 추가
    orderedFolders,
    isFiltering,
    handleFolderDragEnd: handleFolderDragEnd,
    moveItemByDnD,
    update,
    remove,
    onView,
    onClose,
    onDeleteView,
    folderFavMap,
    setFolderFavMap,
    setFolderOpenMap,
    createFolder,
    deleteFolder,
    newFolderName,
    setNewFolderName,
    stashScrollTop: input.stashScrollTop,
  });

  const handleBeforeDragStart = () => {
    setIsDragging(true);
  };

  const handleDndDragEnd = (result: DropResult) => {
    // ✅ 핵심: drop 애니메이션이 "원위치 복귀"로 잡히기 전에
    // reorder(=save.handleDrop 내 상태변경)를 같은 tick에 커밋해야 flicker가 사라짐.
    flushSync(() => {
      setIsDragging(false);

      // IMPORTANT:
      // onDragEnd에서는 절대 await 걸지 말고(=한 프레임 미루지 말고)
      // 즉시 상태 반영을 먼저 하고, 저장/토스트 같은 부수효과는 내부에서 비동기로 처리해.
      void save.handleDrop(result);
    });
  };

  const openLoginModal = () => {
    useLoginNudgeStore.getState().openWith("HEADER");
  };

  return (
    <>
      <style>{`[data-rbd-drag-handle-context-id]{touch-action:none!important}`}</style>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/70 transition-opacity duration-300 z-100 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-[100dvh] min-w-[320px] w-full desk:w-1/3
                    bg-white dark:bg-neutral-950
                    text-neutral-900 dark:text-white
                    shadow-lg z-101 transition-[left] duration-300
                    overflow-hidden
                    ${open ? "left-0" : "left-[-100%]"}`}
      >
        <SidebarHeader
          onClose={onClose}
          onAddNew={() => {
            onAddNew();
            onClose();
          }}
          onLogin={() => {
            openLoginModal();
          }}
          isLoggedIn={isLoggedIn}
        />

        <DragDropContext onBeforeDragStart={handleBeforeDragStart} onDragEnd={handleDndDragEnd}>
          <div
            ref={input.scrollRef}
            className="p-4 h-[calc(100%-56px)] overflow-y-auto overscroll-contain"
            style={{ touchAction: isDragging ? "none" : "pan-y" }}
          >
            <SidebarSearchBar
              search={input.search}
              setSearch={input.setSearch}
              searchMode={input.searchMode}
              setSearchMode={input.setSearchMode}
              isFiltering={isFiltering}
              totalMatches={totalMatches}
            />

            <SidebarNewFolderRow
              newFolderName={newFolderName}
              setNewFolderName={setNewFolderName}
              isFiltering={isFiltering}
              onCreate={save.createFolderAndNotify}
            />

            <SidebarItemDroppable
              droppableId={DROPPABLE_UNASSIGNED}
              isDropDisabled={isFiltering}
              className="mb-6"
              items={filteredUnassigned.map((m, i) => (
                <MyeongsikCard
                  key={m.id}
                  m={m}
                  index={i}
                  orderedFolders={orderedFolders}
                  unassignedLabel={UNASSIGNED_LABEL}
                  isDragDisabled={isFiltering}
                  memoOpen={!!input.memoOpenMap[m.id]}
                  onToggleMemo={input.toggleMemo}
                  onChangeFolder={save.changeFolder}
                  onChangeMingSikType={save.changeMingSikType}
                  onView={save.viewAndClose}
                  onEdit={(x) => onEdit(x)}
                  onDelete={save.requestDelete}
                  onToggleFavorite={(id) => void toggleFavoriteWithReorder(id, orderedFolders)}
                />
              ))}
            />

            {/* Folders */}
            <Droppable
              droppableId="folders:root"
              type="FOLDER"
              direction="vertical"
              ignoreContainerClipping
              isDropDisabled={isFiltering}
            >
              {(foldersProv) => (
                <div ref={foldersProv.innerRef} {...foldersProv.droppableProps}>
                  {orderedFolders.map((folderName, folderIndex) => {
                    const listId = listDroppableId(folderName);
                    const inItemsOrdered = filteredGrouped[folderName] || [];
                    const openF = !!folderOpenMap[folderName];
                    const isFavFolder = !!folderFavMap[folderName];

                    return (
                      <SidebarFolderBlock
                        key={`folder-${folderName}`}
                        folderName={folderName}
                        folderIndex={folderIndex}
                        isOpen={openF}
                        isFavorite={isFavFolder}
                        itemCount={inItemsOrdered.length}
                        isDragDisabled={isFiltering}
                        onToggleOpen={() => save.toggleFolderOpen(folderName)}
                        onToggleFavorite={() => save.toggleFolderFavorite(folderName)}
                        onDelete={() => save.requestDeleteFolder(folderName)}
                        inner={
                          <SidebarItemDroppable
                            droppableId={listId}
                            isDropDisabled={isFiltering}
                            className="mt-2"
                            items={inItemsOrdered.map((m, i) => (
                              <MyeongsikCard
                                key={m.id}
                                m={m}
                                index={i}
                                orderedFolders={orderedFolders}
                                unassignedLabel={UNASSIGNED_LABEL}
                                isDragDisabled={isFiltering}
                                memoOpen={!!input.memoOpenMap[m.id]}
                                onToggleMemo={input.toggleMemo}
                                onChangeFolder={save.changeFolder}
                                onChangeMingSikType={save.changeMingSikType}
                                onView={save.viewAndClose}
                                onEdit={(x) => onEdit(x)}
                                onDelete={save.requestDelete}
                                onToggleFavorite={(id) =>
                                  void toggleFavoriteWithReorder(id, orderedFolders)
                                }
                              />
                            ))}
                          />
                        }
                      />
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
