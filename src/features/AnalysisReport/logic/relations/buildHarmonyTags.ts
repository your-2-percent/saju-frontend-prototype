// features/AnalysisReport/logic/relations/buildHarmonyTags.ts

import { POS, POS_LABELS, WEAK_SUFFIX } from "./constants";
import { SANHE_GROUPS, type KoBranch } from "./groups";
import { normalizeGZ, gzStem, gzBranch } from "./normalize";
import {
  AMHAP_BR_LABELS,
  BR_BANHAP_LABELS,
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
import {
  isYearHourPair,
  labelForPair,
  posMask,
  posToJuLabel,
  pushUnique,
  selectAllPairs,
  selectAllPairsSame,
} from "./coreUtils";
import { finalizeBuckets } from "./buckets";
import type { HarmonyOptions, RelationTags, Pillars4 } from "./types";

function findFirstIdxPerType(tags: string[], label: string): number {
  for (let i = 0; i < tags.length; i++) {
    if ((tags[i] ?? "").includes(label)) return i;
  }
  return -1;
}
function isBanhapWithWang(a: KoBranch, b: KoBranch): boolean {
  for (const g of SANHE_GROUPS) {
    if (g.wang !== a && g.wang !== b) continue;
    if (g.members.includes(a) && g.members.includes(b)) return true;
  }
  return false;
}


function addTagUniquePreferStrong(bucket: string[], tag: string, strongMarker: string) {
  const idx = findFirstIdxPerType(bucket, strongMarker);
  if (idx < 0) {
    pushUnique(bucket, tag);
    return;
  }
  const prev = bucket[idx] ?? "";
  const prevWeak = prev.includes(WEAK_SUFFIX);
  const nextWeak = tag.includes(WEAK_SUFFIX);
  if (prevWeak && !nextWeak) bucket[idx] = tag;
}

export function buildHarmonyTags(
  input: Pillars4,
  opts: HarmonyOptions = {},
): RelationTags {
  const { emitGanjiAmhap = true, fillNone = true } = opts;

  const pillars: Pillars4 = [
    normalizeGZ(input[0] ?? ""),
    normalizeGZ(input[1] ?? ""),
    normalizeGZ(input[2] ?? ""),
    normalizeGZ(input[3] ?? ""),
  ];

  const out: RelationTags = {
    title: "원국",
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
    amhap: [],
    ganjiAmhap: [],
  };

  const stems = pillars.map((gz) => gzStem(gz));
  const branches = pillars.map((gz) => gzBranch(gz) as KoBranch | "");

  // 1) 천간 합/충: 인접만 처리
  function addStemPairAdjacent(i: number, j: number) {
    if (i === j) return;
    const a = stems[i];
    const b = stems[j];
    if (!a || !b) return;
    const labelH = labelForPair(STEM_HAP_LABELS, a, b);
    if (labelH) pushUnique(out.cheonganHap, `#${POS_LABELS[i]}X${POS_LABELS[j]}_${labelH}`);
    const labelC = labelForPair(STEM_CHUNG_LABELS, a, b);
    if (labelC) pushUnique(out.cheonganChung, `#${POS_LABELS[i]}X${POS_LABELS[j]}_${labelC}`);
  }
  addStemPairAdjacent(POS.year, POS.month);
  addStemPairAdjacent(POS.month, POS.day);
  addStemPairAdjacent(POS.day, POS.hour);

  // 2) 지지 2자 관계(모든 조합)
  function addBranchPairsAllByLabel(
    a: KoBranch,
    b: KoBranch,
    label: string,
    bucket: string[],
    preferStrong = true,
  ) {
    const posA: number[] = [];
    const posB: number[] = [];
    for (let i = 0; i < 4; i++) {
      if (branches[i] === a) posA.push(i);
      if (branches[i] === b) posB.push(i);
    }
    const pairs = selectAllPairs(posA, posB);
    for (const [i, j] of pairs) {
      const weak = isYearHourPair(i, j);
      const tag = `#${POS_LABELS[i]}X${POS_LABELS[j]}_${label}${weak ? WEAK_SUFFIX : ""}`;
      if (weak) {
        pushUnique(bucket, tag);
        continue;
      }
      if (preferStrong) addTagUniquePreferStrong(bucket, tag, label);
      else pushUnique(bucket, tag);
    }
  }

  const applyBranch2 = (
    table: Array<{ pair: [string, string]; label: string }>,
    bucket: string[],
  ) => {
    for (const { pair: [a, b], label } of table) {
      addBranchPairsAllByLabel(a as KoBranch, b as KoBranch, label, bucket);
    }
  };

  applyBranch2(BR_YUKHAP_LABELS, out.jijiYukhap);
  applyBranch2(BR_CHUNG_LABELS, out.jijiChung);
  applyBranch2(BR_PA_LABELS, out.jijiPa);
  applyBranch2(BR_HAE_LABELS, out.jijiHae);
  applyBranch2(BR_WONJIN_LABELS, out.jijiWonjin);
  applyBranch2(BR_GWIMUN_LABELS, out.jijiGwimun);

  // 3) 지지 삼합(원국 3개가 모두 있을 때)
  for (const g of SANHE_GROUPS) {
    const has = g.members.every((m) => branches.includes(m));
    if (!has) continue;
    const idxs: number[] = [];
    for (let i = 0; i < 4; i++) {
      if (g.members.includes(branches[i] as KoBranch)) idxs.push(i);
    }
    const weak = idxs.includes(POS.year) && idxs.includes(POS.hour);
    const mask = posMask(idxs);
    pushUnique(out.jijiSamhap, `#${mask}_${g.name}삼합${weak ? WEAK_SUFFIX : ""}`);
  }

  // 4) 지지 반합(두 지지가 존재하면 모두)
  for (const { pair: [a, b], label } of BR_BANHAP_LABELS) {
    if (!isBanhapWithWang(a as KoBranch, b as KoBranch)) continue;
    addBranchPairsAllByLabel(a, b, label, out.jijiBanhap, false);
  }

  // 5) 지지 상형/삼형/자형
  for (const { pair: [a, b], label } of BR_SANGHYEONG_LABELS) {
    addBranchPairsAllByLabel(a as KoBranch, b as KoBranch, label, out.jijiHyeong);
  }

  for (const { pair: [a, b], label } of BR_ZAMYO_HYEONG_LABELS) {
    addBranchPairsAllByLabel(a as KoBranch, b as KoBranch, label, out.jijiHyeong);
  }

  for (const br of BR_SELF_HYEONG_ALLOWED) {
    const pos = branches
      .map((v, i) => (v === br ? i : -1))
      .filter((i) => i >= 0);
    if (pos.length < 2) continue;

    for (const [i, j] of selectAllPairsSame(pos)) {
      const weak = isYearHourPair(i, j);
      const tag = `#${POS_LABELS[i]}X${POS_LABELS[j]}_${br}자형${weak ? WEAK_SUFFIX : ""}`;
      addTagUniquePreferStrong(out.jijiHyeong, tag, `${br}자형`);
    }
  }

  // 6) 지지 암합(지지+지지)
  for (const { pair: [a, b], label } of AMHAP_BR_LABELS) {
    addBranchPairsAllByLabel(a as KoBranch, b as KoBranch, label, out.amhap);
  }

  // 7) 같은 기둥 간지암합(원국)
  if (emitGanjiAmhap) {
    for (let i = 0; i < 4; i++) {
      const gz = pillars[i] ?? "";
      if (gz.length < 2) continue;
      const pair = `${gz[0]}${gz[1]}`;
      if (GANJI_AMHAP_SET.has(pair)) {
        pushUnique(out.ganjiAmhap, `#${posToJuLabel(POS_LABELS[i]!)}_${pair}암합`);
      }
    }
  }

  const finalized = finalizeBuckets(out);

  if (fillNone) {
    for (const k of Object.keys(finalized) as Array<keyof RelationTags>) {
      if (k === "title") continue;
      const arr = finalized[k];
      if (Array.isArray(arr) && arr.length === 0) (finalized as RelationTags)[k] = ["#없음"];
    }
  }

  return finalized;
}
