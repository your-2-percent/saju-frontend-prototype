export const mod = (n: number, m: number) => ((n % m) + m) % m;
export const posMod = (n: number, m: number) => ((n % m) + m) % m;
export const isValidDate = (d: unknown): d is Date => d instanceof Date && !Number.isNaN(d.getTime());
