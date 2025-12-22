import { useState, type Dispatch, type SetStateAction } from "react";
import { DEFAULT_FORM, type FormState } from "../calc/inputWizardConfig";

type InputWizardInput = {
  stepIndex: number;
  setStepIndex: Dispatch<SetStateAction<number>>;
  form: FormState;
  setForm: Dispatch<SetStateAction<FormState>>;
  toast: string | null;
  setToast: Dispatch<SetStateAction<string | null>>;
  unknownTime: boolean;
  setUnknownTime: Dispatch<SetStateAction<boolean>>;
  unknownPlace: boolean;
  setUnknownPlace: Dispatch<SetStateAction<boolean>>;
};

export function useInputWizardInput(): InputWizardInput {
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });
  const [toast, setToast] = useState<string | null>(null);
  const [unknownTime, setUnknownTime] = useState(false);
  const [unknownPlace, setUnknownPlace] = useState(false);

  return {
    stepIndex,
    setStepIndex,
    form,
    setForm,
    toast,
    setToast,
    unknownTime,
    setUnknownTime,
    unknownPlace,
    setUnknownPlace,
  };
}
