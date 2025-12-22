import type { Dispatch, SetStateAction } from "react";
import type { DropResult } from "@hello-pangea/dnd";
import type { MyeongSik } from "@/shared/lib/storage";
import { useSidebarFolderInput } from "@/features/sidebar/input/useSidebarFolderInput";
import { useSidebarFolderCalc } from "@/features/sidebar/calc/useSidebarFolderCalc";
import { useSidebarFolderSave } from "@/features/sidebar/save/useSidebarFolderSave";
import type { FolderFavMap } from "@/shared/domain/myeongsikList/ops";

type BoolMap = Record<string, boolean>;

type UseSidebarLogicResult = {
  folderFavMap: FolderFavMap;
  setFolderFavMap: Dispatch<SetStateAction<FolderFavMap>>;
  folderOpenMap: BoolMap;
  setFolderOpenMap: Dispatch<SetStateAction<BoolMap>>;
  newFolderName: string;
  setNewFolderName: Dispatch<SetStateAction<string>>;
  orderedFolders: string[];
  grouped: Record<string, MyeongSik[]>;
  unassignedItems: MyeongSik[];
  handleDragEnd: (r: DropResult) => void;
  createFolder: (name: string) => void;
  deleteFolder: (name: string) => void;
  UNASSIGNED_LABEL: string;
};

export function useSidebarLogic(
  list: MyeongSik[],
  actions: {
    unsetFolderForFolder: (folderName: string) => Promise<void> | void;
  }
): UseSidebarLogicResult {
  const input = useSidebarFolderInput();
  const calc = useSidebarFolderCalc({ list, orderedFolders: input.orderedFolders });
  const save = useSidebarFolderSave({
    folderFavMap: input.folderFavMap,
    setFolderFavMap: input.setFolderFavMap,
    setOrderedFolders: input.setOrderedFolders,
    unsetFolderForFolder: actions.unsetFolderForFolder,
  });

  return {
    folderFavMap: input.folderFavMap,
    setFolderFavMap: input.setFolderFavMap,
    folderOpenMap: input.folderOpenMap,
    setFolderOpenMap: input.setFolderOpenMap,
    newFolderName: input.newFolderName,
    setNewFolderName: input.setNewFolderName,
    orderedFolders: input.orderedFolders,
    grouped: calc.grouped,
    unassignedItems: calc.unassignedItems,
    handleDragEnd: save.handleDragEnd,
    createFolder: save.createFolder,
    deleteFolder: save.deleteFolder,
    UNASSIGNED_LABEL: save.UNASSIGNED_LABEL,
  };
}
