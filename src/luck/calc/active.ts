// features/luck/utils/active.ts
export function findActiveIndexByDate<T extends { at: Date }>(
  events: T[],
  target?: Date
): number {
  const n = events.length;
  if (n === 0) return 0;
  if (!target) return 0;

  // 정렬 보장(안전)
  const first = events[0]!.at.getTime();
  const last = events[n - 1]!.at.getTime();

  const t = target.getTime();
  if (t <= first) return 0;
  if (t >= last) return n - 1;

  for (let i = 0; i < n - 1; i += 1) {
    const cur = events[i]!.at.getTime();
    const next = events[i + 1]!.at.getTime();
    // [cur, next) 구간
    if (t >= cur && t < next) return i;
  }
  // 이론상 도달X, 그래도 안전망
  return 0;
}
