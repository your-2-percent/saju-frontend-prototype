import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from '@/shared/domain/간지/공통';
// ───────────────────────── 연/월/일/시 간지의 '간(천간)'만 추출 ─────────────────────────
// 연간
export function getYearStem(dateObj, lon = 127.5) {
    const gz = getYearGanZhi(dateObj, lon) || "";
    return gz.charAt(0);
}
// 월간
export function getMonthStem(dateObj, lon = 127.5) {
    const gz = getMonthGanZhi(dateObj, lon) || "";
    return gz.charAt(0);
}
// 일간
export function getDayStem(dateObj, rule) {
    const gz = getDayGanZhi(dateObj, rule) || "";
    return gz.charAt(0);
}
// 시간
export function getHourStem(dateObj, rule, dayStemOverride) {
    const gz = getHourGanZhi(dateObj, rule, dayStemOverride) || "";
    return gz.charAt(0);
}
