import type { FormState, StepKey } from "./inputWizardConfig";
import { UNASSIGNED_LABEL } from "@/features/sidebar/model/folderModel";

export function displayValue(
  key: StepKey,
  form: FormState,
  unknownTime: boolean,
  unknownPlace: boolean
): string {
  switch (key) {
    case "birthPlace":
      return unknownPlace ? "모름" : form.birthPlace?.name || "";
    case "birthTime":
      return unknownTime ? "모름" : form.birthTime || "";
    case "folder":
      return form.folder ? String(form.folder) : UNASSIGNED_LABEL;
    default: {
      const rec = form as Record<string, unknown>;
      const v = rec[key];
      return typeof v === "string" ? v : v != null ? String(v) : "";
    }
  }
}
