import { useState, type Dispatch, type SetStateAction } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";

type MainAppInput = {
  currentId: string | null;
  setCurrentId: (next: string | null) => void;
  wizardOpen: boolean;
  setWizardOpen: Dispatch<SetStateAction<boolean>>;
  showSidebar: boolean;
  setShowSidebar: Dispatch<SetStateAction<boolean>>;
  editing: MyeongSik | null;
  setEditing: Dispatch<SetStateAction<MyeongSik | null>>;
  showToday: boolean;
  setShowToday: Dispatch<SetStateAction<boolean>>;
  showCouple: boolean;
  setShowCouple: Dispatch<SetStateAction<boolean>>;
  openCustom: boolean;
  setOpenCustom: Dispatch<SetStateAction<boolean>>;
};

export function useMainAppInput(): MainAppInput {
  const currentId = useMyeongSikStore((s) => s.currentId);
  const setCurrentId = useMyeongSikStore((s) => s.setCurrentId);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [editing, setEditing] = useState<MyeongSik | null>(null);
  const [showToday, setShowToday] = useState(true);
  const [showCouple, setShowCouple] = useState(false);
  const [openCustom, setOpenCustom] = useState(false);

  return {
    currentId,
    setCurrentId,
    wizardOpen,
    setWizardOpen,
    showSidebar,
    setShowSidebar,
    editing,
    setEditing,
    showToday,
    setShowToday,
    showCouple,
    setShowCouple,
    openCustom,
    setOpenCustom,
  };
}
