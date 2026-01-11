import type { MyeongSik } from "@/shared/lib/storage";
import { buildMyeongSik } from "@/myeongsik/calc";
import { normalizeFolderValue, UNASSIGNED_LABEL } from "@/sidebar/calc/folderModel";
import type { FormState } from "../model/types";
import { validateForm } from "../calc/validation";
import { FOLDER_PRESETS } from "../calc/folderOptions";
import { writeCustomFolders } from "../saveInterface/folderStorage";

type Args = {
  item: MyeongSik;
  form: FormState;
  unknownTime: boolean;
  unknownPlace: boolean;
  customFolders: string[];
  setCustomFolders: (next: string[]) => void;
  update: (id: string, payload: Partial<MyeongSik>) => void;
  remove: (id: string) => void;
  onClose?: () => void;
  onSaved?: () => void;
};

export function useMyeongSikEditorSave({
  item,
  form,
  unknownTime,
  unknownPlace,
  customFolders,
  setCustomFolders,
  update,
  remove,
  onClose,
  onSaved,
}: Args) {
  const save = () => {
    const err = validateForm(form, unknownTime, unknownPlace);
    if (err) {
      alert(err);
      return;
    }

    const normalizedFolder = normalizeFolderValue(
      form.folder === UNASSIGNED_LABEL ? undefined : form.folder
    );

    const result = buildMyeongSik(
      {
        id: item.id,
        name: form.name,
        birthDay: form.birthDay ?? "",
        calendarType: form.calendarType ?? "solar",
        birthTime: form.birthTime,
        unknownTime,
        gender: form.gender,
        birthPlace: form.birthPlace,
        unknownPlace,
        relationship: form.relationship,
        memo: form.memo,
        folder: normalizedFolder,
        mingSikType: form.mingSikType,
        favorite: item.favorite,
        deletedAt: item.deletedAt ?? null,
        sortOrder: item.sortOrder,
        dateObj: item.dateObj,
      },
      { requireName: true }
    );

    if (!result.ok) {
      alert(result.message);
      return;
    }

    const payload: Partial<MyeongSik> = { ...item, ...result.value };

    if (
      payload.folder &&
      !FOLDER_PRESETS.includes(payload.folder as (typeof FOLDER_PRESETS)[number]) &&
      !customFolders.includes(payload.folder)
    ) {
      const next = [...customFolders, payload.folder];
      setCustomFolders(next);
      writeCustomFolders(next);
    }

    update(item.id, payload);
    onSaved?.();
    onClose?.();
  };

  const removeThis = () => {
    if (confirm(`'${item.name}' 명식을 삭제할까요?`)) remove(item.id);
  };

  return {
    save,
    removeThis,
  };
}
