// src/global.d.ts
declare module "solarlunar" {
  export interface Solar2LunarResult {
    lYear: number;   // 음력 연도
    lMonth: number;  // 음력 월
    lDay: number;    // 음력 일
    animal: string;  // 띠
    monthCn: string; // 월의 한자
    dayCn: string;   // 일의 한자
    gzYear: string;  // 연간지
    gzMonth: string; // 월간지
    gzDay: string;   // 일간지
    isLeap: boolean; // 윤달 여부
    solarFestival: string; // 양력 공휴일 (없으면 "")
    lunarFestival: string; // 음력 명절 (없으면 "")
    term: string;          // 절기 (없으면 "")
  }

  export interface Lunar2SolarResult {
    cYear: number;   // 양력 연도
    cMonth: number;  // 양력 월
    cDay: number;    // 양력 일
    lunarFestival: string; // 음력 명절 (없으면 "")
    solarFestival: string; // 양력 공휴일 (없으면 "")
    term: string;          // 절기 (없으면 "")
  }

  export function solar2lunar(
    year: number,
    month: number,
    day: number
  ): Solar2LunarResult;

  export function lunar2solar(
    year: number,
    month: number,
    day: number,
    isLeapMonth?: boolean
  ): Lunar2SolarResult;
}
