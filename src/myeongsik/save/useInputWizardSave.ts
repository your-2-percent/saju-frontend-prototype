import { useCallback, type KeyboardEventHandler } from "react";
import { useMyeongSikRepo } from "../saveInterface/useMyeongSikRepo";
import { buildMyeongSikPayload } from "../save/buildMyeongSikPayload";
import { validateStepInput } from "../calc/inputWizardValidation";
import { DEFAULT_FORM, type FormState, type StepKey } from "../calc/inputWizardConfig";
import type { InputWizardProps } from "../calc/inputWizardConfig";

type UseInputWizardSaveArgs = {
  form: FormState;
  setForm: (next: FormState) => void;
  stepIndex: number;
  setStepIndex: (next: number) => void;
  stepsLength: number;
  currentStepKey: StepKey;
  unknownTime: boolean;
  setUnknownTime: (next: boolean) => void;
  unknownPlace: boolean;
  setUnknownPlace: (next: boolean) => void;
  setToast: (msg: string | null) => void;
  onSave: InputWizardProps["onSave"];
};

type InputWizardSave = {
  handleNext: () => void;
  handleFormKeyDown: KeyboardEventHandler<HTMLFormElement>;
};

export function useInputWizardSave({
  form,
  setForm,
  stepIndex,
  setStepIndex,
  stepsLength,
  currentStepKey,
  unknownTime,
  setUnknownTime,
  unknownPlace,
  setUnknownPlace,
  setToast,
  onSave,
}: UseInputWizardSaveArgs): InputWizardSave {
  const { add } = useMyeongSikRepo();

  const handleNext = useCallback(() => {
    const validation = validateStepInput(currentStepKey, form, unknownTime, unknownPlace);
    if (!validation.ok) {
      setToast(validation.message ?? "입력값을 확인해주세요.");
      return;
    }
    if (validation.nextForm) {
      setForm(validation.nextForm);
      if (validation.message) setToast(validation.message);
    }

    if (stepIndex < stepsLength - 1) {
      setStepIndex(stepIndex + 1);
      return;
    }

    const result = buildMyeongSikPayload(form, unknownTime, unknownPlace);
    if (!result.ok) {
      setToast(result.message);
      return;
    }

    const payload = result.value;
    add(payload);
    onSave(payload);

    setToast("입력 완료!");
    setForm({ ...DEFAULT_FORM });
    setUnknownTime(false);
    setUnknownPlace(false);
    setStepIndex(0);
  }, [
    currentStepKey,
    form,
    unknownTime,
    unknownPlace,
    setToast,
    setForm,
    stepIndex,
    stepsLength,
    setStepIndex,
    add,
    onSave,
    setUnknownTime,
    setUnknownPlace,
  ]);

  const handleFormKeyDown: KeyboardEventHandler<HTMLFormElement> = useCallback(
    (e) => {
      if (e.key !== "Enter") return;

      const target = e.target as HTMLElement;
      const role = target.getAttribute("role");
      if (role === "radio" || role === "checkbox") return;

      const modal = document.getElementById("mapModal");
      if (modal && modal.contains(target)) return;

      const tag = target.tagName.toLowerCase();
      const type = target instanceof HTMLInputElement ? target.type : "";

      if (tag === "textarea") {
        if (e.shiftKey) return;
        e.preventDefault();
        handleNext();
        return;
      }

      if (type === "radio" || type === "checkbox") {
        e.preventDefault();
        if (target instanceof HTMLInputElement) target.click();
        return;
      }

      if (tag === "button" && (target as HTMLButtonElement).type !== "submit") {
        return;
      }

      e.preventDefault();
      handleNext();
    },
    [handleNext]
  );

  return { handleNext, handleFormKeyDown };
}
