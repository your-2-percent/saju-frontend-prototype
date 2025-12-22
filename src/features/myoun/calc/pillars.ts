import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/간지/공통";
import { parseBirthLocal } from "@/features/myoun/input/birth";

export const computeNatalPillars = (ms: MyeongSik, hourTable: DayBoundaryRule) => {
  const lon = ms.birthPlace?.lon ?? 127.5;
  const birth = parseBirthLocal(ms);
  const dayGZ = getDayGanZhi(birth, hourTable);
  const hourGZ = getHourGanZhi(birth, hourTable, dayGZ.charAt(0));
  return {
    year: getYearGanZhi(birth, lon),
    month: getMonthGanZhi(birth, lon),
    day: dayGZ,
    hour: hourGZ,
  };
};
