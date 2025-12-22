import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";

export type BirthPlacePickerInput = {
  btnText: string;
  setBtnText: Dispatch<SetStateAction<string>>;
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  localValue: string;
  setLocalValue: Dispatch<SetStateAction<string>>;
  nameRef: React.RefObject<HTMLInputElement | null>;
  latRef: React.RefObject<HTMLInputElement | null>;
  lonRef: React.RefObject<HTMLInputElement | null>;
  triggerBtnRef: React.RefObject<HTMLButtonElement | null>;
};

type UseBirthPlacePickerInputArgs = {
  placeholderText: string;
  value?: string;
};

export function useBirthPlacePickerInput({
  placeholderText,
  value,
}: UseBirthPlacePickerInputArgs): BirthPlacePickerInput {
  const [btnText, setBtnText] = useState(placeholderText);
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState<string>(value ?? "");

  const nameRef = useRef<HTMLInputElement>(null);
  const latRef = useRef<HTMLInputElement>(null);
  const lonRef = useRef<HTMLInputElement>(null);
  const triggerBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (value !== undefined) setLocalValue(value);
  }, [value]);

  return {
    btnText,
    setBtnText,
    open,
    setOpen,
    localValue,
    setLocalValue,
    nameRef,
    latRef,
    lonRef,
    triggerBtnRef,
  };
}
