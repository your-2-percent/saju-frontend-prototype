// features/AnalysisReport/logic/gyeokguk/mulsang.ts
import { MULSANG_PAIR_TAGS, MULSANG_TRI_TAGS, pairKey, triKey } from "./rules";
import { stemKoOf } from "./utils";

// StemKo는 물상 태그 매칭 전용(한글 천간)
type StemKo = "갑"|"을"|"병"|"정"|"무"|"기"|"경"|"신"|"임"|"계";

export function detectMulsangTerms(pillars: [string, string, string, string]): string[] {
  const [y, m, d, h] = pillars;

  const hs = stemKoOf(h);
  const ds = stemKoOf(d);
  const ms = stemKoOf(m);
  const ys = stemKoOf(y);

  const tags: string[] = [];

  // --- 인접 2간 (시-일, 일-월, 월-연)
  const pairs: Array<[StemKo | "", StemKo | ""]> = [
    [hs, ds],
    [ds, ms],
    [ms, ys],
  ];

  for (const [a, b] of pairs) {
    if (!a || !b) continue;
    const key = pairKey(a, b);
    const found = MULSANG_PAIR_TAGS[key];
    if (found?.length) tags.push(...found);

    const rev = pairKey(b, a);
    if (rev !== key) {
      const foundRev = MULSANG_PAIR_TAGS[rev];
      if (foundRev?.length) tags.push(...foundRev);
    }
  }

  // --- 인접 3간
  const tris: Array<[StemKo | "", StemKo | "", StemKo | ""]> = [
    [hs, ds, ms],
    [ds, ms, ys],
  ];

  for (const [a, b, c] of tris) {
    if (!a || !b || !c) continue;
    const key = triKey(a, b, c);
    const found = MULSANG_TRI_TAGS[key];
    if (found?.length) tags.push(...found);

    const rev = triKey(c, b, a);
    if (rev !== key) {
      const foundRev = MULSANG_TRI_TAGS[rev];
      if (foundRev?.length) tags.push(...foundRev);
    }
  }

  return Array.from(new Set(tags));
}
