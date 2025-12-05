import { findSolarTermUTC } from '@/shared/domain/solar-terms';
import { 천간, 지지, 간지_MAP, 육십갑자_자시, 시주매핑_자시, timeRanges } from '@/shared/domain/간지/const';
import { getYearStem } from '@/shared/domain/간지/천간';
import type { DayBoundaryRule } from "@/shared/type";
//import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
//import { format } from "date-fns";

// export const toHourTable = (ming: DayBoundaryRule): DayBoundaryRule => {
//   return ming;
// };

// ───────────────────────── 입춘 캐시 ─────────────────────────
const ipchunCache = new Map<string, Date>();

export function getIpChunCached(year: number, lon = 127.5): Date {
  const key = `${year}@${lon}`;
  const hit = ipchunCache.get(key);
  if (hit) return hit;

  // ✅ lon 전달 누락 보완
  const d = findSolarTermUTC(year, 315, lon);
  if (!d) {
    throw new Error(`입춘 날짜를 찾을 수 없습니다: year=${year}, lon=${lon}`);
  }
  ipchunCache.set(key, d);
  return d;
}

// ───────────────────────── 유틸 ─────────────────────────
const mod = (n: number, m: number) => ((n % m) + m) % m;
const isValidDate = (d: unknown): d is Date => d instanceof Date && !Number.isNaN(d.getTime());

// ───────────────────────── 연주(연간/연지) ─────────────────────────
/** 주어진 날짜 기준으로 (입춘 이전이면 전년도, 이후면 해당년도)를 사용하여 60갑자 인덱스 계산 */
function resolveYearIndex(dateObj: Date, lon = 127.5) {
  if (!isValidDate(dateObj)) throw new Error("resolveYearIndex: invalid date");
  const year = dateObj.getFullYear();
  const ipChun = getIpChunCached(year, lon);
  const useYear = dateObj < ipChun ? year - 1 : year;
  const index60Num = mod(useYear - 4, 60); // 4년=갑자 기준
  return { useYear, index60Num };
}

/** 연간/연지(연주) */
export function getYearGanZhi(dateObj: Date, lon = 127.5) {
  const { index60Num } = resolveYearIndex(dateObj, lon);
  return 육십갑자_자시[index60Num];
}

// ───────────────────────── 월주(월간/월지) ─────────────────────────
const FIRST_MONTH_STEM_BY_YEAR_STEM = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0] as const;

function getMonthBoundaries(useYear: number, lon = 127.5): Date[] {
  const raw: Date[] = new Array(12);
  raw[0]  = getIpChunCached(useYear, lon);
  raw[1]  = findSolarTermUTC(useYear,     345, lon);
  raw[2]  = findSolarTermUTC(useYear,      15, lon);
  raw[3]  = findSolarTermUTC(useYear,      45, lon);
  raw[4]  = findSolarTermUTC(useYear,      75, lon);
  raw[5]  = findSolarTermUTC(useYear,     105, lon);
  raw[6]  = findSolarTermUTC(useYear,     135, lon);
  raw[7]  = findSolarTermUTC(useYear,     165, lon);
  raw[8]  = findSolarTermUTC(useYear,     195, lon);
  raw[9]  = findSolarTermUTC(useYear,     225, lon);
  raw[10] = findSolarTermUTC(useYear,     255, lon);
  raw[11] = findSolarTermUTC(useYear + 1, 285, lon);

  // ✅ UTC → 보정시 변환
  return raw.map(d => new Date(d.getTime() + 30 * 60 * 1000));
}

// function printSolarTerms(year: number, lon = 127.5) {
//   const bounds = getMonthBoundaries(year, lon);

//   console.log(`==== ${year}년 절기 (lon=${lon}) ====`);
//   bounds.forEach((d, i) => {
//     // 월 인덱스: 0=입춘, 1=경칩, 2=청명 … 11=대한 직전 동지
//     const names = [
//       "입춘", "경칩", "청명", "입하", "망종", "소서",
//       "입추", "백로", "한로", "입동", "대설", "소한"
//     ];
//     const name = names[i] ?? `절기${i + 1}`;
//     const s = format(d, "yyyy-MM-dd HH:mm");
//     console.log(`${name}: ${s}`);
//   });
// }

// // 예시 실행
// printSolarTerms(1991);

