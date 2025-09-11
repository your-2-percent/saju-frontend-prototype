export function findActiveIndexByDate<T extends { at: Date }>(events: T[], target: Date): number {
  if (events.length === 0) return -1;
  for (let i = 0; i < events.length; i += 1) {
    const cur = events[i]!.at;
    const next = events[i + 1]?.at;
    if (!next) return target >= cur ? i : i - 1;
    if (target >= cur && target < next) return i;
  }
  return -1;
}
