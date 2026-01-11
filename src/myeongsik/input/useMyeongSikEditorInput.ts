import { useEffect, useState } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { FormState } from "../model/types";
import { buildInitialForm, getUnknownPlace, getUnknownTime } from "../calc/formDerive";
import { readCustomFolders } from "../saveInterface/folderStorage";

export function useMyeongSikEditorInput(item: MyeongSik) {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => buildInitialForm(item));
  const [unknownTime, setUnknownTime] = useState(getUnknownTime(item));
  const [unknownPlace, setUnknownPlace] = useState(getUnknownPlace(item));
  const [customFolders, setCustomFolders] = useState<string[]>([]);

  useEffect(() => {
    setCustomFolders(readCustomFolders());
  }, []);

  const resetForm = () => {
    setForm(buildInitialForm(item));
    setUnknownTime(getUnknownTime(item));
    setUnknownPlace(getUnknownPlace(item));
  };

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  return {
    isEditing,
    setIsEditing,
    form,
    setForm,
    updateForm,
    unknownTime,
    setUnknownTime,
    unknownPlace,
    setUnknownPlace,
    customFolders,
    setCustomFolders,
    resetForm,
  };
}
