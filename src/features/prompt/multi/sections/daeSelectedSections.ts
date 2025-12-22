// features/prompt/multi/sections/daeSelectedSections.ts
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import type { UnifiedPowerResult, LuckChain } from "@/features/AnalysisReport/utils/unifiedPower";
import type { Element } from "@/features/AnalysisReport/utils/types";
import type { DaewoonInfo } from "../types";
import type { LuckShowToggles, ShinsalSettings } from "../buildLuckBlock";
import { buildLuckBlock } from "../buildLuckBlock";
import { sectionPlain } from "../sectionUtils";

export function buildSelectedDaeSections(params: {
  selectedDaeList: DaewoonInfo[];
  daeList: DaewoonInfo[];
  natal: Pillars4;
  basis?: ShinsalBasis;
  unified: UnifiedPowerResult;
  dayEl: Element;
  baseDayStem: string;
  show: LuckShowToggles;
  shinsalSettings: ShinsalSettings;
}): string[] {
  const {
    selectedDaeList,
    daeList,
    natal,
    basis,
    unified,
    dayEl,
    baseDayStem,
    show,
    shinsalSettings,
  } = params;

  if (daeList.length === 0 || selectedDaeList.length === 0) return [];

  const out: string[] = [];

  for (const dae of selectedDaeList) {
    const chain: LuckChain = { dae: dae.gz, se: null, wol: null, il: null };

    const data = buildLuckBlock({
      scope: "대운",
      infoText: `${dae.age}대운 ${dae.gz} (${dae.startYear}~${dae.endYear})`,
      gz: dae.gz,
      chain,
      natal,
      relationArgs: {
        daewoon: dae.gz,
        sewoon: undefined,
        wolwoon: undefined,
        ilwoon: undefined,
      },
      basis,
      unified,
      dayEl,
      baseDayStem,
      show,
      shinsalSettings,
      harmonyMode: "full",
      includeBasicInfo: false,
    });

    out.push(sectionPlain(`${dae.age}대운 ${dae.gz} (${dae.startYear}~${dae.endYear})`, data));
  }

  return out.filter((s) => s.trim().length > 0);
}
