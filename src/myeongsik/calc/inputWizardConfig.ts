import type { MyeongSik } from "@/shared/lib/storage";
import type { CalendarType } from "@/shared/type";

export const steps = [
  { key: "name", label: "이름", placeholder: "이름을 입력하세요", type: "text" },
  { key: "birthDay", label: "생년월일", placeholder: "예: 19900101", type: "tel" },
  { key: "birthTime", label: "출생시간", placeholder: "예: 1524", type: "tel" },
  { key: "mingSikType", label: "명식 기준", type: "mingrule" },
  { key: "gender", label: "성별", type: "radio" },
  { key: "birthPlace", label: "출생지", type: "place" },
  { key: "relationship", label: "관계", type: "relationship" },
  { key: "folder", label: "폴더 선택", type: "folder" },
  { key: "memo", label: "메모", placeholder: "메모를 입력하세요", type: "textarea" },
] as const;

export type StepKey = (typeof steps)[number]["key"];

export type InputWizardProps = { onSave: (data: MyeongSik) => void; onClose: VoidFunction };

export type FormState = Partial<MyeongSik> & { calendarType: CalendarType };

export const CALENDAR_OPTIONS = [
  { value: "solar" as const, label: "양력", id: "calendarType_solar" },
  { value: "lunar" as const, label: "음력", id: "calendarType_lunar" },
];

export const MING_OPTIONS = ["자시", "조자시/야자시", "인시"] as const;
export type MingType = (typeof MING_OPTIONS)[number];

export const GENDER_OPTIONS = ["남자", "여자"] as const;
export type GenderType = (typeof GENDER_OPTIONS)[number];

export const DEFAULT_FORM: FormState = {
  gender: "남자",
  mingSikType: "조자시/야자시",
  DayChangeRule: "자시일수론",
  calendarType: "solar",
};

export function nextIndex(cur: number, len: number, key: string) {
  if (key === "ArrowRight" || key === "ArrowDown") return (cur + 1) % len;
  if (key === "ArrowLeft" || key === "ArrowUp") return (cur - 1 + len) % len;
  if (key === "Home") return 0;
  if (key === "End") return len - 1;
  return cur;
}

export function focusById(id: string) {
  const el = document.getElementById(id);
  if (el instanceof HTMLElement) el.focus();
}
