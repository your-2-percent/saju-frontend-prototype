import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from '@/shared/domain/간지/공통';
import type { DayBoundaryRule } from "@/shared/type";

// 연간 구하는 함수
export function getYearBranch(dateObj: Date, lon = 127.5) {
  return getYearGanZhi(dateObj, lon).charAt(1);
}

// ================================================================= 월주 시작 //

export function getMonthBranch(dateObj: Date, lon = 127.5) {
  return getMonthGanZhi(dateObj, lon).charAt(1);
}

// ================================================================= 일주 시작 //
export function getDayBranch(
  dateObj: Date,
  rule: DayBoundaryRule,
){
  return getDayGanZhi(dateObj, rule).charAt(1);
}

// ================================================================= 시주시작 //
export function getHourBranch(
  dateObj: Date,
  rule: DayBoundaryRule,
  dayStemOverride?: string
): string {
  return getHourGanZhi(dateObj, rule, dayStemOverride).charAt(1);
}