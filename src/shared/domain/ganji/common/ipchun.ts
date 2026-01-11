import { findSolarTermUTC } from "@/shared/domain/solar-terms";
import { mod, isValidDate } from "@/shared/domain/ganji/common/utils";

const ipchunCache = new Map<string, Date>();

export function getIpChunCached(year: number, lon = 127.5): Date {
  const key = `${year}@${lon}`;
  const hit = ipchunCache.get(key);
  if (hit) return hit;

  const d = findSolarTermUTC(year, 315, lon);
  if (!d) {
    throw new Error(`입춘 날짜를 찾을 수 없습니다: year=${year}, lon=${lon}`);
  }
  ipchunCache.set(key, d);
  return d;
}

export function resolveYearIndex(dateObj: Date, lon = 127.5) {
  if (!isValidDate(dateObj)) throw new Error("resolveYearIndex: invalid date");
  const year = dateObj.getFullYear();
  const ipChun = getIpChunCached(year, lon);
  const useYear = dateObj < ipChun ? year - 1 : year;
  const index60Num = mod(useYear - 4, 60);
  return { useYear, index60Num };
}
