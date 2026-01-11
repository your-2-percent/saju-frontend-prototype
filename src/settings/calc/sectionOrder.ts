export const DEFAULT_SECTION_KEYS = [
  "theme",
  "hiddenStem",
  "hiddenStemMode",
  "sinsalMode",
  "sinsalBase",
  "sinsalBloom",
  "exposure",
  "charType",
  "thinEum",
  "visibility",
  "difficultyMode",
] as const;

export type SectionKey = (typeof DEFAULT_SECTION_KEYS)[number];

export function isSectionKey(v: unknown): v is SectionKey {
  return typeof v === "string" && (DEFAULT_SECTION_KEYS as readonly string[]).includes(v);
}

export function normalizeSectionOrder(saved: unknown): SectionKey[] {
  const base = Array.isArray(saved) ? (saved as unknown[]).filter(isSectionKey) : [];
  const missing = (DEFAULT_SECTION_KEYS as readonly SectionKey[]).filter((k) => !base.includes(k));
  return [...base, ...missing];
}
