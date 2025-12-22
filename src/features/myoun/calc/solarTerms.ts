// @/features/myoun/calc/solarTerms.ts
import { findSolarTermUTC } from "@/shared/domain/solar-terms";
import { roundToMinute } from "@/features/myoun/calc/time";

const JIE_DEGREES = [315, 345, 15, 45, 75, 105, 135, 165, 195, 225, 255, 285] as const;

export const findPrevJie = (birth: Date): Date => {
  const y = birth.getFullYear();
  const candidates: Date[] = [];
  for (const yy of [y - 1, y]) {
    for (const deg of JIE_DEGREES) {
      const dt = findSolarTermUTC(yy, deg);
      if (dt.getTime() <= birth.getTime()) candidates.push(dt);
    }
  }
  if (!candidates.length) throw new Error("직전 절기 없음");
  candidates.sort((a, b) => b.getTime() - a.getTime());
  return roundToMinute(candidates[0]);
};

export const findNextJie = (birth: Date): Date => {
  const y = birth.getFullYear();
  const candidates: Date[] = [];
  for (const yy of [y, y + 1]) {
    for (const deg of JIE_DEGREES) {
      const dt = findSolarTermUTC(yy, deg);
      if (dt.getTime() >= birth.getTime()) candidates.push(dt);
    }
  }
  if (!candidates.length) throw new Error("다음 절기 없음");
  candidates.sort((a, b) => a.getTime() - b.getTime());
  return roundToMinute(candidates[0]);
};

export const getSolarTermBoundaries = (natal: Date) => {
  const y = natal.getFullYear();
  const terms = [
    { deg: 315, name: "입춘" },
    { deg: 345, name: "경칩" },
    { deg: 15, name: "청명" },
    { deg: 45, name: "입하" },
    { deg: 75, name: "망종" },
    { deg: 105, name: "소서" },
    { deg: 135, name: "입추" },
    { deg: 165, name: "백로" },
    { deg: 195, name: "한로" },
    { deg: 225, name: "입동" },
    { deg: 255, name: "대설" },
    { deg: 285, name: "소한" },
  ];

  const next = { deg: 315, name: "다음입춘" };

  const arr = terms
    .map((t) => ({
      name: t.name,
      date: findSolarTermUTC(y, t.deg),
    }))
    .concat([
      { name: next.name, date: findSolarTermUTC(y + 1, next.deg) },
      { name: "소한", date: findSolarTermUTC(y + 1, 285) },
    ]);

  const start = findSolarTermUTC(y, 315);
  const end = findSolarTermUTC(y + 1, 315);

  return arr
    .filter((t) => t.date >= start && t.date < end)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};
