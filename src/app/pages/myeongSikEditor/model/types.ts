import type { MyeongSik } from "@/shared/lib/storage";
import type { CalendarType } from "@/shared/type";

export type FormState = Partial<MyeongSik> & { calendarType: CalendarType };
