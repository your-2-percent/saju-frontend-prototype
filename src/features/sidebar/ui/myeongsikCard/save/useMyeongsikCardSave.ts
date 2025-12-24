import { useCallback, type MouseEvent } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";

type MemoToggleFn = (id: string) => void;

type UseMyeongsikCardSaveArgs = {
  m: MyeongSik;
  unassignedLabel: string;
  onToggleMemo: MemoToggleFn;
  onChangeFolder: (id: string, folder: string | undefined) => void;
  onChangeMingSikType: (m: MyeongSik, nextRule: DayBoundaryRule) => void;
  onView: (m: MyeongSik) => void;
  onEdit: (m: MyeongSik) => void;
  onDelete: (m: MyeongSik) => void;
  onToggleFavorite: (id: string) => void;
};

type MyeongsikCardSave = {
  handleToggleMemo: (e?: MouseEvent<HTMLElement>) => void;
  handleView: (e?: MouseEvent<HTMLElement>) => void;
  handleEdit: (e?: MouseEvent<HTMLElement>) => void;
  handleDelete: (e?: MouseEvent<HTMLElement>) => void;
  handleToggleFavorite: (e?: MouseEvent<HTMLElement>) => void;
  handleFolderChange: (raw: string) => void;
  handleMingSikTypeChange: (raw: string) => void;
};

export const useMyeongsikCardSave = ({
  m,
  unassignedLabel,
  onToggleMemo,
  onChangeFolder,
  onChangeMingSikType,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
}: UseMyeongsikCardSaveArgs): MyeongsikCardSave => {
  const handleToggleMemo = useCallback(
    (e?: MouseEvent<HTMLElement>) => {
      e?.stopPropagation();
      onToggleMemo(m.id);
    },
    [onToggleMemo, m.id]
  );

  const handleView = useCallback(
    (e?: MouseEvent<HTMLElement>) => {
      e?.stopPropagation();
      onView(m);
    },
    [onView, m]
  );

  const handleEdit = useCallback(
    (e?: MouseEvent<HTMLElement>) => {
      e?.stopPropagation();
      onEdit(m);
    },
    [onEdit, m]
  );

  const handleDelete = useCallback(
    (e?: MouseEvent<HTMLElement>) => {
      e?.stopPropagation();
      onDelete(m);
    },
    [onDelete, m]
  );

  const handleToggleFavorite = useCallback(
    (e?: MouseEvent<HTMLElement>) => {
      e?.stopPropagation();
      onToggleFavorite(m.id);
    },
    [onToggleFavorite, m.id]
  );

  const handleFolderChange = useCallback(
    (raw: string) => {
      const normalized = raw === unassignedLabel ? undefined : raw;
      onChangeFolder(m.id, normalized);
    },
    [onChangeFolder, m.id, unassignedLabel]
  );

  const handleMingSikTypeChange = useCallback(
    (raw: string) => {
      const nextRule = raw as DayBoundaryRule;
      onChangeMingSikType(m, nextRule);
    },
    [onChangeMingSikType, m]
  );

  return {
    handleToggleMemo,
    handleView,
    handleEdit,
    handleDelete,
    handleToggleFavorite,
    handleFolderChange,
    handleMingSikTypeChange,
  };
};
