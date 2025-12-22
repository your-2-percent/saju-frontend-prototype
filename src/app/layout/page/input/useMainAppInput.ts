import { useState, type Dispatch, type SetStateAction } from "react";
import type { MyeongSik } from "@/shared/lib/storage";

type MainAppInput = {
  currentId: string;
  setCurrentId: Dispatch<SetStateAction<string>>;
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

export function useMainAppInput(list: MyeongSik[]): MainAppInput {
  const [currentId, setCurrentId] = useState<string>(() => (list.length > 0 ? list[0].id : ""));
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
