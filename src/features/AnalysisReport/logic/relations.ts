// features/AnalysisReport/logic/relations.ts
// 원국(4주) 태그 + 운(대/세/월) 상호작용 태그 + 오행 가중치(overlay)
// - 라벨 정방향 고정(리버스 방지)
// - 같은 기둥 간지암합 중복 방지(#월주_무자_암합 등은 원국에서 1회만 생성)
// - 태그가 하나라도 있으면 '#없음'은 출력하지 않음(최종 단계에서 정리)

import type { Element } from "../utils/types";

export type Pillars4 = string[];

const POS_LABELS = ["연", "월", "일", "시"] as const;
type PosLabel = (typeof POS_LABELS)[number];
const POS = { year: 0, month: 1, day: 2, hour: 3 } as const;

type KoBranch =
  | "자" | "축" | "인" | "묘" | "진" | "사"
  | "오" | "미" | "신" | "유" | "술" | "해";

type TrioGroup = {
  name: string;
  members: [KoBranch, KoBranch, KoBranch];
  out: Element;
  wang: KoBranch;
};

const WEAK_SUFFIX = "매우약함";

/* ───────── 간지 정규화(한자→한글 2글자) ───────── */
const STEM_H2K: Record<string, string> = {
  甲:"갑", 乙:"을", 丙:"병", 丁:"정", 戊:"무",
  己:"기", 庚:"경", 辛:"신", 壬:"임", 癸:"계",
};
const BRANCH_H2K: Record<string, string> = {
  子:"자", 丑:"축", 寅:"인", 卯:"묘", 辰:"진", 巳:"사",
  午:"오", 未:"미", 申:"신", 酉:"유", 戌:"술", 亥:"해",
};

export function normalizeGZ(raw: string): string {
  if (!raw) return "";
  const s = raw
    .replace(/[()[\]{}]/g, "")
    .replace(/\s+/g, "")
    .replace(/[년월일시年月日時干支柱:\-_.]/g, "");
  const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
  if (mKo) return `${mKo[1]}${mKo[2]}`;
  const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
  if (mHa) {
    const g = STEM_H2K[mHa[1]] ?? mHa[1];
    const z = BRANCH_H2K[mHa[2]] ?? mHa[2];
    return `${g}${z}`;
  }
  return "";
}

const gzStem   = (gz: string) => (gz && gz.length >= 1 ? gz[0]! : "");
const gzBranch = (gz: string) => (gz && gz.length >= 2 ? gz[1]! : "");

/* ───────── 라벨 테이블(정방향 고정) ───────── */
// 천간 합/충
const STEM_HAP_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["갑","기"], label: "갑기합" },
  { pair: ["을","경"], label: "을경합" },
  { pair: ["병","신"], label: "병신합" },
  { pair: ["정","임"], label: "정임합" },
  { pair: ["무","계"], label: "무계합" },
];
const STEM_CHUNG_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["갑","경"], label: "갑경충" },
  { pair: ["을","신"], label: "을신충" },
  { pair: ["병","임"], label: "병임충" },
  { pair: ["정","계"], label: "정계충" },
];

// 지지 육합/충/파/해/원진/귀문
const BR_YUKHAP_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["자","축"], label: "자축합" },
  { pair: ["인","해"], label: "인해합" },
  { pair: ["묘","술"], label: "묘술합" },
  { pair: ["진","유"], label: "진유합" },
  { pair: ["사","신"], label: "사신합" },
  { pair: ["오","미"], label: "오미합" },
];
const BR_CHUNG_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["자","오"], label: "자오충" },
  { pair: ["사","해"], label: "사해충" },
  { pair: ["인","신"], label: "인신충" },
  { pair: ["묘","유"], label: "묘유충" },
  { pair: ["진","술"], label: "진술충" },
  { pair: ["축","미"], label: "축미충" },
];
const BR_PA_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["축","진"], label: "축진파" },
  { pair: ["술","미"], label: "술미파" },
  { pair: ["자","유"], label: "자유파" },
  { pair: ["묘","오"], label: "묘오파" },
  { pair: ["사","신"], label: "사신파" },
  { pair: ["인","해"], label: "인해파" },
];
const BR_HAE_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["인","사"], label: "인사해" },
  { pair: ["신","해"], label: "신해해" },
  { pair: ["자","미"], label: "자미해" },
  { pair: ["축","오"], label: "축오해" },
  { pair: ["묘","진"], label: "묘진해" },
  { pair: ["유","술"], label: "유술해" },
];
const BR_WONJIN_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["자","미"], label: "자미원진" },
  { pair: ["인","유"], label: "인유원진" },
  { pair: ["축","오"], label: "축오원진" },
  { pair: ["묘","신"], label: "묘신원진" },
  { pair: ["진","해"], label: "진해원진" },
  { pair: ["사","술"], label: "사술원진" },
];
const BR_GWIMUN_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["인","미"], label: "인미귀문" },
  { pair: ["묘","신"], label: "묘신귀문" },
  { pair: ["진","해"], label: "진해귀문" },
  { pair: ["사","술"], label: "사술귀문" },
  { pair: ["자","유"], label: "자유귀문" },
  { pair: ["축","오"], label: "축오귀문" },
];

