import { v4 as uuidv4 } from "uuid";
import { buildMyeongSik } from "@/myeongsik/calc";
import { normalizeFolderValue } from "@/sidebar/calc/folderModel";
import type { FormState } from "../calc/inputWizardConfig";

export function buildMyeongSikPayload(
  form: FormState,
  unknownTime: boolean,
  unknownPlace: boolean
) {
  const folderVal = normalizeFolderValue(form.folder);

  return buildMyeongSik(
    {
      id: uuidv4(),
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
      folder: folderVal,
      mingSikType: form.mingSikType,
      dateObj: form.dateObj || new Date(),
    },
    { requireName: false }
  );
}
