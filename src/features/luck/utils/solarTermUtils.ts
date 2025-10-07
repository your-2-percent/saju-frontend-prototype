// shared/domain/간지/solarTermUtils.ts
import { getSolarTermBoundaries } from "@/features/myoun";

export const JIE_SET = new Set([
  "입춘","경칩","청명","입하","망종","소서",
  "입추","백로","한로","입동","대설","소한"
]);

export function getJieRangeByDate(target: Date) {
  const year = target.getFullYear();
  const tables = [
    ...(getSolarTermBoundaries(new Date(year - 1, 5, 15, 12, 0)) ?? []),
    ...(getSolarTermBoundaries(new Date(year, 5, 15, 12, 0)) ?? []),
    ...(getSolarTermBoundaries(new Date(year + 1, 5, 15, 12, 0)) ?? []),
  ]
    .map(t => ({ name: String(t.name), date: new Date(t.date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  const jie = tables.filter(t => JIE_SET.has(t.name));
  let i = jie.findIndex((_, k) => jie[k].date <= target && target < jie[k + 1]?.date);
  if (i < 0) i = 0;

  const cur = jie[i];
  const next = jie[i + 1];
  return {
    start: new Date(cur.date.getFullYear(), cur.date.getMonth(), cur.date.getDate(), 0, 0, 0, 0),
    end: new Date(next.date.getFullYear(), next.date.getMonth(), next.date.getDate(), 0, 0, 0, 0),
    cur,
    next,
  };
}
