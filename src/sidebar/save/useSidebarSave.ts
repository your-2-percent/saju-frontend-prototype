// features/sidebar/save/useSidebarSave.ts
import { useCallback, type Dispatch, type SetStateAction } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { recalcGanjiSnapshot } from "@/shared/domain/ganji/recalcGanjiSnapshot";
import { decodeListIdToFolder } from "@/sidebar/calc/dndIds";
import { emitFolderEvent } from "@/sidebar/saveInterface/folderEvents";
import { moveByFolderSelect } from "@/myeongsik/calc/myeongsikList/calc/folders";

type BoolMap = Record<string, boolean>;

type MoveItemByDnDArgs = {
  orderedFolders: string[];
  sourceFolder: string | undefined;
  sourceIndex: number;
  destinationFolder: string | undefined;
  destinationIndex: number;
};

type UseSidebarSaveArgs = {
  // ✅ 추가: 현재 list 필요
  list: MyeongSik[];

  orderedFolders: string[];
  isFiltering: boolean;
  handleFolderDragEnd: (r: DropResult) => void;
  moveItemByDnD: (args: MoveItemByDnDArgs) => Promise<void> | void;

  // ✅ 추가: list를 통째로 교체 + 저장까지 해주는 store 함수
  applyNextList: (nextList: MyeongSik[]) => Promise<void> | void;

  update: (id: string, patch: Partial<MyeongSik>) => void;
  remove: (id: string) => void;
  onView: (m: MyeongSik) => void;
  onClose: () => void;
  onDeleteView: () => void;
  folderFavMap: BoolMap;
  setFolderFavMap: Dispatch<SetStateAction<BoolMap>>;
  setFolderOpenMap: Dispatch<SetStateAction<BoolMap>>;
  createFolder: (name: string) => void;
  deleteFolder: (name: string) => void;
  newFolderName: string;
  setNewFolderName: Dispatch<SetStateAction<string>>;
  stashScrollTop: () => void;
};

type SidebarSave = {
  handleDrop: (r: DropResult) => void;
  changeFolder: (id: string, folder: string | undefined) => void;
  changeMingSikType: (m: MyeongSik, nextRule: DayBoundaryRule) => void;
  viewAndClose: (m: MyeongSik) => void;
  requestDelete: (m: MyeongSik) => void;
  createFolderAndNotify: () => void;
  requestDeleteFolder: (folderName: string) => void;
  toggleFolderOpen: (folderName: string) => void;
  toggleFolderFavorite: (folderName: string) => void;
};

export const useSidebarSave = ({
  list,
  orderedFolders,
  isFiltering,
  handleFolderDragEnd,
  moveItemByDnD,
  applyNextList,
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
  stashScrollTop,
}: UseSidebarSaveArgs): SidebarSave => {
  // ✅ 핵심 수정: 셀렉트 폴더 변경은 update() 금지
  const changeFolder = useCallback(
    (id: string, folder: string | undefined) => {
      const { nextList } = moveByFolderSelect({
        list,
        orderedFolders,
        targetId: id,
        nextFolder: folder ?? "",
      });

      void applyNextList(nextList);
    },
    [list, orderedFolders, applyNextList]
  );

  const changeMingSikType = useCallback(
    (m: MyeongSik, nextRule: DayBoundaryRule) => {
      const updated = { ...m, mingSikType: nextRule };
      const snapshot = recalcGanjiSnapshot(updated);
      update(m.id, { mingSikType: nextRule, ...snapshot });
      onView({ ...updated, ...snapshot });
      onClose();
    },
    [update, onView, onClose]
  );

  const viewAndClose = useCallback(
    (m: MyeongSik) => {
      onView(m);
      onClose();
    },
    [onView, onClose]
  );

  const requestDelete = useCallback(
    (m: MyeongSik) => {
      if (!confirm(`'${m.name}' 명식을 삭제할까요?`)) return;
      remove(m.id);
      if (onDeleteView) onDeleteView();
    },
    [remove, onDeleteView]
  );

  const createFolderAndNotify = useCallback(() => {
    const raw = newFolderName.trim();
    if (!raw) return;
    createFolder(raw);
    setNewFolderName("");
    emitFolderEvent();
  }, [newFolderName, createFolder, setNewFolderName]);

  const requestDeleteFolder = useCallback(
    (folderName: string) => {
      if (folderFavMap[folderName]) {
        alert(`'${folderName}' 폴더는 즐겨찾기 중입니다.\n즐겨찾기 해제 후 삭제해주세요.`);
        return;
      }
      if (!confirm(`'${folderName}' 폴더를 삭제할까요?\n(소속 명식은 미분류로 이동합니다)`)) {
        return;
      }
      deleteFolder(folderName);
      emitFolderEvent();
    },
    [folderFavMap, deleteFolder]
  );

  const toggleFolderOpen = useCallback(
    (folderName: string) => {
      setFolderOpenMap((s: BoolMap) => ({ ...s, [folderName]: !s[folderName] }));
    },
    [setFolderOpenMap]
  );

  const toggleFolderFavorite = useCallback(
    (folderName: string) => {
      setFolderFavMap((s: BoolMap) => ({ ...s, [folderName]: !s[folderName] }));
    },
    [setFolderFavMap]
  );

  const handleDrop = useCallback(
    (r: DropResult) => {
      const { type, source, destination, draggableId } = r;
      if (!destination) return;
      if (isFiltering) return;

      stashScrollTop();

      if (type === "FOLDER") {
        handleFolderDragEnd(r);
        return;
      }

      if (type === "ITEM") {
        const id = draggableId.replace(/^item:/, "");
        if (!id) return;

        const srcFolder = decodeListIdToFolder(source.droppableId);
        const dstFolder = decodeListIdToFolder(destination.droppableId);

        void moveItemByDnD({
          orderedFolders,
          sourceFolder: srcFolder,
          sourceIndex: source.index,
          destinationFolder: dstFolder,
          destinationIndex: destination.index,
        });
      }
    },
    [isFiltering, stashScrollTop, handleFolderDragEnd, moveItemByDnD, orderedFolders]
  );

  return {
    handleDrop,
    changeFolder,
    changeMingSikType,
    viewAndClose,
    requestDelete,
    createFolderAndNotify,
    requestDeleteFolder,
    toggleFolderOpen,
    toggleFolderFavorite,
  };
};
