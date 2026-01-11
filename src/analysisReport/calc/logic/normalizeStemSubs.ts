// features/AnalysisReport/logic/normalizeStemSubs.ts

/** 10간 타입 */
export type StemSub = 
  | "갑목" | "을목"
  | "병화" | "정화"
  | "무토" | "기토"
  | "경금" | "신금"
  | "임수" | "계수";

/** 모든 10간 고정 리스트 */
const ALL_STEMS: StemSub[] = [
  "갑목","을목","병화","정화",
  "무토","기토","경금","신금",
  "임수","계수",
];

export type SubItem = { key: StemSub; value: number };

/**
 * 천간 소분류 값 정규화
 * - 항상 10간 다 출력
 * - 없는 값은 0으로 채움
 * - 합계 100으로 맞춤
 */
export function normalizeStemSubs(
  raw: Partial<Record<StemSub, number>>
): SubItem[] {
  // 0도 포함해서 모두 생성
  const entries: SubItem[] = ALL_STEMS.map(stem => ({
    key: stem,
    value: raw[stem] ?? 0,
  }));

  const total = entries.reduce((a, b) => a + b.value, 0);

  if (total === 0) {
    // 전부 0 → 그냥 0% 유지
    return entries.map(e => ({ ...e, value: 0 }));
  }

  // 100으로 정규화
  return entries.map(e => ({
    key: e.key,
    value: (e.value / total) * 100,
  }));
}
