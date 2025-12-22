import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { FormState } from "../model/types";
import { buildFolderOptions } from "./folderOptions";
import { formatLunarPreview } from "./formDerive";

type Args = {
  list: MyeongSik[];
  customFolders: string[];
  form: FormState;
};

export function useMyeongSikEditorCalc({ list, customFolders, form }: Args) {
  const folderOptions = useMemo(
    () => buildFolderOptions(list, customFolders),
    [list, customFolders]
  );

  const lunarPreview = useMemo(
    () => formatLunarPreview(form.birthDay, form.calendarType),
    [form.birthDay, form.calendarType]
  );

  return {
    folderOptions,
    lunarPreview,
  };
}
