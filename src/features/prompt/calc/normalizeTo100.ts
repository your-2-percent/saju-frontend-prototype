export function normalizeTo100(obj: Record<string, number>): Record<string, number> {
  const entries = Object.entries(obj) as [string, number][];
  const sum = entries.reduce((a, [, v]) => a + (v > 0 ? v : 0), 0);
  if (sum <= 0) {
    return Object.fromEntries(entries.map(([k]) => [k, 0])) as Record<string, number>;
  }

  const raw = entries.map(([k, v]) => [k, (v > 0 ? v : 0) * 100 / sum] as const);
  const floored = raw.map(([k, x]) => [k, Math.floor(x)] as const);
  let used = floored.reduce((a, [, x]) => a + x, 0);

  const rema = raw
    .map(([k, x]) => [k, x - Math.floor(x)] as const)
    .sort((a, b) => b[1] - a[1]);

  const out: Record<string, number> = Object.fromEntries(
    floored.map(([k, x]) => [k, x])
  ) as Record<string, number>;

  let i = 0;
  while (used < 100 && i < rema.length) {
    out[rema[i][0]] += 1;
    used += 1;
    i += 1;
  }

  return out;
}
