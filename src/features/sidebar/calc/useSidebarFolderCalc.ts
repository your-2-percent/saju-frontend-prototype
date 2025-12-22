import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { groupByFolder, UNASSIGNED_KEY } from "@/shared/domain/myeongsikList/ops";

type SidebarFolderCalcArgs = {
  list: MyeongSik[];
  orderedFolders: string[];
};

type SidebarFolderCalc = {
  grouped: Record<string, MyeongSik[]>;
  unassignedItems: MyeongSik[];
};

export const useSidebarFolderCalc = ({
  list,
  orderedFolders,
}: SidebarFolderCalcArgs): SidebarFolderCalc => {
  const { grouped, unassignedItems } = useMemo(() => {
    const map = groupByFolder(list, orderedFolders);

    const groupedResult: Record<string, MyeongSik[]> = {};
    for (const f of orderedFolders) {
      groupedResult[f] = map[f] ?? [];
    }

    return {
      grouped: groupedResult,
      unassignedItems: map[UNASSIGNED_KEY] ?? [],
    };
  }, [list, orderedFolders]);

  return { grouped, unassignedItems };
};
