import { BRANCH_H2K, BRANCH_MAIN_STEM, STEM_H2K } from "@/features/prompt/calc/ganjiMaps";

export function normalizeStemLike(token: string): string | null {
  if (!token) return null;
  const s = token.trim();

  if (["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"].includes(s)) {
    return s;
  }

  if (STEM_H2K[s]) return STEM_H2K[s];

  if (["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"].includes(s)) {
    return BRANCH_MAIN_STEM[s] ?? null;
  }

  if (BRANCH_H2K[s]) return BRANCH_MAIN_STEM[BRANCH_H2K[s]] ?? null;

  const first = s.charAt(0);

  if (STEM_H2K[first]) return STEM_H2K[first];
  if (["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"].includes(first)) {
    return first;
  }
  if (BRANCH_H2K[first]) return BRANCH_MAIN_STEM[BRANCH_H2K[first]] ?? null;
  if (["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"].includes(first)) {
    return BRANCH_MAIN_STEM[first] ?? null;
  }
  return null;
}

export function toBareStemMap(
  input: Record<string, number> | undefined
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (v <= 0) continue;
    const stemKo = normalizeStemLike(k);
    if (!stemKo) continue;
    out[stemKo] = (out[stemKo] ?? 0) + v;
  }
  return out;
}

export function stemsFromGZ(gz: string): string[] {
  if (!gz) return [];
  const s = normalizeStemLike(gz.charAt(0));
  const b = normalizeStemLike(gz.charAt(1));
  return [s, b].filter(Boolean) as string[];
}

export function toBareFromGZ(gz: string): Record<string, number> {
  const stems = stemsFromGZ(gz);
  const out: Record<string, number> = {};
  for (const s of stems) out[s] = (out[s] ?? 0) + 1;
  return out;
}
