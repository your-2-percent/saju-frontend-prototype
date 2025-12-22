import { validateBirthDayInput, validateBirthTimeInput } from "@/shared/domain/meongsik";
import type { FormState, StepKey } from "./inputWizardConfig";

type ValidationResult = {
  ok: boolean;
  message?: string;
  nextForm?: FormState;
};

export function validateStepInput(
  stepKey: StepKey,
  form: FormState,
  unknownTime: boolean,
  unknownPlace: boolean
): ValidationResult {
  if (stepKey === "name") {
    if (!form.name) {
      return {
        ok: true,
        message: "이름이 없으면 '이름없음'으로 저장됩니다.",
        nextForm: { ...form, name: "이름없음" },
      };
    }
  }

  if (stepKey === "birthDay") {
    const r = validateBirthDayInput(form.birthDay ?? "", form.calendarType ?? "solar");
    if (!r.ok) {
      return { ok: false, message: r.message };
    }
    if (form.birthDay !== r.value) {
      return { ok: true, nextForm: { ...form, birthDay: r.value } };
    }
  }

  if (stepKey === "birthTime") {
    const r = validateBirthTimeInput(form.birthTime ?? "", unknownTime);
    if (!r.ok) {
      return { ok: false, message: r.message };
    }
    if (r.value !== "모름" && form.birthTime !== r.value) {
      return { ok: true, nextForm: { ...form, birthTime: r.value } };
    }
  }

  if (stepKey === "birthPlace") {
    if (!form.birthPlace && !unknownPlace) {
      return { ok: false, message: "출생지를 선택하거나 '모름'을 체크해야 합니다." };
    }
  }

  return { ok: true };
}
