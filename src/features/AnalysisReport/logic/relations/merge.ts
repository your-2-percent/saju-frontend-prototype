// features/AnalysisReport/logic/relations/merge.ts

import { BUCKET_KEYS, isNoneTag, finalizeBuckets } from "./buckets";
import type { RelationTags } from "./types";

export function mergeRelationTags(a: RelationTags, b: RelationTags): RelationTags {
  const base: RelationTags = {
    title: a.title || b.title,
    cheonganHap: [],
    cheonganChung: [],
    jijiSamhap: [],
    jijiBanhap: [],
    jijiBanghap: [],
    jijiYukhap: [],
    jijiChung: [],
    jijiHyeong: [],
    jijiPa: [],
    jijiHae: [],
    jijiWonjin: [],
    jijiGwimun: [],
    ganjiAmhap: [],
    amhap: [],
  };

  for (const k of BUCKET_KEYS) {
    const merged = [...(a[k] ?? []), ...(b[k] ?? [])].filter((x) => !isNoneTag(x));
    base[k] = Array.from(new Set(merged));
  }

  // 불필요한 #없음 제거 + 중복/정리
  // (finalizeBuckets 에서 추가 정리까지 수행)
  // 불필요한 #없음 제거 + 중복/정리
  return finalizeBuckets(base);
}
