/** 방향 */
export type Direction = "forward" | "backward";
/** 일수론 기준: 일주가 바뀌는 '지지' 트리거 */
export type DayChangeRule = "자시일수론" | "인시일수론";
/** 대운 첫 전환 정렬 방식 */
export type WoljuAlign = "prev-grid" | "dir-delta";
// 시간 기준
export type DayBoundaryRule = "야자시" | "조자시" | "인시";