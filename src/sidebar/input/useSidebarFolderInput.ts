import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import {
  getEffectiveFolders,
  loadFolderOrder,
  LS_FOLDER_FAVS,
  reconcileFolderOrder,
} from "@/sidebar/calc/folderModel";
import { pinFavoriteFolders, type FolderFavMap } from "@/myeongsik/calc/myeongsikList/ops";
import { folderOrderKey } from "@/sidebar/calc/folderOrder";

type BoolMap = Record<string, boolean>;

type SidebarFolderInput = {
  folderFavMap: FolderFavMap;
  setFolderFavMap: Dispatch<SetStateAction<FolderFavMap>>;
  folderOpenMap: BoolMap;
  setFolderOpenMap: Dispatch<SetStateAction<BoolMap>>;
  newFolderName: string;
  setNewFolderName: Dispatch<SetStateAction<string>>;
  orderedFolders: string[];
  setOrderedFolders: Dispatch<SetStateAction<string[]>>;
};

export const useSidebarFolderInput = (): SidebarFolderInput => {
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

  const [folderOpenMap, setFolderOpenMap] = useState<BoolMap>({});
  const [newFolderName, setNewFolderName] = useState<string>("");

  const [orderedFolders, setOrderedFolders] = useState<string[]>(() => {
    const effective = getEffectiveFolders();
    const saved = loadFolderOrder();
    const base = saved.length ? reconcileFolderOrder(effective, saved) : effective;
    return pinFavoriteFolders(base, folderFavMap);
  });

  useEffect(() => {
    setOrderedFolders((prev) => {
      const pinned = pinFavoriteFolders(prev, folderFavMap);
      return folderOrderKey(pinned) === folderOrderKey(prev) ? prev : pinned;
    });
  }, [folderFavMap]);

  useEffect(() => {
    setFolderOpenMap((prev) => {
      const next: BoolMap = { ...prev };
      for (const f of orderedFolders) {
        if (next[f] === undefined) next[f] = true;
      }
      return next;
    });
  }, [orderedFolders]);

  return {
    folderFavMap,
    setFolderFavMap,
    folderOpenMap,
    setFolderOpenMap,
    newFolderName,
    setNewFolderName,
    orderedFolders,
    setOrderedFolders,
  };
};
