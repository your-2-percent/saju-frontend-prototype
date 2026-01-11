// features/prompt/multi/types.ts
import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import type { ShinsalBasis } from "@/analysisReport/calc/logic/shinsal";
import type { ShinCategory } from "@/analysisReport/calc/logic/shinStrength";
import type { UnifiedPowerResult } from "@/analysisReport/calc/utils/unifiedPower";
import type { MainCategoryKey, SubCategoryKey, TimeMode, RelationMode } from "../buildPrompt";
import type { PromptSectionToggles } from "../promptSectionToggles";

export type DaewoonInfo = {
  gz: string;
  age: number;
  startYear: number;
  startMonth: number;
  startDay: number;
  endYear: number;
};

export type MultiPromptInput = {
  ms: MyeongSik;
  natal: Pillars4;
  basis?: ShinsalBasis;
  includeTenGod?: boolean;
  unified: UnifiedPowerResult;
  percent: number;
  category: ShinCategory;

  selectedDaeList: DaewoonInfo[];
  daeList: DaewoonInfo[];
  seYears: number[];
  wolMonths: string[];
  ilDays: string[];

  topic?: MainCategoryKey;
  subTopic?: SubCategoryKey;
  timeMode?: TimeMode;

  relationMode?: RelationMode;
  partnerMs?: MyeongSik | null;

  teacherMode?: boolean;
  friendMode?: boolean;
  sections?: PromptSectionToggles;
};
