// features/prompt/multi/sections/seYearSections.ts
import { normalizeGZ } from "@/analysisReport/calc/logic/relations";
import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import type { ShinsalBasis } from "@/analysisReport/calc/logic/shinsal";
import type { LuckChain, UnifiedPowerResult } from "@/analysisReport/calc/utils/unifiedPower";
import type { Element } from "@/analysisReport/calc/utils/types";
import { getYearGanZhi } from "@/shared/domain/ganji/common";
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

  // ✅ 혹시 seYears에 중복이 섞여 들어오면 바로 정리
  const years = Array.from(new Set(seYears)).sort((a, b) => a - b);

  const out: string[] = [];

  const rangeStartYear = years[0];
  const rangeEndYear = years[years.length - 1];

  const daesForRange = findDaeForYearRangeMulti(daeList, rangeStartYear, rangeEndYear);

  // (3-1) 세운 탭 상단: 대운 요약
  if (daesForRange.length > 0) {
    const refYear = rangeStartYear;

    // ✅ 입춘 이슈 피하려고 6월 기준으로 고정(정상)
    const seGZRef = getYearGanZhi(new Date(refYear, 5, 15, 12, 0, 0));
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
  for (const year of years) {
    // ✅ 입춘 경계 피하는 기준일(6/15 정오)
    const seDate = new Date(year, 5, 15, 12, 0, 0);
    const seGZ = getYearGanZhi(seDate);

    const daesAtYear = findDaeForYearMulti(daeList, year);
    const mainDaeForYear = daesAtYear.length > 0 ? daesAtYear[0] : null;

    const seNorm = normalizeGZ(seGZ || "");

    // ✅ 여기서 resolveYearIndex 쓰지 마: 이미 year 자체가 “세운 연도 인덱스”임
    const displayYear = year;
    const chain: LuckChain = {
      dae: mainDaeForYear ? mainDaeForYear.gz : null,
      se: seNorm || null,
      wol: null,
      il: null,
    };

    const seBlock = buildLuckBlock({
      scope: "세운",
      infoText: `${displayYear}년 ${seNorm}`,
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

    out.push(sectionPlain(`세운 ${displayYear}`, { 세운: seBlock }));
  }

  return out.filter((s) => s.trim().length > 0);
}