import { useCallback, type MouseEvent } from "react";
import { toast } from "react-hot-toast";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";

type MemoToggleFn = (id: string) => void;

type UseMyeongsikCardSaveArgs = {
  m: MyeongSik;
  locked: boolean;
  lockMsg: string;
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
  handleLockClick: (e?: MouseEvent<HTMLElement>) => void;
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
  locked,
  lockMsg,
  unassignedLabel,
  onToggleMemo,
  onChangeFolder,
  onChangeMingSikType,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
}: UseMyeongsikCardSaveArgs): MyeongsikCardSave => {
  const guardLocked = useCallback(() => {
    if (!locked) return false;
    toast.error(lockMsg);
    return true;
  }, [locked, lockMsg]);

  const handleLockClick = useCallback(
    (e?: MouseEvent<HTMLElement>) => {
      e?.stopPropagation();
      if (locked) toast.error(lockMsg);
    },
    [locked, lockMsg]
  );

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
      if (guardLocked()) return;
      onEdit(m);
    },
    [guardLocked, onEdit, m]
  );

  const handleDelete = useCallback(
    (e?: MouseEvent<HTMLElement>) => {
      e?.stopPropagation();
      if (guardLocked()) return;
      onDelete(m);
    },
    [guardLocked, onDelete, m]
  );

  const handleToggleFavorite = useCallback(
    (e?: MouseEvent<HTMLElement>) => {
      e?.stopPropagation();
      if (guardLocked()) return;
      onToggleFavorite(m.id);
    },
    [guardLocked, onToggleFavorite, m.id]
  );

  const handleFolderChange = useCallback(
    (raw: string) => {
      if (guardLocked()) return;
      const normalized = raw === unassignedLabel ? undefined : raw;
      onChangeFolder(m.id, normalized);
    },
    [guardLocked, onChangeFolder, m.id, unassignedLabel]
  );

  const handleMingSikTypeChange = useCallback(
    (raw: string) => {
      if (guardLocked()) return;
      const nextRule = raw as DayBoundaryRule;
      onChangeMingSikType(m, nextRule);
    },
    [guardLocked, onChangeMingSikType, m]
  );

  return {
    handleLockClick,
    handleToggleMemo,
    handleView,
    handleEdit,
    handleDelete,
    handleToggleFavorite,
    handleFolderChange,
    handleMingSikTypeChange,
  };
};
