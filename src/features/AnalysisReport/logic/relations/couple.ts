// features/AnalysisReport/logic/relations/couple.ts

import { POS_LABELS } from "./constants";
import { normalizeGZ, gzStem, gzBranch } from "./normalize";
import {
  AMHAP_BR_LABELS,
  BR_CHUNG_LABELS,
  BR_GWIMUN_LABELS,
  BR_HAE_LABELS,
  BR_PA_LABELS,
  BR_SANGHYEONG_LABELS,
  BR_SELF_HYEONG_ALLOWED,
  BR_WONJIN_LABELS,
  BR_YUKHAP_LABELS,
  BR_ZAMYO_HYEONG_LABELS,
  GANJI_AMHAP_SET,
  STEM_CHUNG_LABELS,
  STEM_HAP_LABELS,
} from "./tables";
import { labelForPair } from "./coreUtils";
import type { CoupleHarmony, Pillars4 } from "./types";

type Pos = 0 | 1 | 2 | 3;

function posLabel(p: Pos) {
  return POS_LABELS[p];
}

function makeMapsForPerson(pillars: Pillars4) {
  const stemPos = new Map<string, Pos[]>();
  const branchPos = new Map<string, Pos[]>();

  for (let i = 0; i < 4; i++) {
    const gz = normalizeGZ(pillars[i] ?? "");
    const st = gzStem(gz);
    const br = gzBranch(gz);

    if (st) {
      stemPos.set(st, [...(stemPos.get(st) ?? []), i as Pos]);
    }
    if (br) {
      branchPos.set(br, [...(branchPos.get(br) ?? []), i as Pos]);
    }
  }

  return { stemPos, branchPos };
}

function maskPairsToStrings(label: string, aPos: Pos[], bPos: Pos[]) {
  const out: string[] = [];
  for (const ap of aPos) {
    for (const bp of bPos) {
      out.push(`#${posLabel(ap)}X${posLabel(bp)}_${label}`);
    }
  }
  return out;
}

export function buildCoupleHarmonyTags_AB(a: Pillars4, b: Pillars4): CoupleHarmony {
  const A = makeMapsForPerson(a);
  const B = makeMapsForPerson(b);

  const res: CoupleHarmony = {
    천간합: [],
    천간충: [],
    지지삼합: [],
    지지반합: [],
    지지방합: [],
    지지육합: [],
    암합: [],
    간지암합: [],
    지지충: [],
    지지형: [],
    지지파: [],
    지지해: [],
    지지원진: [],
    지지귀문: [],
  };

  const push = (arr: string[], v: string) => {
    if (!arr.includes(v)) arr.push(v);
  };

  for (const { pair: [x, y], label } of STEM_HAP_LABELS) {
    const aPos = [...(A.stemPos.get(x) ?? []), ...(A.stemPos.get(y) ?? [])];
    const bPos = [...(B.stemPos.get(x) ?? []), ...(B.stemPos.get(y) ?? [])];
    if (aPos.length && bPos.length) {
      for (const s of maskPairsToStrings(label, aPos, bPos)) push(res.천간합, s);
    }
  }

  for (const { pair: [x, y], label } of STEM_CHUNG_LABELS) {
    const aPos = [...(A.stemPos.get(x) ?? []), ...(A.stemPos.get(y) ?? [])];
    const bPos = [...(B.stemPos.get(x) ?? []), ...(B.stemPos.get(y) ?? [])];
    if (aPos.length && bPos.length) {
      for (const s of maskPairsToStrings(label, aPos, bPos)) push(res.천간충, s);
    }
  }

  const pushBranchPair = (
    bucket: keyof Pick<
      CoupleHarmony,
      "지지육합" | "지지충" | "지지파" | "지지해" | "지지원진" | "지지귀문"
    >,
    table: Array<{ pair: [string, string]; label: string }>,
  ) => {
    const keysA = Array.from(A.branchPos.keys());
    const keysB = Array.from(B.branchPos.keys());

    for (const ba of keysA) {
      for (const bb of keysB) {
        const lab = labelForPair(table, ba, bb);
        if (!lab) continue;
        const aPos = A.branchPos.get(ba) ?? [];
        const bPos = B.branchPos.get(bb) ?? [];
        for (const s of maskPairsToStrings(lab, aPos, bPos)) push(res[bucket], s);
      }
    }
  };

  pushBranchPair("지지육합", BR_YUKHAP_LABELS);
  pushBranchPair("지지충", BR_CHUNG_LABELS);
  pushBranchPair("지지파", BR_PA_LABELS);
  pushBranchPair("지지해", BR_HAE_LABELS);
  pushBranchPair("지지원진", BR_WONJIN_LABELS);
  pushBranchPair("지지귀문", BR_GWIMUN_LABELS);

  // 지지형
  pushBranchPair("지지형", BR_SANGHYEONG_LABELS);
  pushBranchPair("지지형", BR_ZAMYO_HYEONG_LABELS);

  for (const br of BR_SELF_HYEONG_ALLOWED) {
    const aPos = A.branchPos.get(br) ?? [];
    const bPos = B.branchPos.get(br) ?? [];
    if (!aPos.length || !bPos.length) continue;
    for (const s of maskPairsToStrings(`${br}자형`, aPos, bPos)) push(res.지지형, s);
  }

  // 암합(지지)
  for (const { label: lab, pair: [x, y] } of AMHAP_BR_LABELS) {
    const aPos = [...(A.branchPos.get(x) ?? []), ...(A.branchPos.get(y) ?? [])];
    const bPos = [...(B.branchPos.get(x) ?? []), ...(B.branchPos.get(y) ?? [])];
    if (!aPos.length || !bPos.length) continue;
    for (const s of maskPairsToStrings(lab, aPos, bPos)) push(res.암합, s);
  }

  // 간지암합(같은 기둥)
  {
    const keysA = Array.from(A.stemPos.keys());
    const keysB = Array.from(B.stemPos.keys());
    for (const As of keysA) {
      for (const Bs of keysB) {
        const aStemPos = A.stemPos.get(As) ?? [];
        const bStemPos = B.stemPos.get(Bs) ?? [];

        for (const ap of aStemPos) {
          const Ab = gzBranch(normalizeGZ(a[ap] ?? ""));
          const cg1 = `${As}${Ab}`;
          if (!GANJI_AMHAP_SET.has(cg1)) continue;

          for (const bp of bStemPos) {
            const Bb = gzBranch(normalizeGZ(b[bp] ?? ""));
            const cg2 = `${Bs}${Bb}`;
            if (cg2 !== cg1) continue;
            push(res.간지암합, `#${posLabel(ap)}X${posLabel(bp)}_${cg1}간지암합`);
          }
        }
      }
    }
  }

  return res;
}
