import type { Direction, DayChangeRule } from "@/shared/type";
import { 천간, 지지 } from "@/shared/domain/ganji/const";
import { getMonthGanZhi } from "@/shared/domain/ganji/common";
import { getSolarTermBoundaries } from "@/features/myoun/calc/solarTerms";
import { normalizeGZtoHJ } from "@/features/myoun/calc/normalize";
import { dayChangeTrigger } from "@/features/myoun/calc/siju";
import { stepGZ } from "@/features/myoun/calc/ganjiCycle";

type Branch = "子" | "丑" | "寅" | "卯" | "辰" | "巳" | "午" | "未" | "申" | "酉" | "戌" | "亥";

type WoljuEvent = { at: Date; gz: string };

type WoljuResult = {
  natalMonthPillar: string;
  firstChange: Date;
  mPillars: unknown[];
  events: WoljuEvent[];
};

const getHourBranchIndex = (date: Date) => Math.floor(((date.getHours() + 1) % 24) / 2);

const getHourBranch = (date: Date): Branch => {
  const branches: Branch[] = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
  return branches[getHourBranchIndex(date)];
};

const stepGZLocal = (base: string, direction: Direction, step: number): string => {
  const g = base.charAt(0);
  const z = base.charAt(1);
  const gi = 천간.indexOf(g);
  const zi = 지지.indexOf(z);
  const s = direction === "forward" ? step : -step;
  const gi2 = (gi + (s % 10) + 10) % 10;
  const zi2 = (zi + (s % 12) + 12) % 12;
  return 천간[gi2] + 지지[zi2];
};

export const buildWolju = (
  natal: Date,
  natalMonthGZ: string,
  dir: Direction,
  untilYears = 120,
  lon: number
): WoljuResult => {
  const allTerms = getSolarTermBoundaries(natal).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  let relevantSolarTerm: Date | undefined;
  const natalUtc = natal.getTime();
  if (dir === "forward") {
    const i = allTerms.findIndex((t) => t.date.getTime() >= natalUtc);
    if (i >= 0) relevantSolarTerm = allTerms[i].date;
  } else {
    const past = allTerms.filter((t) => t.date.getTime() <= natalUtc);
    if (past.length) relevantSolarTerm = past[past.length - 1].date;
  }

  const getFirstSijuChangeRestored = (dt: Date, solarTermTime?: Date) => {
    const branch = getHourBranch(dt);
    const startMap: Record<Branch, number> = {
      子: 23,
      丑: 1,
      寅: 3,
      卯: 5,
      辰: 7,
      巳: 9,
      午: 11,
      未: 13,
      申: 15,
      酉: 17,
      戌: 19,
      亥: 21,
    };
    const h0 = startMap[branch];
    const h1 = (h0 + 2) % 24;

    const base = new Date(dt);
    base.setSeconds(0, 0);

    if (dir === "backward" && solarTermTime) {
      const termBranch = getHourBranch(solarTermTime);
      const termStartHour = startMap[termBranch];
      const termBoundary = new Date(solarTermTime);
      termBoundary.setHours(termStartHour, 0, 0, 0);
      return termBoundary;
    }

    if (dir === "forward" && solarTermTime) {
      const termBranch = getHourBranch(solarTermTime);
      const termStartHour = startMap[termBranch];
      const termBoundary = new Date(solarTermTime);
      termBoundary.setHours(termStartHour, 0, 0, 0);
      if (termBoundary > base) {
        return termBoundary;
      }
    }

    const bnd = new Date(base);
    if (dir === "forward") {
      bnd.setHours(h1, 0, 0, 0);
      if (bnd <= base) bnd.setDate(bnd.getDate() + 1);
    } else {
      bnd.setHours(h0, 0, 0, 0);
      if (bnd >= base) bnd.setDate(bnd.getDate() - 1);
    }
    return bnd;
  };

  const refMonthAtBirthHJ = normalizeGZtoHJ(getMonthGanZhi(natal, 127.5));
  const firstSijuBoundary = getFirstSijuChangeRestored(natal, relevantSolarTerm);
  const minuteDiff =
    dir === "forward"
      ? Math.floor((firstSijuBoundary.getTime() - natal.getTime()) / 60_000)
      : Math.floor((natal.getTime() - firstSijuBoundary.getTime()) / 60_000);
  const mappedMs = Math.round((minuteDiff / 120) * (10 * 24 * 60 * 60 * 1000));
  let firstMonthChange = new Date(natal.getTime() + mappedMs);

  let isAdjacent = false;
  try {
    const refMonthAtBirth = normalizeGZtoHJ(getMonthGanZhi(natal, lon));
    isAdjacent =
      (dir === "forward" && refMonthAtBirthHJ !== refMonthAtBirth) ||
      (dir === "backward" && refMonthAtBirthHJ !== refMonthAtBirth);
    if (isAdjacent) {
      const minuteMs = Math.round(minuteDiff * 60_000);
      firstMonthChange = new Date(natal.getTime() + minuteMs);
      if (firstMonthChange.getTime() === natal.getTime()) {
        firstMonthChange = new Date(natal.getTime() + 60_000);
      }
    }
  } catch {
    // getMonthGanZhi 실패해도 기본 로직 유지
  }

  const utilsNumber = untilYears / 10;
  const events: WoljuEvent[] = [];
  events.push({ at: firstMonthChange, gz: stepGZLocal(natalMonthGZ, dir, 1) });
  for (let i = 1; i < utilsNumber; i += 1) {
    const at = new Date(firstMonthChange);
    at.setFullYear(at.getFullYear() + i * 10);
    at.setSeconds(0, 0);
    const gz = stepGZLocal(natalMonthGZ, dir, i + 1);
    events.push({ at, gz });
  }
  events.sort((a, b) => a.at.getTime() - b.at.getTime());

  return {
    natalMonthPillar: natalMonthGZ,
    firstChange: firstMonthChange,
    mPillars: [],
    events,
  };
};

const getAge = (birth: Date, target: Date): number => {
  const diffMs = target.getTime() - birth.getTime();
  const age = diffMs / (365.2425 * 24 * 60 * 60 * 1000);
  return Math.max(0, Math.floor(age));
};

export const buildYeonjuFromWolju = (
  wolju: ReturnType<typeof buildWolju>,
  natalYearGZ: string,
  dir: Direction,
  rule: DayChangeRule,
  natal: Date
) => {
  const isTrigger = dayChangeTrigger(rule, dir);
  let cur = natalYearGZ;

  const events: Array<{ at: Date; gz: string; age: number }> = [];

  for (const ev of wolju.events) {
    const br = ev.gz.charAt(1);
    if (isTrigger(br)) {
      cur = stepGZ(cur, dir, 1);
      events.push({
        at: ev.at,
        gz: cur,
        age: getAge(natal, ev.at),
      });
    }
  }

  return { events };
};
