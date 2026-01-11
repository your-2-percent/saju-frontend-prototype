import type { DivinationRecord } from "@/iching/calc/ichingTypes";

export type PeriodCard = {
  key: string;
  title: string;
  dateYMD: string;
  record: DivinationRecord;
};
