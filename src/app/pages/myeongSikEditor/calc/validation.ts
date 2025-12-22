import type { CalendarType } from "@/shared/type";
import { validateBirthDayInput, validateBirthTimeInput } from "@/shared/domain/meongsik";
import type { FormState } from "../model/types";

export function validateForm(
  form: FormState,
  unknownTime: boolean,
  unknownPlace: boolean
): string | null {
  if (!form.name || form.name.trim() === "") return "이름을 입력해주세요.";

  const dayR = validateBirthDayInput(form.birthDay ?? "", (form.calendarType ?? "solar") as CalendarType);
  if (!dayR.ok) return dayR.message;

  const timeR = validateBirthTimeInput(form.birthTime ?? "", unknownTime);
  if (!timeR.ok) return timeR.message;

  if (!unknownPlace && !form.birthPlace)
    return "태어난 지역을 선택하거나 '모름'을 체크해주세요.";

  return null;
}
