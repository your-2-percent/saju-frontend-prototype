import { useMemo } from "react";
import { isDST } from "@/shared/lib/core/timeCorrection";
import { buildLunarPreview } from "../calc/lunarPreview";
import { displayValue as displayValueCalc } from "../calc/displayValue";
import {
  CALENDAR_OPTIONS,
  GENDER_OPTIONS,
  MING_OPTIONS,
  steps,
  focusById,
  nextIndex,
  type FormState,
  type StepKey,
} from "../calc/inputWizardConfig";

type UseInputWizardCalcArgs = {
  form: FormState;
  unknownTime: boolean;
  unknownPlace: boolean;
  stepIndex: number;
};

type InputWizardCalc = {
  steps: typeof steps;
  currentStep: (typeof steps)[number];
  lunarPreview: string | null;
  displayValue: (key: StepKey) => string;
  CALENDAR_OPTIONS: typeof CALENDAR_OPTIONS;
  MING_OPTIONS: typeof MING_OPTIONS;
  GENDER_OPTIONS: typeof GENDER_OPTIONS;
  nextIndex: typeof nextIndex;
  focusById: typeof focusById;
  isDST: typeof isDST;
};

export function useInputWizardCalc({
  form,
  unknownTime,
  unknownPlace,
  stepIndex,
}: UseInputWizardCalcArgs): InputWizardCalc {
  const currentStep = steps[stepIndex];

  const lunarPreview = useMemo(
    () => buildLunarPreview(form.calendarType, form.birthDay),
    [form.calendarType, form.birthDay]
  );

  const displayValue = (key: StepKey) =>
    displayValueCalc(key, form, unknownTime, unknownPlace);

  return {
    steps,
    currentStep,
    lunarPreview,
    displayValue,
    CALENDAR_OPTIONS,
    MING_OPTIONS,
    GENDER_OPTIONS,
    nextIndex,
    focusById,
    isDST,
  };
}
