// features/prompt/multi/sections/seYearSections.ts
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import type { LuckChain, UnifiedPowerResult } from "@/features/AnalysisReport/utils/unifiedPower";
import type { Element } from "@/features/AnalysisReport/utils/types";
import { getYearGanZhi } from "@/shared/domain/간지/공통";
import type { DaewoonInfo } from "../types";
import { findDaeForYearMulti, findDaeForYearRangeMulti } from "../luckLookup";
import type { LuckShowToggles, ShinsalSettings } from "../buildLuckBlock";
import { buildLuckBlock } from "../buildLuckBlock";
import { sectionPlain } from "../sectionUtils";

export function buildSeYearSections(params: {
  seYears: number[];
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
    seYears,
    daeList,
    natal,
    basis,
    unified,
    dayEl,
    baseDayStem,
    show,
    shinsalSettings,
  } = params;

  if (seYears.length === 0) return [];

  const out: string[] = [];

  const rangeStartYear = seYears[0];
  const rangeEndYear = seYears[seYears.length - 1];

  const daesForRange = findDaeForYearRangeMulti(daeList, rangeStartYear, rangeEndYear);

  // (3-1) 세운 탭 상단: 대운 요약
  if (daesForRange.length > 0) {
    const refYear = rangeStartYear;
    const seGZRef = getYearGanZhi(new Date(refYear, 5, 15));
    const seNormRef = normalizeGZ(seGZRef || "");

    const daeSectionData = {
      대운: daesForRange.map((daa) => {
        const daeChain: LuckChain = {
          dae: daa.gz,
          se: seNormRef || null,
          wol: null,
          il: null,
        };

        return buildLuckBlock({
          scope: "대운",
          infoText: `${daa.age}대운 ${daa.gz} (${daa.startYear}~${daa.endYear})`,
          gz: daa.gz,
          chain: daeChain,
          natal,
          relationArgs: {
            daewoon: daa.gz,
            sewoon: seNormRef || undefined,
            wolwoon: undefined,
            ilwoon: undefined,
          },
          basis,
          unified,
          dayEl,
          baseDayStem,
          show,
          shinsalSettings,
          harmonyMode: "scope",
          includeBasicInfo: true,
        });
      }),
    };

    out.push(sectionPlain("대운", daeSectionData));
  }

  // (3-2) 세운 연도별 리스트
  for (const year of seYears) {
    const seGZ = getYearGanZhi(new Date(year, 5, 15));
    const daesAtYear = findDaeForYearMulti(daeList, year);
    const mainDaeForYear = daesAtYear.length > 0 ? daesAtYear[0] : null;

    const seNorm = normalizeGZ(seGZ || "");

    const chain: LuckChain = {
      dae: mainDaeForYear ? mainDaeForYear.gz : null,
      se: seNorm || null,
      wol: null,
      il: null,
    };

    const seBlock = buildLuckBlock({
      scope: "세운",
      infoText: `${year}년 ${seNorm}`,
      gz: seNorm,
      chain,
      natal,
      relationArgs: {
        daewoon: mainDaeForYear?.gz,
        sewoon: seNorm || undefined,
        wolwoon: undefined,
        ilwoon: undefined,
      },
      basis,
      unified,
      dayEl,
      baseDayStem,
      show,
      shinsalSettings,
      harmonyMode: "scope",
      includeBasicInfo: true,
    });

    out.push(sectionPlain(`세운 ${year}`, { 세운: seBlock }));
  }

  return out.filter((s) => s.trim().length > 0);
}
