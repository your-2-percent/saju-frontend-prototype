// src/domain/운/luck.ts
import { getYearGanZhi, getMonthGanZhi, } from "@/shared/domain/간지/공통";
import { findSolarTermUTC } from "@/shared/domain/solar-terms";
import { 천간, 지지 } from "@/shared/domain/간지/const";
// 간지 유틸
const SIXTY = (() => {
    const arr = [];
    for (let i = 0; i < 60; i++)
        arr.push(`${천간[i % 10]}${지지[i % 12]}`);
    return arr;
})();
const gzIndex = (gz) => SIXTY.indexOf(gz);
export const splitGanzhi = (gz) => {
    const i = gzIndex(gz);
    if (i < 0)
        throw new Error(`Unknown 간지: ${gz}`);
    return { stem: gz[0], branch: gz[1] };
};
// 세운 10개 — 입춘 직후 1분 샘플
export function buildSeunListFromStart(firstBlockYear, count = 10) {
    const out = [];
    for (let i = 0; i < count; i++) {
        const y = firstBlockYear + i;
        const ipchunUTC = findSolarTermUTC(y, 315); // 315° = 입춘
        const sample = new Date(ipchunUTC.getTime() + 60_000);
        // getYearGanZhi가 (date, year?) 시그니처면 두 번째 인자 넣어도 됨.
        const yearGZ = getYearGanZhi(sample, y);
        out.push({ year: y, yearGZ });
    }
    return out;
}
// 월운 12개 — 절기(입춘~소한) 기준 직후 1분 샘플
export function buildWolunListByTerms(yearForIpchun) {
    // 입춘~소한 순서(라벨: 2~12월, 마지막 1월은 다음 해)
    const PLAN = [
        { label: "2월", y: yearForIpchun, deg: 315 }, // 입춘
        { label: "3월", y: yearForIpchun, deg: 345 }, // 경칩
        { label: "4월", y: yearForIpchun, deg: 15 }, // 청명
        { label: "5월", y: yearForIpchun, deg: 45 }, // 입하
        { label: "6월", y: yearForIpchun, deg: 75 }, // 망종
        { label: "7월", y: yearForIpchun, deg: 105 }, // 소서
        { label: "8월", y: yearForIpchun, deg: 135 }, // 입추
        { label: "9월", y: yearForIpchun, deg: 165 }, // 백로
        { label: "10월", y: yearForIpchun, deg: 195 }, // 한로
        { label: "11월", y: yearForIpchun, deg: 225 }, // 입동
        { label: "12월", y: yearForIpchun, deg: 255 }, // 대설
        { label: "1월", y: yearForIpchun + 1, deg: 285 }, // 소한(다음 해)
    ];
    return PLAN.map(({ label, y, deg }) => {
        const term = findSolarTermUTC(y, deg);
        const sample = new Date(term.getTime() + 60_000);
        const monthGZ = getMonthGanZhi(sample, sample.getFullYear());
        return { label, sampleAt: sample, monthGZ };
    });
}
// 표시용 라벨: "YYYY–YYYY+9"
export const yearsLabel10 = (startAt) => `${startAt.getFullYear()}–${startAt.getFullYear() + 9}`;
