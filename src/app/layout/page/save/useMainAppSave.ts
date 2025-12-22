import { useCallback, useEffect } from "react";
import { toast } from "react-hot-toast";
import type { MyeongSik } from "@/shared/lib/storage";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";

type UseMainAppSaveArgs = {
  canAdd: boolean;
  hasCurrent: boolean;
  current: MyeongSik | undefined;
  isLoggedIn: boolean;
  setWizardOpen: (next: boolean) => void;
  setOpenCustom: (next: boolean) => void;
  setShowSidebar: (next: boolean) => void;
  setShowToday: (next: boolean) => void;
  setShowCouple: (next: boolean) => void;
  setCurrentId: (next: string) => void;
  setEditing: (next: MyeongSik | null) => void;
};

type MainAppSave = {
  openAdd: () => void;
  openCustomModal: () => void;
  handleSidebarView: (m: MyeongSik) => void;
  handleSidebarEdit: (m: MyeongSik) => void;
  handleSidebarDeleteView: () => void;
  handleWizardSave: (m: MyeongSik) => void;
  handleCustomSave: (m: MyeongSik) => void;
};

export function useMainAppSave({
  canAdd,
  hasCurrent,
  current,
  isLoggedIn,
  setWizardOpen,
  setOpenCustom,
  setShowSidebar,
  setShowToday,
  setShowCouple,
  setCurrentId,
  setEditing,
}: UseMainAppSaveArgs): MainAppSave {
  const { settings, saveToServer, loaded } = useSettingsStore();

  useEffect(() => {
    if (!isLoggedIn || !loaded) return;
    void saveToServer();
  }, [isLoggedIn, loaded, settings, saveToServer]);

  const openAdd = useCallback(() => {
    if (!canAdd) {
      toast.error("무료 플랜에서는 명식 1개만 등록할 수 있어요.");
      return;
    }
    setWizardOpen(true);
  }, [canAdd, setWizardOpen]);

  const openCustomModal = useCallback(() => {
    if (!canAdd) {
      toast.error("무료 플랜에서는 명식 1개만 등록할 수 있어요.");
      return;
    }
    setOpenCustom(true);
  }, [canAdd, setOpenCustom]);

  const handleSidebarView = useCallback(
    (m: MyeongSik) => {
      setCurrentId(m.id);
      setShowSidebar(false);
      setShowToday(false);
      setShowCouple(false);

      const todayNoon = new Date();
      todayNoon.setHours(12, 0, 0, 0);
      useLuckPickerStore.getState().setDate(todayNoon);

      if (hasCurrent && current?.id === m.id) {
        setShowToday(false);
        setShowCouple(false);
        setShowSidebar(false);
      }
    },
    [current, hasCurrent, setCurrentId, setShowSidebar, setShowToday, setShowCouple]
  );

  const handleSidebarEdit = useCallback(
    (m: MyeongSik) => {
      setEditing(m);
      setCurrentId(m.id);
      setShowSidebar(false);
      setShowToday(false);
      setShowCouple(false);
    },
    [setEditing, setCurrentId, setShowSidebar, setShowToday, setShowCouple]
  );

  const handleSidebarDeleteView = useCallback(() => {
    const nextId = useMyeongSikStore.getState().list[0]?.id ?? "";
    setCurrentId(nextId);
    setShowToday(true);
    setShowCouple(false);
  }, [setCurrentId, setShowToday, setShowCouple]);

  const handleWizardSave = useCallback(
    (m: MyeongSik) => {
      setCurrentId(m.id);
      setShowToday(false);
      setShowCouple(false);
      setShowSidebar(false);
      requestAnimationFrame(() => setWizardOpen(false));
    },
    [setCurrentId, setShowToday, setShowCouple, setShowSidebar, setWizardOpen]
  );

  const handleCustomSave = useCallback(
    (m: MyeongSik) => {
      setCurrentId(m.id);
      setShowToday(false);
      setShowCouple(false);
      setShowSidebar(false);
    },
    [setCurrentId, setShowToday, setShowCouple, setShowSidebar]
  );

  return {
    openAdd,
    openCustomModal,
    handleSidebarView,
    handleSidebarEdit,
    handleSidebarDeleteView,
    handleWizardSave,
    handleCustomSave,
  };
}
