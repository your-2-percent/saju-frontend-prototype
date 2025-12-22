import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";

export type Stem = "갑" | "을" | "병" | "정" | "무" | "기" | "경" | "신" | "임" | "계";
export type Branch = "자" | "축" | "인" | "묘" | "진" | "사" | "오" | "미" | "신" | "유" | "술" | "해";

export type HourRule = "자시" | "인시";

export type Pillars = {
  yearStem?: Stem;  yearBranch?: Branch;
  monthStem?: Stem; monthBranch?: Branch;
  dayStem?: Stem;   dayBranch?: Branch;
  hourStem?: Stem;  hourBranch?: Branch;
};

export type MatchRow = {
  date: string;
  year: string;
  month: string;
  day: string;
  hour: string;
  hourSlots: { branch: Branch; time: string }[];
};

export type CalendarType = "solar" | "lunar";
export type FormState = Partial<MyeongSik> & { calendarType: CalendarType };

export type { DayBoundaryRule };
