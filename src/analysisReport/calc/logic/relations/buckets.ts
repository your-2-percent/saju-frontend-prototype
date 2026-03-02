// features/AnalysisReport/logic/relations/buckets.ts

import type { RelationTags } from "./types";
import { SANHE_GROUPS } from "./groups";
import { BR_BANHAP_LABELS } from "./tables";

export function isNoneTag(s: string | undefined | null): boolean {
  if (!s) return false;
  const t = s.normalize("NFC").trim();
  return /^#\s*없음$/u.test(t);
}

export type BucketKey = Exclude<keyof RelationTags, "title">;

export const BUCKET_KEYS = [
  "cheonganHap",
  "cheonganChung",
  "jijiSamhap",
  "jijiBanhap",
  "jijiBanghap",
  "jijiYukhap",
  "jijiChung",
  "jijiHyeong",
  "jijiPa",
  "jijiHae",
  "jijiWonjin",
  "jijiGwimun",
  "amhap",
  "ganjiAmhap",
] as const satisfies ReadonlyArray<BucketKey>;

// 삼형이 있을 때 쌍형 태그는 제거
export function suppressPairHyeongWhenTriad(hyeongTags: string[]): string[] {
  if (!hyeongTags || hyeongTags.length === 0) return hyeongTags;

  const tags = Array.from(new Set(hyeongTags.map((t) => t?.normalize("NFKC") ?? ""))).filter(Boolean);

  const hasInsasinTriad = tags.some((t) => t.includes("인사신삼형") || t.includes("삼형(인사신)"));
  const hasChuksulmiTriad = tags.some((t) => t.includes("축술미삼형") || t.includes("삼형(축술미)"));

  return tags.filter((t) => {
    if (hasInsasinTriad && (t.includes("인신형") || t.includes("인사형") || t.includes("사신형"))) return false;
    if (hasChuksulmiTriad && (t.includes("축술형") || t.includes("축미형") || t.includes("술미형"))) return false;
    return true;
  });
}

// 지지삼합이 성립한 그룹의 반합은 표시하지 않음
function suppressBanhapWhenSamhap(banhapTags: string[], samhapTags: string[]): string[] {
  if (!banhapTags || banhapTags.length === 0) return banhapTags;
  if (!samhapTags || samhapTags.length === 0) return banhapTags;

  const samhap = Array.from(new Set(samhapTags.map((t) => t?.normalize("NFKC") ?? ""))).filter(Boolean);
  const banhap = Array.from(new Set(banhapTags.map((t) => t?.normalize("NFKC") ?? ""))).filter(Boolean);

  const activeSanhapGroups = new Set(
    SANHE_GROUPS
      .filter((g) => samhap.some((t) => t.includes(`${g.name}삼합`) || t.includes(`삼합(${g.name})`)))
      .map((g) => g.name),
  );
  if (activeSanhapGroups.size === 0) return banhap;

  const banhapLabelsByGroup = new Map<string, Set<string>>();
  for (const g of SANHE_GROUPS) {
    const labels = BR_BANHAP_LABELS
      .filter(({ pair: [a, b] }) => g.members.includes(a) && g.members.includes(b))
      .map(({ label }) => label);
    banhapLabelsByGroup.set(g.name, new Set(labels));
  }

  return banhap.filter((tag) => {
    for (const groupName of activeSanhapGroups) {
      const labels = banhapLabelsByGroup.get(groupName);
      if (!labels) continue;
      for (const lab of labels) {
        if (tag.includes(lab)) return false;
      }
    }
    return true;
  });
}

export function finalizeBuckets(out: RelationTags): RelationTags {
  for (const k of BUCKET_KEYS) {
    const raw = (out[k] ?? []) as string[];
    const cleaned = raw
      .map((s) => s && s.normalize("NFKC"))
      .filter((t): t is string => !!t && !isNoneTag(t));

    out[k] = Array.from(new Set(cleaned));
  }

  out.jijiHyeong = suppressPairHyeongWhenTriad(out.jijiHyeong);
  out.jijiBanhap = suppressBanhapWhenSamhap(out.jijiBanhap, out.jijiSamhap);

  return out;
}
