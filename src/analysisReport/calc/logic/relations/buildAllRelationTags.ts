// features/AnalysisReport/logic/relations/buildAllRelationTags.ts

import {
  LUCK_ORDER,
  POS_LABELS,
  type LuckKind,
  type PosLabel,
} from "./constants";
import {
  BANGHAP_GROUPS,
  SANHE_GROUPS,
  TRIAD_SHAPE_GROUPS,
  type KoBranch,
} from "./groups";
import { normalizeGZ, gzStem, gzBranch, BRANCH_H2K } from "./normalize";
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
import { labelForPair, posToJuLabel, pushUnique } from "./coreUtils";
import { finalizeBuckets } from "./buckets";
import type { LuckOptions, Pillars4, RelationTags } from "./types";

function isBanhapWithWang(a: KoBranch, b: KoBranch): boolean {
  for (const g of SANHE_GROUPS) {
    if (g.wang !== a && g.wang !== b) continue;
    if (g.members.includes(a) && g.members.includes(b)) return true;
  }
  return false;
}

function selectAllPairs(posA: number[], posB: number[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const seen = new Set<string>();
  for (const i of posA) {
    for (const j of posB) {
      if (i === j) continue;
      const a = Math.min(i, j);
      const b = Math.max(i, j);
      const key = `${a}-${b}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([a, b]);
    }
  }
  return out;
}

export function buildAllRelationTags(
  input: {
    natal: Pillars4;
    daewoon?: string;
    sewoon?: string;
    wolwoon?: string;
    ilwoon?: string;
  },
  opts: LuckOptions = {},
): RelationTags {
  const { emitNatalGanjiAmhap = false } = opts;

  const natalKo: Pillars4 = [
    normalizeGZ(input.natal[0] ?? ""),
    normalizeGZ(input.natal[1] ?? ""),
    normalizeGZ(input.natal[2] ?? ""),
    normalizeGZ(input.natal[3] ?? ""),
  ];

  const luckKoList = [
    normalizeGZ(input.daewoon ?? ""),
    normalizeGZ(input.sewoon ?? ""),
    normalizeGZ(input.wolwoon ?? ""),
  ];
  const hasLuck = luckKoList.some((s) => s.length >= 2);

  const out: RelationTags = {
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

  const natalBranches: Array<KoBranch | ""> = natalKo.map((gz) => {
    const br = gzBranch(gz ?? "");
    return (BRANCH_H2K[br] ?? br) as KoBranch;
  });

  // 원국 반합 (왕지 포함만)
  for (const { pair: [a, b], label } of BR_BANHAP_LABELS) {
    if (!isBanhapWithWang(a as KoBranch, b as KoBranch)) continue;
    const posA: number[] = [];
    const posB: number[] = [];
    for (let i = 0; i < 4; i++) {
      if (natalBranches[i] === (a as KoBranch)) posA.push(i);
      if (natalBranches[i] === (b as KoBranch)) posB.push(i);
    }
    const pairs = selectAllPairs(posA, posB);
    for (const [i, j] of pairs) {
      const tag = `#${POS_LABELS[i]}X${POS_LABELS[j]}_${label}`;
      pushUnique(out.jijiBanhap, tag);
    }
  }

  // (옵션 ON + 운 존재)일 때만 원국 간지암합 생성
  if (emitNatalGanjiAmhap && hasLuck) {
    for (let i = 0; i < 4; i++) {
      const gz = natalKo[i] ?? "";
      if (gz.length < 2) continue;
      const pair = `${gz[0]}${gz[1]}`;
      if (GANJI_AMHAP_SET.has(pair)) {
        pushUnique(out.ganjiAmhap, `#${posToJuLabel(POS_LABELS[i]!)}_${pair}암합`);
      }
    }
  }

  const lucks: Array<[LuckKind, string | undefined | null]> = [
    ["대운", input.daewoon],
    ["세운", input.sewoon],
    ["월운", input.wolwoon],
    ["일운", input.ilwoon],
  ];

  let hasTriadInsasin = false;
  let hasTriadChuksulmi = false;

  for (const [kind, rawLuck] of lucks) {
    if (!rawLuck) continue;
    const luckKo = normalizeGZ(rawLuck);
    if (!luckKo || luckKo.length < 2) continue;

    const ls = gzStem(luckKo);
    const lb = gzBranch(luckKo) as KoBranch;

    // 운 자체 간지암합(같은 기둥)
    {
      const pair = `${ls}${lb}`;
      if (GANJI_AMHAP_SET.has(pair)) {
        pushUnique(out.ganjiAmhap, `#${kind}_${pair}암합`);
      }
    }

    // 운 1개 + 원국 1개 조합
    for (let i = 0; i < 4; i++) {
      const gz = natalKo[i] ?? "";
      if (gz.length < 2) continue;
      const pos = POS_LABELS[i]!;
      const ns = gzStem(gz);
      const nb = gzBranch(gz) as KoBranch;

      const hap = labelForPair(STEM_HAP_LABELS, ls, ns);
      if (hap) pushUnique(out.cheonganHap, `#${kind}X${pos}_${hap}`);
      const cgChung = labelForPair(STEM_CHUNG_LABELS, ls, ns);
      if (cgChung) pushUnique(out.cheonganChung, `#${kind}X${pos}_${cgChung}`);

      const yukhap = labelForPair(BR_YUKHAP_LABELS, lb, nb);
      if (yukhap) pushUnique(out.jijiYukhap, `#${kind}X${pos}_${yukhap}`);
      const brChung = labelForPair(BR_CHUNG_LABELS, lb, nb);
      if (brChung) pushUnique(out.jijiChung, `#${kind}X${pos}_${brChung}`);
      const pa = labelForPair(BR_PA_LABELS, lb, nb);
      if (pa) pushUnique(out.jijiPa, `#${kind}X${pos}_${pa}`);
      const hae = labelForPair(BR_HAE_LABELS, lb, nb);
      if (hae) pushUnique(out.jijiHae, `#${kind}X${pos}_${hae}`);
      const wonjin = labelForPair(BR_WONJIN_LABELS, lb, nb);
      if (wonjin) pushUnique(out.jijiWonjin, `#${kind}X${pos}_${wonjin}`);
      const gwimun = labelForPair(BR_GWIMUN_LABELS, lb, nb);
      if (gwimun) pushUnique(out.jijiGwimun, `#${kind}X${pos}_${gwimun}`);

      const sang = labelForPair(BR_SANGHYEONG_LABELS, lb, nb);
      if (sang) pushUnique(out.jijiHyeong, `#${kind}X${pos}_${sang}`);
      else {
        const zamyo = labelForPair(BR_ZAMYO_HYEONG_LABELS, lb, nb);
        if (zamyo) pushUnique(out.jijiHyeong, `#${kind}X${pos}_${zamyo}`);
        else if (lb === nb && BR_SELF_HYEONG_ALLOWED.has(lb as KoBranch)) {
          pushUnique(out.jijiHyeong, `#${kind}X${pos}_${lb}${nb}자형`);
        }
      }

      const amhap = labelForPair(AMHAP_BR_LABELS, lb, nb);
      if (amhap) pushUnique(out.amhap, `#${kind}X${pos}_${amhap}`);
    }

    // 운 포함 3자 완성(삼합/삼형) — 운 1개 + 원국 2개만 허용
    for (const g of SANHE_GROUPS) {
      if (!g.members.includes(lb as KoBranch)) continue;
      const others = g.members.filter((x) => x !== (lb as KoBranch));
      const hits = natalBranches
        .map((b, i) => ({ b, pos: POS_LABELS[i]! }))
        .filter((o) => o.b && others.includes(o.b));

      if (new Set(hits.map((h) => h.b)).size === 2) {
        const [p1, p2] = hits
          .map((h) => h.pos)
          .sort((a, b) => POS_LABELS.indexOf(a) - POS_LABELS.indexOf(b)) as [PosLabel, PosLabel];

        pushUnique(out.jijiSamhap, `#${kind}X${p1}X${p2}_삼합(${g.name})`);
      }
    }

    for (const g of TRIAD_SHAPE_GROUPS) {
      if (!g.members.includes(lb as KoBranch)) continue;
      const others = g.members.filter((x) => x !== (lb as KoBranch));
      const hits = natalBranches
        .map((b, i) => ({ b, pos: POS_LABELS[i]! }))
        .filter((o) => o.b && others.includes(o.b));

      if (new Set(hits.map((h) => h.b)).size === 2) {
        const [p1, p2] = hits
          .map((h) => h.pos)
          .sort((a, b) => POS_LABELS.indexOf(a) - POS_LABELS.indexOf(b)) as [PosLabel, PosLabel];

        pushUnique(out.jijiHyeong, `#${kind}X${p1}X${p2}_${g.name}삼형`);
        if (g.name === "인사신") hasTriadInsasin = true;
        if (g.name === "축술미") hasTriadChuksulmi = true;
      }
    }

    // 방합은 원국 기준(운 포함하지 않음)
    const allBranches: Array<{ b: KoBranch; pos: string }> = [
      ...natalKo.map((gz, i) => ({
        b: (BRANCH_H2K[gzBranch(gz)] ?? gzBranch(gz)) as KoBranch,
        pos: POS_LABELS[i]!,
      })),
    ];

    for (const g of BANGHAP_GROUPS) {
      const hits = allBranches.filter((o) => g.members.includes(o.b));
      if (new Set(hits.map((h) => h.b)).size === 3) {
        const mask = hits.map((h) => h.pos).join("X");
        pushUnique(out.jijiBanghap, `#${mask}_방합(${g.name})`);
      }
    }
  }

  // 운 2개 + 원국 1개 삼형
  {
    const luckBranches: Array<{ kind: LuckKind; b: KoBranch }> = [];
    const maybeLuck: Array<[LuckKind, string | undefined | null]> = [
      ["대운", input.daewoon],
      ["세운", input.sewoon],
      ["월운", input.wolwoon],
      ["일운", input.ilwoon],
    ];

    for (const [k, raw] of maybeLuck) {
      const g = normalizeGZ(raw ?? "");
      if (g.length >= 2) {
        luckBranches.push({ kind: k, b: gzBranch(g) as KoBranch });
      }
    }

    if (luckBranches.length >= 2) {
      const natalEntries = natalKo.map((gz, i) => ({
        pos: POS_LABELS[i]!,
        b: gzBranch(gz) as KoBranch,
      }));

      for (const g of TRIAD_SHAPE_GROUPS) {
        for (let x = 0; x < luckBranches.length; x++) {
          for (let y = x + 1; y < luckBranches.length; y++) {
            const L1 = luckBranches[x]!;
            const L2 = luckBranches[y]!;
            for (const n of natalEntries) {
              const set3 = new Set<KoBranch>([n.b, L1.b, L2.b]);
              if (set3.size === 3 && g.members.every((m) => set3.has(m))) {
                const luckMask = [L1.kind, L2.kind]
                  .sort((a, b) => LUCK_ORDER.indexOf(a) - LUCK_ORDER.indexOf(b))
                  .join("X");
                const mask = `${n.pos}X${luckMask}`;
                pushUnique(out.jijiHyeong, `#${mask}_${g.name}삼형`);
                if (g.name === "인사신") hasTriadInsasin = true;
                if (g.name === "축술미") hasTriadChuksulmi = true;
              }
            }
          }
        }
      }
    }
  }

  if (hasTriadInsasin || hasTriadChuksulmi) {
    out.jijiHyeong = out.jijiHyeong.filter((t) => {
      if (hasTriadInsasin && /(인신형|인사형|사신형)/.test(t)) return false;
      if (hasTriadChuksulmi && /(축술형|축미형|술미형)/.test(t)) return false;
      return true;
    });
  }

  return finalizeBuckets(removeLuckPairTags(out));
}

function removeLuckPairTags(out: RelationTags): RelationTags {
  const luckPairs = /(대운|세운|월운|일운)X(대운|세운|월운|일운)/;
  const next: RelationTags = { ...out };

  for (const key of Object.keys(out) as Array<keyof RelationTags>) {
    if (key === "title") continue;
    const arr = out[key];
    if (!Array.isArray(arr)) continue;
    next[key] = arr.filter((tag) => !luckPairs.test(tag ?? ""));
  }

  return next;
}
