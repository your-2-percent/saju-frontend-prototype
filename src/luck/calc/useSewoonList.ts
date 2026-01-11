import { getYearGanZhi } from "@/shared/domain/ganji/common";
import { findSolarTermUTC } from "@/shared/domain/solar-terms";
import { Daewoon } from "@/features/luck/useDaewoonList";

export type Sewoon = { at: Date; gz: string };

export function getSewoonListInDaewoon(dae: Daewoon, nextDae?: Daewoon): Sewoon[] {
  const startYear = dae.startYear ?? dae.at.getFullYear();
  const endYear = nextDae
    ? nextDae.startYear ?? nextDae.at.getFullYear()
    : startYear + 10;

  const result: Sewoon[] = [];
  for (let y = startYear; y < endYear; y++) {
    // 해당 연도 입춘
    const ipchun = findSolarTermUTC(y, 315);
    const gz = getYearGanZhi(new Date(y, 1, 10));
    result.push({ at: ipchun, gz });
  }
  return result;
}
