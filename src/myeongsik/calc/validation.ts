import type { CalendarType } from "@/shared/type";
import { validateBirthDayInput, validateBirthTimeInput } from "@/myeongsik/calc";
import type { FormState } from "../model/types";

export function validateForm(
  form: FormState,
  unknownTime: boolean,
  unknownPlace: boolean
): string | null {
  if (!form.name || form.name.trim() === "") return "이름미지정";

  const dayR = validateBirthDayInput(form.birthDay ?? "", (form.calendarType ?? "solar") as CalendarType);
  if (!dayR.ok) return dayR.message;

  const timeR = validateBirthTimeInput(form.birthTime ?? "", unknownTime);
  if (!timeR.ok) return timeR.message;

  if (!unknownPlace && !form.birthPlace)
    return "출생지미지정";

  return null;
}