export function getMonthIndex(dateObj: Date, lon = 127.5) {
  const { useYear } = resolveYearIndex(dateObj, lon);
  const bounds = getMonthBoundaries(useYear, lon);
  let k = 0;
  for (let i = 0; i < 12; i++) {
    if (dateObj >= bounds[i]) k = i;
  }
  const monthIndex = k + 1; // 1..12
  return { monthIndex, useYear, boundaries: bounds };
}

function resolveFirstMonthStemIdx(dateObj: Date, lon = 127.5): number {
  // ✅ 연간을 dateObj에서 직접 구함 (year 인자 제거)
  const yStem = getYearStem(dateObj, lon);
  const yStemIdx = 간지_MAP.천간.indexOf(yStem as typeof 간지_MAP.천간[number]);
  if (yStemIdx < 0) throw new Error(`resolveFirstMonthStemIdx: invalid year stem "${yStem}"`);
  return FIRST_MONTH_STEM_BY_YEAR_STEM[yStemIdx];
}

export function calcMonthStemIdx(dateObj: Date, monthIndex: number, lon = 127.5): number {
  const firstIdx = resolveFirstMonthStemIdx(dateObj, lon);
  return (firstIdx + (monthIndex - 1)) % 10;
}

export function getMonthGanZhi(dateObj: Date, lon = 127.5) {
  if (!isValidDate(dateObj)) return "";
  const { monthIndex } = getMonthIndex(dateObj, lon);   // 1..12

  // 지지: 인월=寅이 1월 → 2부터 시작(寅=2)
  const branchIdx = (2 + (monthIndex - 1)) % 12;
  const branch = 간지_MAP.지지[branchIdx];

  const stemIdx = calcMonthStemIdx(dateObj, monthIndex, lon);
  const stem = 간지_MAP.천간[stemIdx];

  return stem + branch;
}

// ───────────────────────── 일주(일간/일지) ─────────────────────────

// ✅ 항상 양수 나머지
const posMod = (n: number, m: number) => ((n % m) + m) % m;

export function calendarGregorianToJD(
  year: number,
  month: number,
  day: number,
  hour = 0,
  minute = 0,
  second = 0
): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  const frac = (hour + minute / 60 + second / 3600) / 24;
  // 🔙 표준식: -1524.5 (정오 앵커)
  return Math.floor(365.25 * (year + 4716))
       + Math.floor(30.6001 * (month + 1))
       + day + frac + B - 1524.5;
}


export function getEffectiveDayOffset(dateObj: Date, rule: DayBoundaryRule): number {
  const h = dateObj.getHours();
  const min = dateObj.getMinutes();
  const totalMinutes = h * 60 + min;
  const hourBranch = getHourBranchUsingArray(dateObj);

  if (rule === "자시" && hourBranch ===  "자") {
    // 자시: 23:00 이후면 다음날로 +1
    return totalMinutes >= 23 * 60 ? 1 : 0;
  }
  if (rule === "인시" && (hourBranch ===  "자" || hourBranch ===  "축")) {
    // 인시: 03:00 이전이면 전날로 -1
    return totalMinutes < 3 * 60 ? -1 : 0;
  }
  
  // 야자시: 00:00 기준
  return totalMinutes < 0 ? 0 : 0; // 사실상 항상 0
}

export function getDayOffsetForCalendar(dateObj: Date, rule: DayBoundaryRule): number {
  const h = dateObj.getHours();
  const totalMinutes = h * 60 + dateObj.getMinutes();

  if (rule === "자시") {
    // 23:00 이후면 다음날로 계산
    return totalMinutes >= 23 * 60 ? 1 : 0;
  }

  if (rule === "인시") {
    console.log('들어오잖아');
    // 03:00 이전은 전날로 계산
    return totalMinutes < 3 * 60 ? -1 : 0;
  }

  // 조자시/야자시 → 00:00 기준
  return 0;
}

export const ANCHOR = {
  JDN: 2445731, // 1984-02-02 00:00의 JDN (floor(JD+0.5))
  idx: 0        // 갑자
};

