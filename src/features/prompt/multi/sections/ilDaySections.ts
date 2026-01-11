// features/prompt/multi/sections/ilDaySections.ts
import { normalizeGZ } from "@/analysisReport/calc/logic/relations";
import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import type { ShinsalBasis } from "@/analysisReport/calc/logic/shinsal";
import type { LuckChain, UnifiedPowerResult } from "@/analysisReport/calc/utils/unifiedPower";
import type { Element } from "@/analysisReport/calc/utils/types";
import { getMonthGanZhi, getDayGanZhi, getYearGanZhi } from "@/shared/domain/ganji/common";
import type { DayBoundaryRule } from "@/shared/type";
import type { DaewoonInfo } from "../types";
import { findDaeForMonthMulti } from "../luckLookup";
import type { LuckShowToggles, ShinsalSettings } from "../buildLuckBlock";
import { buildLuckBlock } from "../buildLuckBlock";
import { sectionPlain } from "../sectionUtils";
import { findSolarTermUTC } from "@/shared/domain/solar-terms";

type SeForDate = { useYear: number; gz: string };

function resolveSeForDate(dateMid: Date): SeForDate {
  const y = dateMid.getFullYear();
  const ipchun = findSolarTermUTC(y, 315);
  const useYear = dateMid < ipchun ? y - 1 : y;

  const seGZ = getYearGanZhi(new Date(useYear, 5, 15, 12, 0, 0, 0));
  const gz = normalizeGZ(seGZ || "");

  return { useYear, gz };
}

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
  const baseDate0 = new Date(y0, m0 - 1, d0, 4, 0);     // 일주 계산용
  const baseMid0 = new Date(y0, m0 - 1, d0, 12, 0);     // 절기 경계 흔들림 방지용

  if (!Number.isNaN(baseDate0.getTime())) {
    // 상단 대운은 첫날 월 기준으로만 (필요하면 범위 확장도 가능)
    const daes0 = findDaeForMonthMulti(daeList, y0, m0);
    const mainDae0 = daes0.length > 0 ? daes0[0] : null;

    // ✅ ilDays 전체 훑어서 "세운+월운 컨텍스트" 유니크 모으기 (입춘 걸치면 2개 나옴)
    type Ctx = {
      key: string;
      repDateStr: string;
      seYear: number;
      seGZ: string;
      wolGZ: string;
      ilGZ: string;
    };

    const ctxs: Ctx[] = [];

    for (const ds of ilDays) {
      const [yy, mm, dd] = ds.split("-").map(Number);
      const dayMid = new Date(yy, mm - 1, dd, 12, 0);
      const dayCalc = new Date(yy, mm - 1, dd, 4, 0);

      if (Number.isNaN(dayMid.getTime()) || Number.isNaN(dayCalc.getTime())) continue;

      const se = resolveSeForDate(dayMid);
      const wol = normalizeGZ(getMonthGanZhi(dayMid) || "");
      const il = normalizeGZ(getDayGanZhi(dayCalc, dayBoundaryRule) || "");

      const key = `${se.useYear}|${se.gz}|${wol}`;
      if (!ctxs.some((c) => c.key === key)) {
        ctxs.push({
          key,
          repDateStr: ds,
          seYear: se.useYear,
          seGZ: se.gz,
          wolGZ: wol,
          ilGZ: il,
        });
      }
    }

    // 대표값(첫 컨텍스트 없으면 0번 날짜 기준으로 fallback)
    const fallbackIl = normalizeGZ(getDayGanZhi(baseDate0, dayBoundaryRule) || "");
    const fallbackWol = normalizeGZ(getMonthGanZhi(baseMid0) || "");
    const fallbackSe = resolveSeForDate(baseMid0);

    const ctxList = ctxs.length > 0
      ? ctxs
      : [{
          key: `${fallbackSe.useYear}|${fallbackSe.gz}|${fallbackWol}`,
          repDateStr: ilDays[0],
          seYear: fallbackSe.useYear,
          seGZ: fallbackSe.gz,
          wolGZ: fallbackWol,
          ilGZ: fallbackIl,
        }];

    // (5-1-a) 상단 대운
    if (mainDae0) {
      const topCtx = ctxList[ctxList.length - 1]; // 최신 컨텍스트(보통 입춘 이후) 쪽을 대표로
      const daeChain0: LuckChain = {
        dae: mainDae0.gz,
        se: topCtx.seGZ,
        wol: topCtx.wolGZ,
        il: topCtx.ilGZ,
      };

      const daeTop = buildLuckBlock({
        scope: "대운",
        infoText: `${mainDae0.age}대운 ${mainDae0.gz} (${mainDae0.startYear}~${mainDae0.endYear})`,
        gz: mainDae0.gz,
        chain: daeChain0,
        natal,
        relationArgs: {
          daewoon: mainDae0.gz,
          sewoon: topCtx.seGZ,
          wolwoon: topCtx.wolGZ,
          ilwoon: topCtx.ilGZ,
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

    // (5-1-b) 상단 세운: 컨텍스트별로 배열 출력
    const seBlocks = ctxList
      .filter((c) => c.seGZ.trim().length > 0)
      .map((c) => {
        const seChain0: LuckChain = {
          dae: mainDae0 ? mainDae0.gz : null,
          se: c.seGZ,
          wol: c.wolGZ,
          il: c.ilGZ,
        };

        return buildLuckBlock({
          scope: "세운",
          infoText: `${c.seYear}년 ${c.seGZ} (${c.repDateStr} 기준)`,
          gz: c.seGZ,
          chain: seChain0,
          natal,
          relationArgs: {
            daewoon: mainDae0?.gz,
            sewoon: c.seGZ,
            wolwoon: c.wolGZ,
            ilwoon: c.ilGZ,
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
      });

    if (seBlocks.length > 0) {
      out.push(sectionPlain("세운", { 세운: seBlocks }));
    }

    // (5-1-c) 상단 월운: 컨텍스트별로 배열 출력
    const wolBlocks = ctxList
      .filter((c) => c.wolGZ.trim().length > 0)
      .map((c) => {
        const wolChain0: LuckChain = {
          dae: mainDae0 ? mainDae0.gz : null,
          se: c.seGZ,
          wol: c.wolGZ,
          il: c.ilGZ,
        };

        return buildLuckBlock({
          scope: "월운",
          infoText: `${c.repDateStr} ${c.wolGZ}`,
          gz: c.wolGZ,
          chain: wolChain0,
          natal,
          relationArgs: {
            daewoon: mainDae0?.gz,
            sewoon: c.seGZ,
            wolwoon: c.wolGZ,
            ilwoon: c.ilGZ,
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
      });

    if (wolBlocks.length > 0) {
      out.push(sectionPlain("월운", { 월운: wolBlocks }));
    }
  }

  // (5-2) 날짜별 일운 상세섹션 (✅ 날짜 기준으로 세운/월운 정확히 계산)
  for (const dateStr of ilDays) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const baseDate = new Date(y, m - 1, d, 4, 0);  // 일주 계산용
    const midDate = new Date(y, m - 1, d, 12, 0);  // 절기/월 기준용
    if (Number.isNaN(baseDate.getTime()) || Number.isNaN(midDate.getTime())) continue;

    const daes = findDaeForMonthMulti(daeList, y, m);
    const mainDae = daes.length > 0 ? daes[0] : null;

    const se = resolveSeForDate(midDate);
    const normSe = se.gz;

    const wolGZ = getMonthGanZhi(midDate);
    const normWol = normalizeGZ(wolGZ || "");

    const ilGZ = getDayGanZhi(baseDate, dayBoundaryRule);
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
