import type { KeyboardEventHandler } from "react";
import { useInputWizardInput } from "./useInputWizardInput";
import { useInputWizardFocus } from "./useInputWizardFocus";
import { useInputWizardCalc } from "../calc/useInputWizardCalc";
import { useInputWizardSave } from "../save/useInputWizardSave";
import { type InputWizardProps, steps, type StepKey } from "../calc/inputWizardConfig";

type InputWizardModel = {
  steps: typeof steps;
  stepIndex: number;
  setStepIndex: (idx: number) => void;
  currentStep: (typeof steps)[number];
  form: ReturnType<typeof useInputWizardInput>["form"];
  setForm: ReturnType<typeof useInputWizardInput>["setForm"];
  toast: string | null;
  setToast: (msg: string | null) => void;
  unknownTime: boolean;
  setUnknownTime: (next: boolean) => void;
  unknownPlace: boolean;
  setUnknownPlace: (next: boolean) => void;
  lunarPreview: string | null;
  handleNext: () => void;
  handleFormKeyDown: KeyboardEventHandler<HTMLFormElement>;
  displayValue: (key: StepKey) => string;
  CALENDAR_OPTIONS: ReturnType<typeof useInputWizardCalc>["CALENDAR_OPTIONS"];
  MING_OPTIONS: ReturnType<typeof useInputWizardCalc>["MING_OPTIONS"];
  GENDER_OPTIONS: ReturnType<typeof useInputWizardCalc>["GENDER_OPTIONS"];
  nextIndex: ReturnType<typeof useInputWizardCalc>["nextIndex"];
  focusById: ReturnType<typeof useInputWizardCalc>["focusById"];
  isDST: ReturnType<typeof useInputWizardCalc>["isDST"];
};

export function useInputWizardModel({ onSave }: Pick<InputWizardProps, "onSave">): InputWizardModel {
  const input = useInputWizardInput();

  const calc = useInputWizardCalc({
    form: input.form,
    unknownTime: input.unknownTime,
    unknownPlace: input.unknownPlace,
    stepIndex: input.stepIndex,
  });

  useInputWizardFocus({
    currentStepKey: calc.currentStep.key,
    birthPlace: input.form.birthPlace,
    unknownPlace: input.unknownPlace,
    stepIndex: input.stepIndex,
  });

  const save = useInputWizardSave({
    form: input.form,
    setForm: input.setForm,
    stepIndex: input.stepIndex,
    setStepIndex: input.setStepIndex,
    stepsLength: calc.steps.length,
    currentStepKey: calc.currentStep.key,
    unknownTime: input.unknownTime,
    setUnknownTime: input.setUnknownTime,
    unknownPlace: input.unknownPlace,
    setUnknownPlace: input.setUnknownPlace,
    setToast: input.setToast,
    onSave,
  });

  return {
    steps: calc.steps,
    stepIndex: input.stepIndex,
    setStepIndex: input.setStepIndex,
    currentStep: calc.currentStep,
    form: input.form,
    setForm: input.setForm,
    toast: input.toast,
    setToast: input.setToast,
    unknownTime: input.unknownTime,
    setUnknownTime: input.setUnknownTime,
    unknownPlace: input.unknownPlace,
    setUnknownPlace: input.setUnknownPlace,
    lunarPreview: calc.lunarPreview,
    handleNext: save.handleNext,
    handleFormKeyDown: save.handleFormKeyDown,
    displayValue: calc.displayValue,
    CALENDAR_OPTIONS: calc.CALENDAR_OPTIONS,
    MING_OPTIONS: calc.MING_OPTIONS,
    GENDER_OPTIONS: calc.GENDER_OPTIONS,
    nextIndex: calc.nextIndex,
    focusById: calc.focusById,
    isDST: calc.isDST,
  };
}
