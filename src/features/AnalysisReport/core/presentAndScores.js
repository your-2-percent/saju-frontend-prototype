import { STEM_TO_ELEMENT, BRANCH_MAIN_ELEMENT } from "./common";
/** 원국(4주) 내 오행 존재 여부 */
export function elementPresenceFromPillars(p) {
    const present = { 목: false, 화: false, 토: false, 금: false, 수: false };
    for (const gz of p) {
        if (!gz)
            continue;
        const se = STEM_TO_ELEMENT[gz.charAt(0)];
        const be = BRANCH_MAIN_ELEMENT[gz.charAt(1)];
        if (se)
            present[se] = true;
        if (be)
            present[be] = true;
    }
    return present;
}
/** 간단 오행 점수(폴백용) */
export function lightElementScoreFromPillars(p) {
    const acc = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    for (const gz of p) {
        if (!gz)
            continue;
        const se = STEM_TO_ELEMENT[gz.charAt(0)];
        const be = BRANCH_MAIN_ELEMENT[gz.charAt(1)];
        if (se)
            acc[se] += 10;
        if (be)
            acc[be] += 6;
    }
    return acc;
}