// 형
const TRIAD_SHAPE_GROUPS: Array<{ name: string; members: [string, string, string] }> = [
  { name: "인사신", members: ["인","사","신"] },
  { name: "축술미", members: ["축","술","미"] },
];
const BR_SANGHYEONG_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["인","신"], label: "인신상형" },
  { pair: ["인","사"], label: "인사상형" },
  { pair: ["사","신"], label: "사신상형" },
  { pair: ["술","미"], label: "술미상형" },
  { pair: ["축","술"], label: "축술상형" },
  { pair: ["축","미"], label: "축미상형" },
];
const BR_ZAMYO_HYEONG_LABELS: Array<{ pair: [string, string]; label: string }> = [
  { pair: ["자","묘"], label: "자묘형" },
];
const BR_SELF_HYEONG_ALLOWED = new Set(["진","오","유","해"]);

// 같은-기둥 간지암합
const GANJI_AMHAP_SET = new Set(["정해","무자","신사","임오"]);

// 삼합/방합(공통 테이블, 태그/overlay에 재사용)
export const SANHE_GROUPS: TrioGroup[] = [
  { name:"해묘미", members:["해","묘","미"], out:"목", wang:"묘" },
  { name:"인오술", members:["인","오","술"], out:"화", wang:"오"  },
  { name:"사유축", members:["사","유","축"], out:"금", wang:"유"  },
  { name:"신자진", members:["신","자","진"], out:"수", wang:"자"  },
];
export const BANGHAP_GROUPS: TrioGroup[] = [
  { name:"인묘진", members:["인","묘","진"], out:"목", wang:"묘" },
  { name:"사오미", members:["사","오","미"], out:"화", wang:"오"  },
  { name:"신유술", members:["신","유","술"], out:"금", wang:"유"  },
  { name:"해자축", members:["해","자","축"], out:"수", wang:"자"  },
];

/* ───────── 유틸 ───────── */
function labelForPair(
  table: Array<{ pair: [string, string]; label: string }>,
  a: string, b: string
): string | null {
  for (const { pair: [x, y], label } of table) {
    if ((a === x && b === y) || (a === y && b === x)) return label;
  }
  return null;
}
function pushUnique(arr: string[], tag: string) {
  if (!arr.includes(tag)) arr.push(tag);
}
const posMask = (idxs: number[]) =>
  [...idxs].sort((a, b) => a - b).map(i => POS_LABELS[i]).join("X");
const isYearHourPair = (i: number, j: number) =>
  (i === 0 && j === 3) || (i === 3 && j === 0);

function selectAllPairs(posA: number[], posB: number[]): Array<[number, number]> {
  const raw: Array<[number, number]> = [];
  for (const i of posA) for (const j of posB) {
    if (i === j) continue;
    const a = Math.min(i, j), b = Math.max(i, j);
    if (a === 0 && b === 3) continue; // 연X시 제외
    raw.push([a, b]);
  }
  return raw.sort((p, q) => {
    const d1 = Math.abs(p[0] - p[1]), d2 = Math.abs(q[0] - q[1]);
    return d1 !== d2 ? d1 - d2 : 0;
  });
}
function selectAllPairsSame(pos: number[]): Array<[number, number]> {
  const raw: Array<[number, number]> = [];
  const sorted = [...pos].sort((a, b) => a - b);
  for (let x = 0; x < sorted.length; x++) {
    for (let y = x + 1; y < sorted.length; y++) {
      const i = sorted[x]!, j = sorted[y]!;
      if (i === 0 && j === 3) continue; // 연X시 제외
      raw.push([i, j]);
    }
  }
  return raw;
}
const posToJuLabel = (pos: PosLabel): "연주" | "월주" | "일주" | "시주" => {
  switch (pos) {
    case "연": return "연주";
    case "월": return "월주";
    case "일": return "일주";
    case "시": return "시주";
  }
};

/* ───────── 출력 타입 ───────── */
export interface RelationTags {
  title?: string;
  cheonganHap: string[];
  cheonganChung: string[];

  jijiSamhap: string[];
  jijiBanhap: string[];
  jijiBanghap: string[];

  jijiYukhap: string[];
  jijiChung: string[];
  jijiHyeong: string[];
  jijiPa: string[];
  jijiHae: string[];
  jijiWonjin: string[];
  jijiGwimun: string[];

  amhap: string[];
  ganjiAmhap: string[];
}

function isNoneTag(s: string | undefined | null): boolean {
  if (!s) return false;
  const t = s.normalize("NFC").trim();
  return /^#\s*없음$/u.test(t);
}

// title 제외 버킷 키
type BucketKey = Exclude<keyof RelationTags, "title">;
const BUCKET_KEYS = [
  "cheonganHap","cheonganChung",
  "jijiSamhap","jijiBanhap","jijiBanghap",
  "jijiYukhap","jijiChung","jijiHyeong",
  "jijiPa","jijiHae","jijiWonjin","jijiGwimun",
  "amhap","ganjiAmhap",
] as const satisfies ReadonlyArray<BucketKey>;

function finalizeBuckets(out: RelationTags): RelationTags {
  for (const k of BUCKET_KEYS) {
    const raw = (out[k] ?? []) as string[];
    const cleaned = raw
      .map(s => s && s.normalize("NFKC"))
      .filter((t): t is string => !!t && !isNoneTag(t)); // ← '#없음' 전부 제거
    // 데이터 단계에서는 절대 '#없음'을 넣지 않는다(빈 배열 유지)
    out[k] = cleaned;
  }
  return out;
}
/* ============================================================
 * ① 원국 전용: buildHarmonyTags
 *    - 같은 기둥 간지암합을 여기서 1회만 생성
 *    - '#없음'은 반환 직전에만 채움(있으면 제거)
 * ============================================================ */
