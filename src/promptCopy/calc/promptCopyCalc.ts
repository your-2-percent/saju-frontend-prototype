import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, shiftDayGZ } from "@/shared/domain/ganji/common";
import { clamp01, getShinCategory } from "@/analysisReport/calc/logic/shinStrength";
import { natalShinPercent } from "@/analysisReport/calc/logic/powerPercent";
import { getDaewoonList } from "@/luck/calc/daewoonList";
import { buildNatalPillarsFromMs } from "@/features/prompt/natalFromMs";
import { normalizeGZLocal, normalizePillars, hasValidYmd } from "@/promptCopy/calc/ganjiNormalize";
import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import type { LuckChain } from "@/analysisReport/calc/utils/unifiedPower";
import type { ShinCategory } from "@/analysisReport/calc/logic/shinStrength";

export type DaeListItem = {
  gz: string;
  age: number;
  startYear: number;
  startMonth: number;
  startDay: number;
  endYear: number;
};

type EffectiveBasis = "solar" | "lunar";

export function buildFallbackChain(
  chain: LuckChain | undefined,
  baseDate: Date,
  rule: DayBoundaryRule
): LuckChain {
  if (chain) {
    return {
      dae: chain.dae ?? null,
      se: chain.se ?? null,
      wol: chain.wol ?? null,
      il: chain.il ?? null,
    };
  }

  const se = normalizeGZLocal(getYearGanZhi(baseDate) || "");
  const wol = normalizeGZLocal(getMonthGanZhi(baseDate) || "");
  const il = normalizeGZLocal(getDayGanZhi(baseDate, rule) || "");

  return {
    dae: null,
    se: se || null,
    wol: wol || null,
    il: il || null,
  };
}

export function normalizePillarsForPrompt(natal: Pillars4, lunar: Pillars4) {
  const solarKo = normalizePillars(natal);
  const lunarKo = normalizePillars(lunar);
  return { solarKo, lunarKo };
}

export function applyPrevDayToPillars(
  pillars: [string, string, string, string],
  usePrevDay: boolean
): [string, string, string, string] {
  if (!usePrevDay) return pillars;
  const shifted = shiftDayGZ(pillars[2] || "", -1);
  return [pillars[0], pillars[1], shifted, pillars[3]];
}

export function applyManualHour(
  pillars: string[],
  manualHour: { stem: string; branch: string } | null,
  allowManual: boolean
): [string, string, string, string] {
  const arr = [...pillars] as [string, string, string, string];
  if (allowManual && (!arr[3] || arr[3] === "" || arr[3] === "--") && manualHour) {
    arr[3] = manualHour.stem + manualHour.branch;
  }
  return arr;
}

export function resolveEffectiveBasis(
  solarValid: boolean,
  lunarValid: boolean,
  basis: EffectiveBasis
): EffectiveBasis {
  if (basis === "lunar") {
    return lunarValid ? "lunar" : solarValid ? "solar" : "lunar";
  }
  return solarValid ? "solar" : lunarValid ? "lunar" : "solar";
}

export function computeActivePillars(
  basis: EffectiveBasis,
  solarValid: boolean,
  lunarValid: boolean,
  solarKoWithHour: [string, string, string, string],
  lunarKoWithHour: [string, string, string, string],
  computedFallback: [string, string, string, string] | null,
  manualHour: { stem: string; branch: string } | null,
  allowManual: boolean
): [string, string, string, string] {
  const source =
    basis === "lunar"
      ? lunarValid
        ? lunarKoWithHour
        : solarValid
          ? solarKoWithHour
          : computedFallback ?? ["", "", "", ""]
      : solarValid
        ? solarKoWithHour
        : lunarValid
          ? lunarKoWithHour
          : computedFallback ?? ["", "", "", ""];
  return applyManualHour(source, manualHour, allowManual);
}

export function computeFallbackPillars(
  ms: MyeongSik,
  rule: DayBoundaryRule
): [string, string, string, string] | null {
  const y = Number(ms.birthDay?.slice(0, 4));
  const m = Number(ms.birthDay?.slice(4, 6));
  const d = Number(ms.birthDay?.slice(6, 8));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const base = new Date(y, m - 1, d, 12, 4, 0, 0);
  const yn = normalizeGZLocal(getYearGanZhi(base) || "");
  const wl = normalizeGZLocal(getMonthGanZhi(base) || "");
  const il = normalizeGZLocal(getDayGanZhi(base, rule) || "");
  return [yn, wl, il, ""];
}

export function computeManualHourStr(
  manualHour: { stem: string; branch: string } | null,
  allowManual: boolean
): string {
  return allowManual && manualHour ? manualHour.stem + manualHour.branch : "";
}

export function buildNatalWithPrediction(
  ms: MyeongSik,
  manualHourStr: string,
  allowManual: boolean
): [string, string, string, string] {
  const pillars = buildNatalPillarsFromMs(ms);
  const arr = [...pillars] as [string, string, string, string];
  if (allowManual && manualHourStr && manualHourStr.length === 2) {
    arr[3] = manualHourStr;
  }
  return arr;
}

export function computeShinCategory(natalArr: string[]): { percent: number; category: ShinCategory } {
  const shinPct = natalShinPercent(natalArr, {
    criteriaMode: "modern",
    useHarmonyOverlay: true,
  });
  const percent = clamp01(shinPct);
  return { percent, category: getShinCategory(percent) };
}

export function buildDaeList(ms: MyeongSik): DaeListItem[] {
  const rawList = getDaewoonList(ms).slice(0, 10);
  const birthYear = ms.birthDay ? Number(ms.birthDay.slice(0, 4)) : 0;

  return rawList.map((str, idx) => {
    const match = str.match(/(\d{4})년\s+(\d{1,2})월\s+([가-힣]{2})\s+대운/);
    const startYear = match ? Number(match[1]) : 0;
    const startMonth = match ? Number(match[2]) : 1;
    const startDay = 1;
    const gz = match ? match[3] : "";
    const age = birthYear > 0 ? koreanAgeByYear(birthYear, startYear) : idx * 10;

    return {
      gz,
      age,
      startYear,
      startMonth,
      startDay,
      endYear: startYear + 10,
    };
  });
}

export function buildPartnerOptions(list: MyeongSik[], msId: string) {
  return list
    .filter((m) => m.id !== msId)
    .map((m) => {
      const name = (m.name ?? "").trim() || "이름 없음";
      const birth = m.birthDay ? m.birthDay : "";
      const label = birth ? `${name} (${birth})` : name;
      return { id: m.id, label };
    });
}

export function buildFinalPrompt(basePrompt: string, extraQuestions: string[]): string {
  if (!basePrompt) return "";
  if (extraQuestions.length === 0) return basePrompt;
  const lines: string[] = [
    "",
    "-----",
    "아래 내용을 추가로 궁금해하는 질문 목록",
    "",
    ...extraQuestions.map((q, idx) => `${idx + 1}. ${q}`),
  ];
  return `${basePrompt}\n${lines.join("\n")}`;
}

export function isValidSolarPillars(pillars: string[]) {
  return hasValidYmd(pillars as [string, string, string, string]);
}

function koreanAgeByYear(birthYear: number, targetYear: number): number {
  return targetYear - birthYear + 1;
}
