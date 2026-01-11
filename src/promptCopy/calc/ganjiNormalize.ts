import { normalizeGZ } from "@/analysisReport/calc/logic/relations/normalize";

export function normalizeGZLocal(raw: string): string {
  return normalizeGZ(raw);
}

export function hasValidYmd(p: [string, string, string, string]): boolean {
  return p[0]?.length === 2 && p[1]?.length === 2 && p[2]?.length === 2;
}

export function normalizePillars(input?: string[] | null): string[] {
  const arr = Array.isArray(input) ? input.slice(0, 4) : [];
  while (arr.length < 4) arr.push("");

  return arr.map((raw, idx) => {
    const norm = normalizeGZ(raw ?? "");
    if (norm) return norm;
    return idx <= 2 ? "--" : "";
  });
}