export interface HarmonyOptions {
  emitGanjiAmhap?: boolean; // 기본 true
  fillNone?: boolean;       // 기본 true
}

export function buildHarmonyTags(pillarsRaw: string[], opts: HarmonyOptions = {}): RelationTags {
  const { emitGanjiAmhap = true } = opts;

  const pillars = pillarsRaw.map(normalizeGZ);
  const stems   = pillars.map(gz => gzStem(gz));
  const brs     = pillars.map(gz => gzBranch(gz));
  const title   = pillars.map((gz, i) => `${gz}${["년","월","일","시"][i]}`).join(" ");

  const out: RelationTags = {
    title,
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

  // 천간 합/충 (인접만)
  const addStemPairAdjacent = (a: string, b: string, label: string, bucket: string[]) => {
    const posA = stems.flatMap((s, i) => (s === a ? [i] : []));
    const posB = stems.flatMap((s, i) => (s === b ? [i] : []));
    for (const i of posA) for (const j of posB) {
      if (i === j) continue;
      if (Math.abs(i - j) !== 1) continue;
      pushUnique(bucket, `#${posMask([i, j])}_${label}`);
    }
  };
  STEM_HAP_LABELS.forEach(({ pair: [a,b], label }) => addStemPairAdjacent(a,b,label,out.cheonganHap));
  STEM_CHUNG_LABELS.forEach(({ pair: [a,b], label }) => addStemPairAdjacent(a,b,label,out.cheonganChung));

  // ── 삼합/반합 ──
  const findFirstIdxPerType = (types: KoBranch[]) => {
    const used = new Set<number>(); const idxs: number[] = [];
    for (const t of types) for (let i=0;i<brs.length;i++) {
      if (brs[i] === t && !used.has(i)) { used.add(i); idxs.push(i); break; }
    }
    return idxs;
  };
  SANHE_GROUPS.forEach(({ name, members, wang }) => {
    const present = members.filter(b => brs.includes(b));
    const uniq = new Set(present).size;

    if (uniq === 3) {
      const idxs = findFirstIdxPerType(members);
      if (idxs.length === 3) pushUnique(out.jijiSamhap, `#${posMask(idxs)}_${name}삼합`);
    } else if (uniq === 2) {
      if (!present.includes(wang)) return; // 왕지 필수
      const [t1, t2] = present as [KoBranch, KoBranch];
      const pos1 = brs.flatMap((b,i)=> b===t1 ? [i] : []);
      const pos2 = brs.flatMap((b,i)=> b===t2 ? [i] : []);
      const pairs = selectAllPairs(pos1, pos2);
      const duplicate = pairs.length > 1;

      for (const [i,j] of pairs) {
        const weak = isYearHourPair(i,j);
        const tag = `#${posMask([i,j])}_${t1}${t2}반합${duplicate ? "" : (weak ? `_${WEAK_SUFFIX}` : "")}`;
        // ✅ 반합도 jijiSamhap으로
        pushUnique(out.jijiSamhap, tag);
      }
    }
  });

  // ── 방합(3지) ──
  BANGHAP_GROUPS.forEach(({ name, members }) => {
    const present = new Set(members.filter(b => brs.includes(b)));
    if (present.size !== 3) return;
    const idxs = findFirstIdxPerType(members);
    if (idxs.length === 3) pushUnique(out.jijiBanghap, `#${posMask(idxs)}${name}_방합`);
  });

  // ── 지지: 육합/충/파/해/원진/귀문 ──
  const addBranchPairsAllByLabel = (
    a: string, b: string, label: string, bucket: string[]
  ) => {
    const posA = brs.flatMap((x,i) => x===a ? [i] : []);
    const posB = brs.flatMap((x,i) => x===b ? [i] : []);
    const pairs = selectAllPairs(posA, posB);
    const duplicate = pairs.length > 1;
    for (const [i,j] of pairs) {
      const weak = isYearHourPair(i,j);
      const tag = `#${posMask([i,j])}_${label}${duplicate ? "" : (weak ? `_${WEAK_SUFFIX}` : "")}`;
      pushUnique(bucket, tag);
    }
  };
  BR_YUKHAP_LABELS.forEach(({pair:[a,b],label}) => addBranchPairsAllByLabel(a,b,label,out.jijiYukhap));
  BR_CHUNG_LABELS .forEach(({pair:[a,b],label}) => addBranchPairsAllByLabel(a,b,label,out.jijiChung));
  BR_PA_LABELS    .forEach(({pair:[a,b],label}) => addBranchPairsAllByLabel(a,b,label,out.jijiPa));
  BR_HAE_LABELS   .forEach(({pair:[a,b],label}) => addBranchPairsAllByLabel(a,b,label,out.jijiHae));
  BR_WONJIN_LABELS.forEach(({pair:[a,b],label}) => addBranchPairsAllByLabel(a,b,label,out.jijiWonjin));
  BR_GWIMUN_LABELS.forEach(({pair:[a,b],label}) => addBranchPairsAllByLabel(a,b,label,out.jijiGwimun));

  // ── 형: 삼형/상형/자묘형/자형 ──
  [["인","사","신"],["축","술","미"]].forEach(group => {
    const hits = group.flatMap(g => brs.flatMap((b,i) => b===g ? [i] : []));
    const uniqHits = Array.from(new Set(hits)).sort((a,b) => a - b);
    if (uniqHits.length === 3) pushUnique(out.jijiHyeong, `#${posMask(uniqHits)}_${group.join("")}삼형`);
  });
  BR_SANGHYEONG_LABELS.forEach(({pair:[a,b],label}) => addBranchPairsAllByLabel(a,b,label,out.jijiHyeong));
  BR_ZAMYO_HYEONG_LABELS.forEach(({pair:[a,b],label}) => addBranchPairsAllByLabel(a,b,label,out.jijiHyeong));
  ["진","오","유","해"].forEach(b => {
    const pos = brs.flatMap((x,i)=> x===b ? [i] : []);
    const pairs = selectAllPairsSame(pos);
    const duplicate = pairs.length > 1;
    for (const [i,j] of pairs) {
      const weak = isYearHourPair(i,j);
      const tag = `#${posMask([i,j])}_${b}${b}자형${duplicate ? "" : (weak ? `_${WEAK_SUFFIX}` : "")}`;
      pushUnique(out.jijiHyeong, tag);
    }
  });

  // ── 지지 암합(지지+지지) ──
  const AMHAP_BR_LABELS: Array<{ pair:[string,string]; label:string }> = [
    { pair:["자","술"], label:"자술암합" },
    { pair:["축","인"], label:"축인암합" },
    { pair:["묘","신"], label:"묘신암합" },
    { pair:["인","미"], label:"인미암합" },
    { pair:["오","해"], label:"오해암합" },
  ];
  AMHAP_BR_LABELS.forEach(({pair:[a,b],label}) => addBranchPairsAllByLabel(a,b,label,out.amhap));

  // ── 같은 기둥 간지암합(여기서 1회만) ──
  if (emitGanjiAmhap) {
    for (let i=0;i<4;i++) {
      const gz = pillars[i] ?? ""; if (gz.length<2) continue;
      const pair = `${gz[0]}${gz[1]}`;
      if (GANJI_AMHAP_SET.has(pair)) pushUnique(out.ganjiAmhap, `#${posToJuLabel(POS_LABELS[i]!)}_${pair}암합`);
    }
  }

  return finalizeBuckets(out);
}

/* ============================================================
 * ② 운 포함: buildAllRelationTags
 *    - 기본값 emitNatalGanjiAmhap=false (원국 중복 방지)
 *    - 운이 실제 있을 때만 원국 간지암합 생성 가능(hasLuck 가드)
 * ============================================================ */
type LuckKind = "대운" | "세운" | "월운";
export interface LuckOptions {
  emitNatalGanjiAmhap?: boolean; // 기본 false
  fillNone?: boolean;            // 기본 true
}

export function buildAllRelationTags(input: {
  natal: Pillars4;
  daewoon?: string;
  sewoon?: string;
  wolwoon?: string;
}, opts: LuckOptions = {}): RelationTags {
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
  const hasLuck = luckKoList.some(s => s.length >= 2);

  const out: RelationTags = {
    cheonganHap: [],
    cheonganChung: [],
    jijiSamhap: [],
    jijiBanhap: [],   // 운 로직에서는 반합 없음
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

  // (옵션 ON + 운 존재)일 때만 원국 간지암합 생성
  if (emitNatalGanjiAmhap && hasLuck) {
    for (let i=0;i<4;i++) {
      const gz = natalKo[i] ?? ""; if (gz.length<2) continue;
      const pair = `${gz[0]}${gz[1]}`;
      if (GANJI_AMHAP_SET.has(pair)) pushUnique(out.ganjiAmhap, `#${posToJuLabel(POS_LABELS[i]!)}_${pair}암합`);
    }
  }

  const lucks: Array<[LuckKind, string | undefined | null]> = [
    ["대운", input.daewoon],
    ["세운", input.sewoon],
    ["월운", input.wolwoon],
  ];

  for (const [kind, rawLuck] of lucks) {
    if (!rawLuck) continue;
    const luckKo = normalizeGZ(rawLuck);
    if (!luckKo || luckKo.length < 2) continue;

    const ls = gzStem(luckKo);
    const lb = gzBranch(luckKo);

    // 운 자체 간지암합(같은 기둥)
    {
      const pair = `${ls}${lb}`;
      if (GANJI_AMHAP_SET.has(pair)) pushUnique(out.ganjiAmhap, `#${kind}_${pair}암합`);
    }

    // 포지션별 1:1 상호작용
    for (let i=0;i<4;i++) {
      const gz = natalKo[i] ?? ""; if (gz.length<2) continue;
      const pos = POS_LABELS[i]!;
      const ns = gzStem(gz);
      const nb = gzBranch(gz);

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

      // 형
      const sang = labelForPair(BR_SANGHYEONG_LABELS, lb, nb);
      if (sang) pushUnique(out.jijiHyeong, `#${kind}X${pos}_${sang}`);
      else {
        const zamyo = labelForPair(BR_ZAMYO_HYEONG_LABELS, lb, nb);
        if (zamyo) pushUnique(out.jijiHyeong, `#${kind}X${pos}_${zamyo}`);
        else if (lb === nb && BR_SELF_HYEONG_ALLOWED.has(lb)) {
          pushUnique(out.jijiHyeong, `#${kind}X${pos}_${lb}${nb}자형`);
        }
      }

      // 지지 암합(지지+지지)
      const AMHAP_BR_LABELS: Array<{ pair:[string,string]; label:string }> = [
        { pair:["자","술"], label:"자술암합" },
        { pair:["축","인"], label:"축인암합" },
        { pair:["묘","신"], label:"묘신암합" },
        { pair:["인","미"], label:"인미암합" },
        { pair:["오","해"], label:"오해암합" },
      ];
      const amhap = labelForPair(AMHAP_BR_LABELS, lb, nb);
      if (amhap) pushUnique(out.amhap, `#${kind}X${pos}_${amhap}`);
    }

    // 운 포함 3자 완성(삼합/방합/삼형)
    const natalBranches = natalKo.map(gz => gzBranch(gz ?? ""));
    for (const g of SANHE_GROUPS) {
      if (!g.members.includes(lb as KoBranch)) continue;
      const others = g.members.filter(x => x !== (lb as KoBranch));
      const hits = natalBranches
        .map((b, i) => ({ b, pos: POS_LABELS[i]! }))
        .filter(o => others.includes(o.b as KoBranch));
      if (new Set(hits.map(h => h.b)).size === 2) {
        const [p1, p2] = hits.map(h => h.pos).sort((a,b)=>(
          ["시","일","월","연"].indexOf(a) - ["시","일","월","연"].indexOf(b)
        )) as [PosLabel,PosLabel];
        pushUnique(out.jijiSamhap, `#${kind}X${p1}X${p2}_삼합(${g.name})`);
      }
    }
    for (const g of BANGHAP_GROUPS) {
      if (!g.members.includes(lb as KoBranch)) continue;
      const others = g.members.filter(x => x !== (lb as KoBranch));
      const hits = natalBranches
        .map((b, i) => ({ b, pos: POS_LABELS[i]! }))
        .filter(o => others.includes(o.b as KoBranch));
      if (hits.length >= 2) {
        const [p1, p2] = hits.map(h => h.pos).sort((a,b)=>(
          ["시","일","월","연"].indexOf(a) - ["시","일","월","연"].indexOf(b)
        )) as [PosLabel,PosLabel];
        pushUnique(out.jijiBanghap, `#${kind}X${p1}X${p2}방합(${g.name})`);
      }
    }
    for (const g of TRIAD_SHAPE_GROUPS) {
      if (!g.members.includes(lb)) continue;
      const others = g.members.filter(x => x !== lb);
      const hits = natalBranches
        .map((b, i) => ({ b, pos: POS_LABELS[i]! }))
        .filter(o => others.includes(o.b));
      if (new Set(hits.map(h => h.b)).size === 2) {
        const [p1, p2] = hits.map(h => h.pos).sort((a,b)=>(
          ["시","일","월","연"].indexOf(a) - ["시","일","월","연"].indexOf(b)
        )) as [PosLabel,PosLabel];
        pushUnique(out.jijiHyeong, `#${kind}X${p1}X${p2}삼형(${g.name})`);
      }
    }
  }

  // ── 운끼리 상호작용 ──
  const luckPairs: Array<[LuckKind, string, LuckKind, string]> = [];
  if (input.daewoon && input.sewoon) luckPairs.push(["대운", input.daewoon, "세운", input.sewoon]);
  if (input.sewoon && input.wolwoon) luckPairs.push(["세운", input.sewoon, "월운", input.wolwoon]);
  if (input.daewoon && input.wolwoon) luckPairs.push(["대운", input.daewoon, "월운", input.wolwoon]);

  for (const [k1, raw1, k2, raw2] of luckPairs) {
    const g1 = normalizeGZ(raw1);
    const g2 = normalizeGZ(raw2);
    if (g1.length < 2 || g2.length < 2) continue;

    const s1 = gzStem(g1), b1 = gzBranch(g1);
    const s2 = gzStem(g2), b2 = gzBranch(g2);

    // 천간 합/충
    const hap = labelForPair(STEM_HAP_LABELS, s1, s2);
    if (hap) pushUnique(out.cheonganHap, `#${k1}X${k2}_${hap}`);
    const chung = labelForPair(STEM_CHUNG_LABELS, s1, s2);
    if (chung) pushUnique(out.cheonganChung, `#${k1}X${k2}_${chung}`);

    // 지지 육합/충/파/해/원진/귀문
    const yukhap = labelForPair(BR_YUKHAP_LABELS, b1, b2);
    if (yukhap) pushUnique(out.jijiYukhap, `#${k1}X${k2}_${yukhap}`);
    const brChung = labelForPair(BR_CHUNG_LABELS, b1, b2);
    if (brChung) pushUnique(out.jijiChung, `#${k1}X${k2}_${brChung}`);
    const pa = labelForPair(BR_PA_LABELS, b1, b2);
    if (pa) pushUnique(out.jijiPa, `#${k1}X${k2}_${pa}`);
    const hae = labelForPair(BR_HAE_LABELS, b1, b2);
    if (hae) pushUnique(out.jijiHae, `#${k1}X${k2}_${hae}`);
    const wonjin = labelForPair(BR_WONJIN_LABELS, b1, b2);
    if (wonjin) pushUnique(out.jijiWonjin, `#${k1}X${k2}_${wonjin}`);
    const gwimun = labelForPair(BR_GWIMUN_LABELS, b1, b2);
    if (gwimun) pushUnique(out.jijiGwimun, `#${k1}X${k2}_${gwimun}`);

    // 형
    const sang = labelForPair(BR_SANGHYEONG_LABELS, b1, b2);
    if (sang) pushUnique(out.jijiHyeong, `#${k1}X${k2}_${sang}`);
    else {
      const zamyo = labelForPair(BR_ZAMYO_HYEONG_LABELS, b1, b2);
      if (zamyo) pushUnique(out.jijiHyeong, `#${k1}X${k2}_${zamyo}`);
      else if (b1 === b2 && BR_SELF_HYEONG_ALLOWED.has(b1)) {
        pushUnique(out.jijiHyeong, `#${k1}X${k2}_${b1}${b2}자형`);
      }
    }

    // 지지 암합
    const amhap = labelForPair([
      { pair:["자","술"], label:"자술암합" },
      { pair:["축","인"], label:"축인암합" },
      { pair:["묘","신"], label:"묘신암합" },
      { pair:["인","미"], label:"인미암합" },
      { pair:["오","해"], label:"오해암합" },
    ], b1, b2);
    if (amhap) pushUnique(out.amhap, `#${k1}X${k2}_${amhap}`);
  }

  return finalizeBuckets(out);
}

/* ============================================================
 * ③ 오행 가중치(overlay): 삼합/반합/방합 공통 그룹 재사용
 * ============================================================ */
export function applyHarmonyOverlay(
  pillarsRaw: string[],
  elementScore: Record<Element, number>
) {
  const pillarsKo = pillarsRaw.map(normalizeGZ);
  const brs = pillarsKo.map(gz => gzBranch(gz) as KoBranch);
  const monthIdx = POS.month;
  const monthB = brs[monthIdx];

  const findIndices = (targets: Set<KoBranch>) => {
    const idxs: number[] = [];
    for (let i=0;i<4;i++) {
      const b = brs[i]; if (b && targets.has(b as KoBranch)) idxs.push(i);
    }
    return idxs;
  };
  const isClustered3 = (idxs: number[]) => {
    const s = [...idxs].sort((a,b)=>a-b);
    return s.length === 3 && (s[0]+1===s[1] && s[1]+1===s[2]);
  };

  // 삼합 + 반합
  for (const g of SANHE_GROUPS) {
    const set = new Set<KoBranch>(g.members);
    const idxs = findIndices(set);

    if (idxs.length === 3) {
      const monthIn = idxs.includes(monthIdx);
      const wangAtMonth = monthB === g.wang;
      if (monthIn) {
        if (isClustered3(idxs)) elementScore[g.out] += wangAtMonth ? 10 : 8;
        else elementScore[g.out] += 5;
      } else {
        elementScore[g.out] += 3;
      }
    }

    if (idxs.length === 2 && idxs.includes(monthIdx)) {
      const other = idxs[0] === monthIdx ? idxs[1] : idxs[0];
      const wangAtMonth = monthB === g.wang;
      if (other === POS.day && wangAtMonth) elementScore[g.out] += 8;
      else if (other === POS.year && wangAtMonth) elementScore[g.out] += 6;
      else if (other === POS.hour) elementScore[g.out] += wangAtMonth ? 4 : 2;
    }
  }

  // 방합(3지)
  for (const g of BANGHAP_GROUPS) {
    const set = new Set<KoBranch>(g.members);
    const idxs = findIndices(set);

    if (idxs.length === 3) {
      const monthIn = idxs.includes(monthIdx);
      const wangAtMonth = monthB === g.wang;
      if (!monthIn) elementScore[g.out] += 2;
      else if (isClustered3(idxs)) elementScore[g.out] += wangAtMonth ? 8 : 6;
      else elementScore[g.out] += 4;
    }
  }
}

/* ============================================================
 * ④ 병합 유틸: 다수 결과 합칠 때 중복 제거 + '#없음'은 최종에만
 * ============================================================ */

export function mergeRelationTags(...entries: RelationTags[]): RelationTags {
  const base: RelationTags = {
    cheonganHap: [], cheonganChung: [],
    jijiSamhap: [], jijiBanhap: [], jijiBanghap: [],
    jijiYukhap: [], jijiChung: [], jijiHyeong: [],
    jijiPa: [], jijiHae: [], jijiWonjin: [], jijiGwimun: [],
    amhap: [], ganjiAmhap: [],
  };

  const pushAll = (key: BucketKey, arr?: string[]) => {
    if (!arr) return;
    for (const t of arr) {
      if (!t) continue;
      // 머지 시점에서 바로 컷
      if (isNoneTag(t)) continue;
      base[key].push(t);
    }
  };

  for (const e of entries) {
    pushAll("cheonganHap",   e.cheonganHap);
    pushAll("cheonganChung", e.cheonganChung);
    pushAll("jijiSamhap",    e.jijiSamhap);
    pushAll("jijiBanhap",    e.jijiBanhap);
    pushAll("jijiBanghap",   e.jijiBanghap);
    pushAll("jijiYukhap",    e.jijiYukhap);
    pushAll("jijiChung",     e.jijiChung);
    pushAll("jijiHyeong",    e.jijiHyeong);
    pushAll("jijiPa",        e.jijiPa);
    pushAll("jijiHae",       e.jijiHae);
    pushAll("jijiWonjin",    e.jijiWonjin);
    pushAll("jijiGwimun",    e.jijiGwimun);
    pushAll("amhap",         e.amhap);
    pushAll("ganjiAmhap",    e.ganjiAmhap);
  }

  // 최종 한 번만: 진짜 비었을 때만 '#없음'
  return finalizeBuckets(base, /* fillNone */);
}

export type HarmonyResult = {
  cheonganHap: string[];
  cheonganChung: string[];
  jijiSamhap: string[];
  jijiBanghap: string[];
  jijiYukhap: string[];
  amhap: string[];
  ganjiAmhap: string[];
  jijiChung: string[];
  jijiHyeong: string[];
  jijiPa: string[];
  jijiHae: string[];
};

/* ───────── (참고) 오행 생/극 ───────── */
export const SHENG_NEXT: Record<Element, Element> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
export const SHENG_PREV: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };
export const KE:         Record<Element, Element> = { 목:"토", 화:"금", 토:"수", 금:"목", 수:"화" };
export const KE_INV:     Record<Element, Element> = { 목:"금", 화:"수", 토:"목", 금:"화", 수:"토" };
export type StrengthLevel = "왕" | "상" | "휴" | "수" | "사";
export const LV_ADJ: Record<StrengthLevel, number> = { 왕:+0.15, 상:+0.10, 휴:-0.15, 수:-0.20, 사:-0.25 };

/* ============================================================
 * ⑤ 커플 전용: 두 명식 교차 형충회합 (A↔B로만 성립하는 것만)
 * ============================================================ */
export type CoupleHarmony = {
  천간합: string[];
  천간충: string[];
  지지삼합: string[];
  지지반합: string[];
  지지방합: string[];
  지지육합: string[];
  암합: string[];       // 지지+지지 암합
  간지암합: string[];  // 천간+지지 암합
  지지충: string[];
  지지형: string[];
  지지파: string[];
  지지해: string[];
  지지원진: string[];
  지지귀문: string[];
};

function makeMapsForPerson(pillars: Pillars4) {
  // 원국 정규화 후 자리 매핑
  const names = ["연","월","일","시"] as const;
  const ko = pillars.map(normalizeGZ);
  const stemsByPos = ko.map(gz => gzStem(gz));
  const brsByPos   = ko.map(gz => gzBranch(gz));

  const stemPos = new Map<string, number[]>(); // 천간 글자 -> [포지션 idx...]
  const brPos   = new Map<string, number[]>(); // 지지 글자 -> [포지션 idx...]

  for (let i=0;i<4;i++) {
    const st = stemsByPos[i]; const br = brsByPos[i];
    if (st.includes(st)) stemPos.set(st, [...(stemPos.get(st) ?? []), i]);
    if (br.includes(br)) brPos.set(br,   [...(brPos.get(br)   ?? []), i]);
  }

  return { stemsByPos, brsByPos, stemPos, brPos, names };
}

function posLabel(i: number) {
  return POS_LABELS[i]!;
}

function pushUniqueSorted(bucket: string[], label: string) {
  if (!label) return;
  if (!bucket.includes(label)) bucket.push(label);
}

export function buildCoupleHarmonyTags_AB(
  pillarsA: Pillars4,
  pillarsB: Pillars4
): CoupleHarmony {
  const A = makeMapsForPerson(pillarsA);
  const B = makeMapsForPerson(pillarsB);

  const out: CoupleHarmony = {
    천간합: [], 천간충: [],
    지지삼합: [], 지지방합:[], 지지반합: [], 지지육합: [],
    암합: [], 간지암합: [],
    지지충: [], 지지형: [], 지지파: [], 지지해: [],
    지지원진: [], 지지귀문: [],
  };

  /* ---------- 2자 관계: A(연·월·일·시) × B(연·월·일·시) ---------- */
  for (let i=0;i<4;i++) {
    const As = A.stemsByPos[i], Ab = A.brsByPos[i];
    for (let j=0;j<4;j++) {
      const Bs = B.stemsByPos[j], Bb = B.brsByPos[j];

      // --- branchesA/B ---
      // A, B 원국에서 지지 배열 뽑기
      const brsA = pillarsA.map(normalizeGZ).map(gzBranch).filter(Boolean);
      const brsB = pillarsB.map(normalizeGZ).map(gzBranch).filter(Boolean);

      // 삼합 (3지 완성 시)
      for (const g of SANHE_GROUPS) {
        const total = new Set([...brsA, ...brsB]);
        if (g.members.every(m => total.has(m))) {
          // 최소 1개씩 들어가야 커플 성립
          if (g.members.some(m => brsA.includes(m)) && g.members.some(m => brsB.includes(m))) {
            pushUniqueSorted(out.지지삼합, `${g.name}삼합`);
          }
        }
        // 반합 (왕지 포함 2지)도 커플 교차로만
        const both = g.members.filter(m => brsA.includes(m) || brsB.includes(m));
        if (both.length === 2 && both.includes(g.wang)) {
          if (both.some(m => brsA.includes(m)) && both.some(m => brsB.includes(m))) {
            pushUniqueSorted(out.지지반합, `${both.join("")}반합`);
          }
        }
      }

      // 방합 (3지 완성 시)
      for (const g of BANGHAP_GROUPS) {
        const total = new Set([...brsA, ...brsB]);
        if (g.members.every(m => total.has(m))) {
          if (g.members.some(m => brsA.includes(m)) && g.members.some(m => brsB.includes(m))) {
            pushUniqueSorted(out.지지방합, `${g.name}방합`);
          }
        }
      }

      // 천간 합/충
      const cgH = labelForPair(STEM_HAP_LABELS, As, Bs);
      if (cgH) pushUniqueSorted(out.천간합, `${posLabel(i)}X${posLabel(j)} ${cgH}`);
      const cgC = labelForPair(STEM_CHUNG_LABELS, As, Bs);
      if (cgC) pushUniqueSorted(out.천간충, `${posLabel(i)}X${posLabel(j)} 충`);

      // 지지 육합/충/파/해/원진/귀문
      const yk = labelForPair(BR_YUKHAP_LABELS, Ab, Bb);
      if (yk) pushUniqueSorted(out.지지육합, `${posLabel(i)}X${posLabel(j)} ${yk}`);

      const ch = labelForPair(BR_CHUNG_LABELS, Ab, Bb);
      if (ch) pushUniqueSorted(out.지지충, `${posLabel(i)}X${posLabel(j)} 충`);

      const pa = labelForPair(BR_PA_LABELS, Ab, Bb);
      if (pa) pushUniqueSorted(out.지지파, `${posLabel(i)}X${posLabel(j)} 파`);

      const ha = labelForPair(BR_HAE_LABELS, Ab, Bb);
      if (ha) pushUniqueSorted(out.지지해, `${posLabel(i)}X${posLabel(j)} ${ha}`);

      const wj = labelForPair(BR_WONJIN_LABELS, Ab, Bb);
      if (wj) pushUniqueSorted(out.지지원진, `${posLabel(i)}X${posLabel(j)} ${wj}`);

      const gm = labelForPair(BR_GWIMUN_LABELS, Ab, Bb);
      if (gm) pushUniqueSorted(out.지지귀문, `${posLabel(i)}X${posLabel(j)} ${gm}`);

      // 지지 암합 (지지+지지)
      const AMHAP_BR_LABELS: Array<{ pair:[string,string]; label:string }> = [
        { pair:["자","술"], label:"자술암합" },
        { pair:["축","인"], label:"축인암합" },
        { pair:["묘","신"], label:"묘신암합" },
        { pair:["인","미"], label:"인미암합" },
        { pair:["오","해"], label:"오해암합" },
      ];
      const brAm = labelForPair(AMHAP_BR_LABELS, Ab, Bb);
      if (brAm) pushUniqueSorted(out.암합, `${posLabel(i)}X${posLabel(j)} ${brAm}`);

      // 간지암합 (천간+지지) — A의 천간×B의 지지, B의 천간×A의 지지
      const cg1 = `${As}${Bb}`; // A간 + B지
      const cg2 = `${Bs}${Ab}`; // B간 + A지
      if (GANJI_AMHAP_SET.has(cg1)) pushUniqueSorted(out.간지암합, `${posLabel(i)}X${posLabel(j)} ${cg1}암합`);
      if (GANJI_AMHAP_SET.has(cg2)) pushUniqueSorted(out.간지암합, `${posLabel(j)}X${posLabel(i)} ${cg2}암합`);

      // 형 (상형/자묘형/자형 포함)
      const sang = labelForPair(BR_SANGHYEONG_LABELS, Ab, Bb);
      if (sang) pushUniqueSorted(out.지지형, `${posLabel(i)}X${posLabel(j)} ${sang}`);
      else {
        const zamyo = labelForPair(BR_ZAMYO_HYEONG_LABELS, Ab, Bb);
        if (zamyo) pushUniqueSorted(out.지지형, `${posLabel(i)}X${posLabel(j)} ${zamyo}`);
      }
    }
  }

  /* ---------- 3자 관계: 삼합/방합 (A/B 최소 1개씩) ---------- */
  const branchesA = new Set(A.brsByPos.filter(Boolean));
  const branchesB = new Set(B.brsByPos.filter(Boolean));

  // 삼합
  for (const g of SANHE_GROUPS) {
    const countA = g.members.filter(m => branchesA.has(m)).length;
    const countB = g.members.filter(m => branchesB.has(m)).length;
    if (countA + countB === 3 && countA >= 1 && countB >= 1) {
      pushUniqueSorted(out.지지삼합, `${g.name}삼합`);
    }
    // 반합(왕지 포함 2자) — A/B가 1개씩일 때만
    if (countA === 1 && countB === 1) {
      const both = g.members.filter(m => branchesA.has(m) || branchesB.has(m));
      if (both.includes(g.wang)) {
        const [b1, b2] = both as [KoBranch, KoBranch];
        // 어느 포지션인지 찾아 자리 라벨 부여
        const posA = (A.brPos.get(b1)?.[0] ?? A.brPos.get(b2)?.[0]);
        const posB = (B.brPos.get(b1)?.[0] ?? B.brPos.get(b2)?.[0]);
        if (posA != null && posB != null) {
          const combo = `${b1}${b2}`; // 출력은 조합+반합
          pushUniqueSorted(out.지지삼합, `${posLabel(posA)}X${posLabel(posB)} ${combo}반합`);
        }
      }
    }
  }

  // 방합
  for (const g of BANGHAP_GROUPS) {
    const countA = g.members.filter(m => branchesA.has(m)).length;
    const countB = g.members.filter(m => branchesB.has(m)).length;
    if (countA + countB === 3 && countA >= 1 && countB >= 1) {
      pushUniqueSorted(out.지지방합, `${g.name}방합`);
    }
  }

  // 보기 좋게 정렬
  (Object.keys(out) as (keyof CoupleHarmony)[]).forEach(k => out[k]!.sort());

  return out;
}
