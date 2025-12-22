import { 육십갑자_자시 } from "@/shared/domain/간지/const";
import { resolveYearIndex } from "@/shared/domain/간지/common/ipchun";

export function getYearGanZhi(dateObj: Date, lon = 127.5) {
  const { index60Num } = resolveYearIndex(dateObj, lon);
  return 육십갑자_자시[index60Num];
}
