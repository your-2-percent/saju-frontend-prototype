export const PILLAR_ORDER = ["year", "month", "day", "hour"];
// 현대 가중치
export const WEIGHTS_MODERN = {
    year: { stem: 10, branch: 10 },
    month: { stem: 15, branch: 25 },
    day: { stem: 25, branch: 20 },
    hour: { stem: 15, branch: 12.5 },
};
// 고전 가중치
export const WEIGHTS_CLASSIC = {
    year: { stem: 10, branch: 10 },
    month: { stem: 15, branch: 50 },
    day: { stem: 25, branch: 40 },
    hour: { stem: 15, branch: 12.5 },
};
export function selectWeights(mode) {
    return mode === "classic" ? WEIGHTS_CLASSIC : WEIGHTS_MODERN;
}
