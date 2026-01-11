import { useEffect } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { StepKey } from "../calc/inputWizardConfig";

type UseInputWizardFocusArgs = {
  currentStepKey: StepKey;
  birthPlace?: MyeongSik["birthPlace"];
  unknownPlace: boolean;
  stepIndex: number;
};

export function useInputWizardFocus({
  currentStepKey,
  birthPlace,
  unknownPlace,
  stepIndex,
}: UseInputWizardFocusArgs) {
  useEffect(() => {
    if (["name", "birthDay", "birthTime", "memo"].includes(currentStepKey)) {
      const firstInput = document.querySelector<HTMLInputElement | HTMLTextAreaElement>(
        ".current-step input[type='text']:not([disabled]), .current-step textarea:not([disabled])"
      );
      if (firstInput) {
        firstInput.focus();
        return;
      }
    }

    if (currentStepKey === "mingSikType") {
      const sel = document.querySelector<HTMLElement>("[id^='ming_'][id$='_lbl'][aria-checked='true']");
      if (sel) {
        sel.focus();
        return;
      }
    }
    if (currentStepKey === "gender") {
      const sel = document.querySelector<HTMLElement>("[id^='gender_'][id$='_lbl'][aria-checked='true']");
      if (sel) {
        sel.focus();
        return;
      }
    }

    if (currentStepKey === "birthPlace") {
      if (birthPlace || unknownPlace) {
        const focusConfirm = () => {
          const btn = document.querySelector<HTMLButtonElement>(
            ".current-step form button[type='submit']"
          );
          if (btn) btn.focus();
        };
        focusConfirm();
        setTimeout(focusConfirm, 0);
      } else {
        const btn = document.getElementById("inputBirthPlaceBtn") as HTMLButtonElement | null;
        if (btn) btn.focus();
      }
      return;
    }

    if (currentStepKey === "relationship" || currentStepKey === "folder") {
      setTimeout(() => {
        const sel = document.querySelector<HTMLSelectElement>(".current-step select");
        if (sel) sel.focus();
      }, 0);
      return;
    }

    const fallback = document.querySelector<HTMLElement>(
      ".current-step button, .current-step [tabindex='0']"
    );
    fallback?.focus();
  }, [unknownPlace, stepIndex, currentStepKey, birthPlace]);
}
