import { useMemo } from "react";
import {
  filterGroupedBySearch,
  isSearchActive,
  type MyeongsikSearchMode,
} from "@/shared/domain/myeongsikList/ops";
import type { MyeongSik } from "@/shared/lib/storage";

type UseSidebarCalcArgs = {
  search: string;
  searchMode: MyeongsikSearchMode;
  orderedFolders: string[];
  grouped: Record<string, MyeongSik[]>;
  unassignedItems: MyeongSik[];
};

type SidebarCalc = {
  isFiltering: boolean;
  filteredUnassigned: MyeongSik[];
  filteredGrouped: Record<string, MyeongSik[]>;
  totalMatches: number;
};

export const useSidebarCalc = ({
  search,
  searchMode,
  orderedFolders,
  grouped,
  unassignedItems,
}: UseSidebarCalcArgs): SidebarCalc => {
  const isFiltering = isSearchActive(search);

  const { filteredUnassigned, filteredGrouped, totalMatches } = useMemo(
    () =>
      filterGroupedBySearch({
        search,
        searchMode,
        orderedFolders,
        unassignedItems,
        grouped,
      }),
    [search, searchMode, orderedFolders, unassignedItems, grouped]
  );

  return {
    isFiltering,
    filteredUnassigned,
    filteredGrouped,
    totalMatches,
  };
};
