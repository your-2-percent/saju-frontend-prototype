import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from '@/shared/domain/간지/공통';
// 연간 구하는 함수
export function getYearBranch(dateObj, year, lon = 127.5) {
    return getYearGanZhi(dateObj, lon).charAt(1);
}
// ================================================================= 월주 시작 //
export function getMonthBranch(dateObj, year, lon = 127.5) {
    return getMonthGanZhi(dateObj, lon).charAt(1);
}
// ================================================================= 일주 시작 //
export function getDayBranch(dateObj, rule) {
    return getDayGanZhi(dateObj, rule).charAt(1);
}
// ================================================================= 시주시작 //
export function getHourBranch(dateObj, rule, dayStemOverride) {
    return getHourGanZhi(dateObj, rule, dayStemOverride).charAt(1);
}