export function getDayGanZhi(dateObj: Date, rule: DayBoundaryRule): string {
  const offset = getEffectiveDayOffset(dateObj, rule);

  // offset은 날짜 단위로 먼저 적용
  const dt = new Date(dateObj.getTime());
  dt.setDate(dt.getDate() + offset);

  const jd  = calendarGregorianToJD(
    dt.getFullYear(), dt.getMonth() + 1, dt.getDate(),
    dt.getHours(), dt.getMinutes()
  );
  const jdn = Math.floor(jd + 0.5);        // ✅ 자정 앵커 JDN
  const idx = posMod(jdn - ANCHOR.JDN + ANCHOR.idx, 60); // ✅ 항상 0..59

  const gz = 육십갑자_자시[idx]; // 너희 프로젝트에서 쓰는 60갑자 배열명 유지
  if (!gz) {
    throw new Error(`getDayGanZhi: idx=${idx} out of range (jdn=${jdn}, jd=${jd})`);
  }
  return gz;
}

export function getDayGanZhiilun(date: Date, rule: DayBoundaryRule) {
  const d = new Date(date);
  const offset = getDayOffsetForCalendar(d, rule);

  // offset은 날짜 단위로 먼저 적용
  const dt = new Date(date.getTime());
  dt.setDate(dt.getDate() + offset);

  const jd  = calendarGregorianToJD(
    dt.getFullYear(), dt.getMonth() + 1, dt.getDate(),
    dt.getHours(), dt.getMinutes()
  );
  const jdn = Math.floor(jd + 0.5);        // ✅ 자정 앵커 JDN
  const idx = posMod(jdn - ANCHOR.JDN + ANCHOR.idx, 60); // ✅ 항상 0..59

  const gz = 육십갑자_자시[idx]; // 너희 프로젝트에서 쓰는 60갑자 배열명 유지
  if (!gz) {
    throw new Error(`getDayGanZhi: idx=${idx} out of range (jdn=${jdn}, jd=${jd})`);
  }

  console.log(gz);
  return gz;
}


// ───────────────────────── 시주(시간 간지) ─────────────────────────
function getHourBranchUsingArray(dateObj: Date) {
  if (!(dateObj instanceof Date)) dateObj = new Date(dateObj);

  const totalMinutes = dateObj.getHours() * 60 + dateObj.getMinutes();

  for (let i = 0; i < timeRanges.length; i++) {
    const { branch, start, end } = timeRanges[i];
    if (start < end) {
      if (totalMinutes >= start && totalMinutes < end) return branch;
    } else {
      // 자정 넘어가는 구간(예: 23:00~01:00)
      if (totalMinutes >= start || totalMinutes < end) return branch;
    }
  }
  // 안전 반환 (이론상 도달 불가)
  return "자";
}

function getHourStemByRule(
  dateObj: Date,
  dayStemChar: string,
  hourBranchIndex: number,
  rule: DayBoundaryRule
): string {
  // 표준 공식: ((일간index % 5) * 2 + 시간지지index) % 10
  const dayStemIndex = 천간.indexOf(dayStemChar);
  if (dayStemIndex < 0) return ""; // 방어

  let idx = ((dayStemIndex % 5) * 2 + hourBranchIndex) % 10;

  const dateObjTime = dateObj.getHours();

  // 🔁 인시 규칙: 자/축(0,1)에서만 ‘인시 매핑’ 효과 → +2 오프셋
  if ((rule === "인시" || (rule === "조자시/야자시" && dateObjTime >= 3)) && (hourBranchIndex === 0 || hourBranchIndex === 1)) {
    idx = (idx + 2) % 10;
  }

  return 천간[idx];
}

export function getHourGanZhi(
  dateObj: Date,
  rule: DayBoundaryRule,           // "자시" | "조자시/야자시" | "인시"
  dayPillarOverride?: string                // 있으면 이 일주로 강제
): string {
  if (!(dateObj instanceof Date)) dateObj = new Date(dateObj);

  // 1) 시지
  const hourBranch = getHourBranchUsingArray(dateObj);
  const hourBranchIndex = 지지.indexOf(hourBranch); // 자=0, 축=1, ... 해=11

  // 2) 일간(반드시 경계 규칙 반영)
  
  const dayPillar = dayPillarOverride ?? getDayGanZhi(dateObj, rule);
  const dayStem = dayPillar.charAt(0) as keyof typeof 시주매핑_자시;

  //const table = rule === "자시" ? 시주매핑_자시 : 시주매핑_인시;

  // 3) 시간 천간 (인시 규칙일 때 자/축만 +2 보정)
  const hourStemChar = getHourStemByRule(dateObj, dayStem, hourBranchIndex, rule);

  // 4) 시주
  return hourStemChar + hourBranch;
}
