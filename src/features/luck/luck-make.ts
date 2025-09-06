// hooks/useUnCards.ts
import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import {
  computeNatalPillars,
  buildWolju,
  parseBirthLocal
} from "@/features/myoun";
import { findSolarTermUTC } from "@/shared/domain/solar-terms";
import { splitGanzhi } from "@/features/luck";
import { getMonthGanZhi, getYearGanZhi } from '@/shared/domain/간지/공통';
import { ensureSolarBirthDay } from "@/shared/domain/meongsik/ensureSolarBirthDay";

export type UnCard = {
  key: string;
  label: string;
  data: { stem: string; branch: string };
};

// 현재 대운/세운/월운 하나씩만 뽑기
export function useCurrentUnCards(
  ms: MyeongSik,
  hourTable: DayBoundaryRule = "자시",
): UnCard[] {

  const base  = useMemo(() => ensureSolarBirthDay(ms), [ms]);
  const birth = useMemo(() => parseBirthLocal(base), [base]);
  const natal = useMemo(() => computeNatalPillars(base, hourTable), [base, hourTable]);

  return useMemo(() => {
    const wolju = buildWolju(birth, natal.month, base.dir, 120, base.birthPlace?.lon);
    const now = new Date(); // 오늘 시각 (보정 안한 UTC가 아닌 로컬)

    function lastAtOrNull<T extends { at: Date }>(arr: T[], t: Date): T | null {
      let ans: T | null = null;
      const x = t.getTime();
      for (const e of arr) {
        if (e.at.getTime() <= x) ans = e;
        else break;
      }
      return ans;
    }

    const currDaeun = lastAtOrNull(wolju.events, now)?.gz ?? natal.month;
    const curDaeun = splitGanzhi(currDaeun);

    // 2) 세운: corrected.getFullYear() 기준 입춘 이후인지 체크
    const year = now.getFullYear();
    const ipchun = findSolarTermUTC(year, 315);
    const isAfterIpchun = ipchun && now >= ipchun;
    const seunYear = isAfterIpchun ? year : year - 1;
    const currYear = getYearGanZhi(new Date(seunYear, 1, 10, 0, 0, 0), 127.5);
    const curSeun = splitGanzhi(currYear);

    // 3) 월운: 현재 corrected 시각이 속한 절기 구간 찾기
    const currMonth = getMonthGanZhi(now, 127.5);
    const curWolun = splitGanzhi(currMonth);

    const cards: UnCard[] = [];
    if (curWolun) cards.push({ key: "wolun", label: "월운", data: curWolun });
    if (curSeun) cards.push({ key: "seun", label: "세운", data: curSeun });
    if (curDaeun) cards.push({ key: "daeun", label: "대운", data: curDaeun });
    return cards;
  }, [birth, base.dir, natal.month]);
}
