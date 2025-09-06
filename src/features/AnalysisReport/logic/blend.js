import { STEM_TO_ELEMENT as STEM_TO_EL, BRANCH_MAIN_ELEMENT as BRANCH_TO_EL } from "../utils/hiddenStem";
/** 간지 한 쌍에서 오행 점수(간:50, 지:50) — 절대값 100 내외 */
export function elementScoreFromGZ(gz) {
    const out = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    if (!gz || gz.length < 2)
        return out;
    const s = gz.charAt(0), b = gz.charAt(1);
    const se = STEM_TO_EL[s];
    const be = BRANCH_TO_EL[b];
    if (se)
        out[se] += 50;
    if (be)
        out[be] += 50;
    return out;
}
const round1 = (n) => Math.round(n * 10) / 10;
/** 절대 스코어 → 퍼센트(합=100, 소수1자리) */
export function toPercent(m) {
    const sum = (m.목 + m.화 + m.토 + m.금 + m.수) || 1;
    return {
        목: round1((m.목 / sum) * 100),
        화: round1((m.화 / sum) * 100),
        토: round1((m.토 / sum) * 100),
        금: round1((m.금 / sum) * 100),
        수: round1((m.수 / sum) * 100),
    };
}
/** 퍼센트 벡터끼리 가중합 */
function mixPercent(a, wa, b, wb, c, wc, d, wd) {
    // 실제 들어온 항목만으로 가중치 재정규화
    const used = [
        { v: a, w: wa }, { v: b, w: wb }, { v: c, w: wc }, { v: d, w: wd },
    ].filter(x => x.v && x.w > 0);
    const wsum = used.reduce((s, x) => s + x.w, 0) || 1;
    used.forEach(x => { x.w = x.w / wsum; });
    const out = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    for (const { v, w } of used) {
        out.목 += v.목 * w;
        out.화 += v.화 * w;
        out.토 += v.토 * w;
        out.금 += v.금 * w;
        out.수 += v.수 * w;
    }
    // 마지막도 100%로 정규화(반올림 오차 수습)
    return toPercent(out);
}
export const BLEND_TABS = ["원국", "대운", "세운", "월운"];
export const BLEND_WEIGHTS = {
    "원국": { natal: 1.00 },
    "대운": { natal: 0.60, dae: 0.40 },
    "세운": { natal: 0.50, dae: 0.30, se: 0.20 },
    "월운": { natal: 0.40, dae: 0.30, se: 0.20, wol: 0.10 },
};
export function blendElementStrength(params) {
    const { natalElementScore, daewoonGz, sewoonGz, wolwoonGz, tab } = params;
    const w = BLEND_WEIGHTS[tab];
    // 1) 각 소스별 '퍼센트' 분포로 변환
    const natalPct = toPercent(natalElementScore);
    const daePct = daewoonGz ? toPercent(elementScoreFromGZ(daewoonGz)) : null;
    const sePct = sewoonGz ? toPercent(elementScoreFromGZ(sewoonGz)) : null;
    const wolPct = wolwoonGz ? toPercent(elementScoreFromGZ(wolwoonGz)) : null;
    // 2) (존재하는) 소스끼리 가중합 → 100%로 다시 정규화
    return mixPercent(natalPct, (w.natal ?? 0), daePct, (w.dae ?? 0), sePct, (w.se ?? 0), wolPct, (w.wol ?? 0));
}
