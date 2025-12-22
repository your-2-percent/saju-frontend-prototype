// features/prompt/multi/sections/ilDaySections.ts
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import type { LuckChain, UnifiedPowerResult } from "@/features/AnalysisReport/utils/unifiedPower";
import type { Element } from "@/features/AnalysisReport/utils/types";
import { getMonthGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";
import type { DaewoonInfo } from "../types";
import { findDaeForMonthMulti, findSeForMonthMulti } from "../luckLookup";
import type { LuckShowToggles, ShinsalSettings } from "../buildLuckBlock";
import { buildLuckBlock } from "../buildLuckBlock";
import { sectionPlain } from "../sectionUtils";

export function buildIlDaySections(params: {
  ilDays: string[];
  daeList: DaewoonInfo[];
  natal: Pillars4;
  basis?: ShinsalBasis;
  unified: UnifiedPowerResult;
  dayEl: Element;
  baseDayStem: string;
  show: LuckShowToggles;
  shinsalSettings: ShinsalSettings;
  dayBoundaryRule: DayBoundaryRule;
}): string[] {
  const {
    ilDays,
    daeList,
    natal,
    basis,
    unified,
    dayEl,
    baseDayStem,
    show,
    shinsalSettings,
    dayBoundaryRule,
  } = params;

  if (ilDays.length === 0) return [];

  const out: string[] = [];

  // (5-1) 기준일(첫날)에서 상단 대운/세운/월운 요약
  const [y0, m0, d0] = ilDays[0].split("-").map(Number);
  const baseDate0 = new Date(y0, m0 - 1, d0, 4, 0);

  if (!Number.isNaN(baseDate0.getTime())) {
    const daes0 = findDaeForMonthMulti(daeList, y0, m0);
    const mainDae0 = daes0.length > 0 ? daes0[0] : null;

    const ses0 = findSeForMonthMulti(y0, m0);
    const mainSe0 = ses0.length > 0 ? ses0[ses0.length - 1] : "";

    const wolGZ0 = getMonthGanZhi(new Date(y0, m0 - 1, 15));
    const ilGZ0 = getDayGanZhi(baseDate0, dayBoundaryRule);

    const normWol0 = normalizeGZ(wolGZ0 || "");
    const normSe0 = normalizeGZ(mainSe0 || "");
    const normIl0 = normalizeGZ(ilGZ0 || "");

    // (5-1-a) 상단 대운
    if (mainDae0) {
      const daeChain0: LuckChain = {
        dae: mainDae0.gz,
        se: normSe0,
        wol: normWol0,
        il: normIl0,
      };

      const daeTop = buildLuckBlock({
        scope: "대운",
        infoText: `${mainDae0.age}대운 ${mainDae0.gz} (${mainDae0.startYear}~${mainDae0.endYear})`,
        gz: mainDae0.gz,
        chain: daeChain0,
        natal,
        relationArgs: {
          daewoon: mainDae0.gz,
          sewoon: normSe0,
          wolwoon: normWol0,
          ilwoon: normIl0,
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

      out.push(sectionPlain("대운", daeTop));
    }

    // (5-1-b) 상단 세운
    if (normSe0) {
      const seChain0: LuckChain = {
        dae: mainDae0 ? mainDae0.gz : null,
        se: normSe0,
        wol: normWol0,
        il: normIl0,
      };

      const seTop = buildLuckBlock({
        scope: "세운",
        infoText: `${y0}년 ${normSe0}`,
        gz: normSe0,
        chain: seChain0,
        natal,
        relationArgs: {
          daewoon: mainDae0?.gz,
          sewoon: normSe0,
          wolwoon: normWol0,
          ilwoon: normIl0,
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

      out.push(sectionPlain("세운", seTop));
    }

    // (5-1-c) 상단 월운
    if (normWol0) {
      const wolChain0: LuckChain = {
        dae: mainDae0 ? mainDae0.gz : null,
        se: normSe0,
        wol: normWol0,
        il: normIl0,
      };

      const wolTop = buildLuckBlock({
        scope: "월운",
        infoText: `${y0}-${String(m0).padStart(2, "0")} ${normWol0}`,
        gz: normWol0,
        chain: wolChain0,
        natal,
        relationArgs: {
          daewoon: mainDae0?.gz,
          sewoon: normSe0,
          wolwoon: normWol0,
          ilwoon: normIl0,
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

      out.push(sectionPlain("월운", wolTop));
    }
  }

  // (5-2) 날짜별 일운 상세섹션
  for (const dateStr of ilDays) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const baseDate = new Date(y, m - 1, d, 4, 0);
    if (Number.isNaN(baseDate.getTime())) continue;

    const daes = findDaeForMonthMulti(daeList, y, m);
    const mainDae = daes.length > 0 ? daes[0] : null;

    const ses = findSeForMonthMulti(y, m);
    const mainSe = ses.length > 0 ? ses[ses.length - 1] : "";

    const wolGZ = getMonthGanZhi(new Date(y, m - 1, 15));
    const ilGZ = getDayGanZhi(baseDate, dayBoundaryRule);

    const normWol = normalizeGZ(wolGZ || "");
    const normSe = normalizeGZ(mainSe || "");
    const normIl = normalizeGZ(ilGZ || "");

    const chain: LuckChain = {
      dae: mainDae ? mainDae.gz : null,
      se: normSe || null,
      wol: normWol,
      il: normIl,
    };

    const ilBlock = buildLuckBlock({
      scope: "일운",
      infoText: `${dateStr} ${normIl}`,
      gz: normIl,
      chain,
      natal,
      relationArgs: {
        daewoon: mainDae?.gz,
        sewoon: normSe || undefined,
        wolwoon: normWol || undefined,
        ilwoon: normIl || undefined,
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

    out.push(sectionPlain(`일운 ${dateStr}`, { 일운: ilBlock }));
  }

  return out.filter((s) => s.trim().length > 0);
}
