// features/prompt/multi/sections/wolMonthSections.ts
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import type { LuckChain, UnifiedPowerResult } from "@/features/AnalysisReport/utils/unifiedPower";
import type { Element } from "@/features/AnalysisReport/utils/types";
import { getYearGanZhi, getMonthGanZhi } from "@/shared/domain/간지/공통";
import { findSolarTermUTC } from "@/shared/domain/solar-terms";
import type { DaewoonInfo } from "../types";
import {
  findDaeForMonthMulti,
  findDaeForYearMulti,
  findSeForMonthPairs,
  type SePair,
} from "../luckLookup";
import type { LuckShowToggles, ShinsalSettings } from "../buildLuckBlock";
import { buildLuckBlock } from "../buildLuckBlock";
import { sectionPlain } from "../sectionUtils";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

type MonthSlice = {
  label: string;        // "2027-02(입춘전)" 같은 표기용
  repDate: Date;        // 이 슬라이스를 대표할 날짜(절기 판정/월간지 계산용)
  se: SePair;           // 이 슬라이스의 세운(연도+간지)
};

function buildMonthSlices(y: number, m: number): MonthSlice[] {
  const start = new Date(y, m - 1, 1, 12, 0, 0, 0);
  const end = new Date(y, m, 1, 12, 0, 0, 0);
  const ipchun = findSolarTermUTC(y, 315);

  const pairs = findSeForMonthPairs(y, m); // ✅ 연도+간지 묶음

  const hasIpchunInThisMonth = start < ipchun && ipchun < end;

  if (!hasIpchunInThisMonth) {
    // 한 덩어리(입춘 안 끼는 달)
    const se = pairs[pairs.length - 1] ?? (() => {
      const gz = normalizeGZ(getYearGanZhi(new Date(y, 5, 15, 12, 0, 0, 0)) || "");
      return { useYear: y, gz };
    })();

    return [
      {
        label: `${y}-${pad2(m)}`,
        repDate: new Date(y, m - 1, 15, 12, 0, 0, 0),
        se,
      },
    ];
  }

  // ✅ 입춘이 달 안에 끼면 2슬라이스(입춘 전/후)
  const dayMs = 24 * 60 * 60 * 1000;
  const preDate = new Date(ipchun.getTime() - dayMs);
  preDate.setHours(12, 0, 0, 0);
  const postDate = new Date(ipchun.getTime() + dayMs);
  postDate.setHours(12, 0, 0, 0);

  const preSe = pairs.find((p) => p.useYear === y - 1) ?? pairs[0];
  const postSe = pairs.find((p) => p.useYear === y) ?? pairs[pairs.length - 1];

  // 혹시라도 비는 경우 방어
  const safePreSe = preSe ?? { useYear: y - 1, gz: normalizeGZ(getYearGanZhi(new Date(y - 1, 5, 15, 12, 0, 0, 0)) || "") };
  const safePostSe = postSe ?? { useYear: y, gz: normalizeGZ(getYearGanZhi(new Date(y, 5, 15, 12, 0, 0, 0)) || "") };

  return [
    { label: `${y}-${pad2(m)}(입춘전)`, repDate: preDate, se: safePreSe },
    { label: `${y}-${pad2(m)}(입춘후)`, repDate: postDate, se: safePostSe },
  ];
}

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
  const seRepMap = new Map<string, { year: number; month: number; gz: string }>();

  for (const ym of wolMonths) {
    const [y, m] = ym.split("-").map(Number);

    const daes = findDaeForMonthMulti(daeList, y, m);
    for (const d of daes) {
      if (!daeUnion.some((x) => x.gz === d.gz && x.startYear === d.startYear)) {
        daeUnion.push(d);
      }
    }

    // ✅ 세운 요약은 “연도+간지”로 안전하게 쌓기
    const sePairs = findSeForMonthPairs(y, m);
    for (const p of sePairs) {
      const key = `${p.useYear}:${p.gz}`;
      if (!seRepMap.has(key)) {
        seRepMap.set(key, { year: p.useYear, month: m, gz: p.gz });
      }
    }
  }

  // ref 세운(그냥 요약용)
  const [refY, refM] = wolMonths[0].split("-").map(Number);
  const refPairs = findSeForMonthPairs(refY, refM);
  const seNormRef =
    refPairs[refPairs.length - 1]?.gz ??
    normalizeGZ(getYearGanZhi(new Date(refY, 5, 15, 12, 0, 0, 0)) || "");

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
  const seKeys = Array.from(seRepMap.keys()).sort((a, b) => {
    const ay = Number(a.split(":")[0]);
    const by = Number(b.split(":")[0]);
    return ay - by;
  });

  if (seKeys.length > 0) {
    const seSectionData = {
      세운: seKeys.map((key) => {
        const rep = seRepMap.get(key)!;
        const y = rep.year;
        const se = rep.gz;

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

  // (4-3) 월운 리스트 (각 월별) — ✅ 입춘 끼면 2개 슬라이스로 출력
  for (const ym of wolMonths) {
    const [y, m] = ym.split("-").map(Number);

    const daes = findDaeForMonthMulti(daeList, y, m);
    const mainDae = daes.length > 0 ? daes[0] : null;

    const slices = buildMonthSlices(y, m);

    const wolBlocks = slices.map((sl) => {
      const wolGZ = getMonthGanZhi(sl.repDate);
      const wolNorm = normalizeGZ(wolGZ || "");

      const chain: LuckChain = {
        dae: mainDae ? mainDae.gz : null,
        se: sl.se.gz || null,
        wol: wolNorm,
        il: null,
      };

      return buildLuckBlock({
        scope: "월운",
        infoText: `${sl.label} ${wolNorm} · ${sl.se.useYear}년 ${sl.se.gz}`,
        gz: wolNorm,
        chain,
        natal,
        relationArgs: {
          daewoon: mainDae?.gz,
          sewoon: sl.se.gz || undefined,
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
    });

    out.push(sectionPlain(`월운 ${ym}`, { 월운: wolBlocks }));
  }

  return out.filter((s) => s.trim().length > 0);
}
