import { useEffect, useRef, useState } from "react";
import type { MyeongsikSearchMode } from "@/myeongsik/calc/myeongsikList/ops";
import type { MyeongSik } from "@/shared/lib/storage";

type MemoOpenMap = Record<string, boolean>;

type UseSidebarInputArgs = {
  list: MyeongSik[];
  orderedFolders: string[];
};

type SidebarInput = {
  search: string;
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  searchMode: MyeongsikSearchMode;
  setSearchMode: React.Dispatch<React.SetStateAction<MyeongsikSearchMode>>;
  memoOpenMap: MemoOpenMap;
  toggleMemo: (id: string) => void;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  stashScrollTop: () => void;
};

export const useSidebarInput = ({ list, orderedFolders }: UseSidebarInputArgs): SidebarInput => {
  const [search, setSearch] = useState<string>("");
  const [searchMode, setSearchMode] = useState<MyeongsikSearchMode>("name");
  const [memoOpenMap, setMemoOpenMap] = useState<MemoOpenMap>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = useRef<number | null>(null);

  useEffect(() => {
    if (pendingScrollTopRef.current == null) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = pendingScrollTopRef.current;
    pendingScrollTopRef.current = null;
  }, [list, orderedFolders]);

  const toggleMemo = (id: string) => {
    setMemoOpenMap((s: MemoOpenMap) => ({ ...s, [id]: !s[id] }));
  };

  const stashScrollTop = () => {
    const el = scrollRef.current;
    if (el) pendingScrollTopRef.current = el.scrollTop;
  };

  return {
    search,
    setSearch,
    searchMode,
    setSearchMode,
    memoOpenMap,
    toggleMemo,
    scrollRef,
    stashScrollTop,
  };
};
