// features/prompt/multi/sections/wolMonthSections.ts
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import type { LuckChain, UnifiedPowerResult } from "@/features/AnalysisReport/utils/unifiedPower";
import type { Element } from "@/features/AnalysisReport/utils/types";
import { getYearGanZhi, getMonthGanZhi } from "@/shared/domain/간지/공통";
import type { DaewoonInfo } from "../types";
import { findDaeForMonthMulti, findDaeForYearMulti, findSeForMonthMulti, resolveSeYear } from "../luckLookup";
import type { LuckShowToggles, ShinsalSettings } from "../buildLuckBlock";
import { buildLuckBlock } from "../buildLuckBlock";
import { sectionPlain } from "../sectionUtils";

export function buildWolMonthSections(params: {
  wolMonths: string[];
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
    wolMonths,
    daeList,
    natal,
    basis,
    unified,
    dayEl,
    baseDayStem,
    show,
    shinsalSettings,
  } = params;

  if (wolMonths.length === 0) return [];

  const out: string[] = [];

  const daeUnion: DaewoonInfo[] = [];
  const seRepMap = new Map<string, { year: number; month: number }>();

  for (const ym of wolMonths) {
    const [y, m] = ym.split("-").map(Number);

    const daes = findDaeForMonthMulti(daeList, y, m);
    for (const d of daes) {
      if (!daeUnion.some((x) => x.gz === d.gz && x.startYear === d.startYear)) {
        daeUnion.push(d);
      }
    }

    const seYearsArr = resolveSeYear(y, m);
    const ses = findSeForMonthMulti(y, m);

    ses.forEach((se, idx) => {
      const seYear = seYearsArr[idx] ?? seYearsArr[seYearsArr.length - 1];
      if (!seRepMap.has(se)) {
        seRepMap.set(se, { year: seYear, month: m });
      }
    });
  }

  const [refYear] = wolMonths[0].split("-").map(Number);
  const seGZRef = getYearGanZhi(new Date(refYear, 5, 15));
  const seNormRef = normalizeGZ(seGZRef || "");

  // (4-1) 월운 탭 상단: 대운 요약
  if (daeUnion.length > 0) {
    const daeSectionData = {
      대운: daeUnion.map((daa) => {
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

  // (4-2) 월운 탭 상단: 세운 요약
  const seKeys = Array.from(seRepMap.keys());
  if (seKeys.length > 0) {
    const seSectionData = {
      세운: seKeys.map((se) => {
        const rep = seRepMap.get(se)!;
        const y = rep.year;

        const daesForSeYear = findDaeForYearMulti(daeList, y);
        const mainDaeForSe = daesForSeYear[0] ?? daeUnion[0] ?? null;

        const seChain: LuckChain = {
          dae: mainDaeForSe ? mainDaeForSe.gz : null,
          se,
          wol: null,
          il: null,
        };

        return buildLuckBlock({
          scope: "세운",
          infoText: `${y}년 ${se}`,
          gz: se,
          chain: seChain,
          natal,
          relationArgs: {
            daewoon: mainDaeForSe?.gz,
            sewoon: se,
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

    out.push(sectionPlain("세운", seSectionData));
  }

  // (4-3) 월운 리스트 (각 월별)
  for (const ym of wolMonths) {
    const [y, m] = ym.split("-").map(Number);
    const date = new Date(y, m - 1, 15);
    const wolGZ = getMonthGanZhi(date);

    const daes = findDaeForMonthMulti(daeList, y, m);
    const mainDae = daes.length > 0 ? daes[0] : null;

    const ses = findSeForMonthMulti(y, m);
    const mainSe = ses.length > 0 ? ses[ses.length - 1] : "";

    const wolNorm = normalizeGZ(wolGZ || "");

    const chain: LuckChain = {
      dae: mainDae ? mainDae.gz : null,
      se: mainSe || null,
      wol: wolNorm,
      il: null,
    };

    const wolBlock = buildLuckBlock({
      scope: "월운",
      infoText: `${ym} ${wolNorm}`,
      gz: wolNorm,
      chain,
      natal,
      relationArgs: {
        daewoon: mainDae?.gz,
        sewoon: mainSe || undefined,
        wolwoon: wolNorm,
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

    out.push(sectionPlain(`월운 ${ym}`, { 월운: wolBlock }));
  }

  return out.filter((s) => s.trim().length > 0);
}
