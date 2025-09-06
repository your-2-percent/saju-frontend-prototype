// features/AnalysisReport/logic/shinsal.ts
import type { Pillars4 } from "./relations";

/** 위치가중치: 일지(2)>월지(1)>시지(3)>연지(0) */
type PosIndex = 0 | 1 | 2 | 3;
const POS_WEIGHT: Record<PosIndex, number> = { 2: 4, 1: 3, 3: 2, 0: 1 } as const;

type Source = "natal" | "dae" | "se" | "wol";

type TagBucketPos = { name: string; weight: number; pos: PosIndex };
type TagBucketsByPos = { si: string[]; il: string[]; yeon: string[]; wol: string[] };

export type ShinsalBasis = {
  /** 공망 기준: 일 or 연 (기본: 일) */
  voidBasis?: "day" | "year";
  /** 삼재 기준: 일 or 연 (기본: 일) */
  samjaeBasis?: "day" | "year";
};

const first = (s: string) => s.slice(0, 1);
const last = (s: string) => s.slice(-1);

const idx: Readonly<{ year: 0; month: 1; day: 2; hour: 3 }> = {
  year: 0,
  month: 1,
  day: 2,
  hour: 3,
} as const;

function findBestPosForBranch(branch: string, natal: Pillars4): { pos: PosIndex; weight: number } | null {
  const positions: PosIndex[] = [idx.day, idx.month, idx.hour, idx.year]; // 가중치 순
  for (const p of positions) {
    if (last(natal[p]) === branch) return { pos: p, weight: POS_WEIGHT[p] ?? 0 };
  }
  return null;
}

function findBestPosForStem(stem: string, natal: Pillars4): { pos: PosIndex; weight: number } | null {
  const positions: PosIndex[] = [idx.day, idx.month, idx.hour, idx.year];
  for (const p of positions) {
    if (first(natal[p]) === stem) return { pos: p, weight: POS_WEIGHT[p] ?? 0 };
  }
  return null;
}

const DUP_POS_RE = /^#(연지|월지|일지|시지)X\1_/;
const isSamePosProductLabel = (s: string) => DUP_POS_RE.test(s);

/** (name,pos) 단위로 중복 제거하면서, 동일 (name,pos)일 때 weight 최대값 유지 */
function uniqKeepMaxPerPos(items: TagBucketPos[]): TagBucketPos[] {
  const map = new Map<string, TagBucketPos>(); // key = `${name}@${pos}`
  for (const it of items) {
    if (isSamePosProductLabel(it.name)) continue; // ← 같은 자리끼리 곱셈은 버림
    const key = `${it.name}@${it.pos}`;
    const ex = map.get(key);
    if (!ex || it.weight > ex.weight) map.set(key, it);
  }
  return Array.from(map.values()).sort((a, b) =>
    b.weight !== a.weight ? b.weight - a.weight : a.name.localeCompare(b.name, "ko")
  );
}

/** pos 인덱스를 시/일/연/월 그룹 키로 변환 */
function posToKey(pos: PosIndex): keyof TagBucketsByPos {
  if (pos === 3) return "si";
  if (pos === 2) return "il";
  if (pos === 1) return "wol";
  return "yeon";
}

/* ────────────────────────────────────────────────────────────────────────────
 * 표기 헬퍼: #좌측X우측_신살
 * ──────────────────────────────────────────────────────────────────────────── */
const posKo = (p: PosIndex): "연지" | "월지" | "일지" | "시지" =>
  (p === 0 ? "연지" : p === 1 ? "월지" : p === 2 ? "일지" : "시지");

const srcKo = (s: Source): "대운" | "세운" | "월운" =>
  (s === "dae" ? "대운" : s === "se" ? "세운" : "월운");

// (원국) 일간 × (지지 위치)
const labelSB_at = (tag: string, atPos: PosIndex) => `#일간X${posKo(atPos)}_${tag}`;
// (원국) 월지 × (다른 위치: 천간/지지 상관없이 그 위치)
const labelMonth_withPos = (tag: string, otherPos: PosIndex) =>
  otherPos === idx.month ? `#월지_${tag}` : `#월지X${posKo(otherPos)}_${tag}`;
// (원국) 위치 × 위치 (쌍)
const labelPair_at = (tag: string, p1: PosIndex, p2: PosIndex) => `#${posKo(p1)}X${posKo(p2)}_${tag}`;
// (원국) 공망: (일간|연간) × 트리거 위치
const labelVoid_at = (basis: "day" | "year", atPos: PosIndex) =>
  `#${basis === "day" ? "일간" : "연간"}X${posKo(atPos)}_공망`;
// (원국) 일주 단독
const labelIlju = (tag: string) => `#일주_${tag}`;

// (운) 일간 × (대운|세운|월운)
const labelLuck_SB = (tag: string, src: Source) => `#일간X${srcKo(src)}_${tag}`;
// (운) 월지 × (대운|세운|월운)
const labelLuck_Month = (tag: string, src: Source) => `#월지X${srcKo(src)}_${tag}`;
// (운) (대운|세운|월운) × 원국 위치
const labelLuck_SrcWithPos = (tag: string, src: Source, natPos: PosIndex) =>
  `#${srcKo(src)}X${posKo(natPos)}_${tag}`;
// (운) 공망: (일간|연간) × (대운|세운|월운)
const labelLuck_Void = (src: Source, basis: "day" | "year") =>
  `#${basis === "day" ? "일간" : "연간"}X${srcKo(src)}_공망`;
// (운) 삼재: (일지|연지) × (세운)
const labelLuck_Samjae = (src: Source, basis: "day" | "year") =>
  `#${basis === "day" ? "일지" : "연지"}X${srcKo(src)}_삼재`;
// (운) 상문/조객: 연지 × 세운
const labelLuck_SangJoe = (src: Source, kind: "상문살" | "조객살") => `#연지X${srcKo(src)}_${kind}`;

/* ────────────────────────────────────────────────────────────────────────────
 * 파서/라벨 기타
 * ──────────────────────────────────────────────────────────────────────────── */
const STEMS_KO = new Set(["갑","을","병","정","무","기","경","신","임","계"]);
const BRANCHES_KO = new Set(["자","축","인","묘","진","사","오","미","신","유","술","해"]);
const STEMS_HJ = new Set(["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]);
const BRANCHES_HJ = new Set(["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]);

function parseGZ(raw?: string | null): { stem: string; branch: string } | null {
  if (!raw) return null;
  const chars = Array.from(String(raw));
  let stem: string | null = null;
  let branch: string | null = null;
  for (const ch of chars) {
    if (!stem && (STEMS_KO.has(ch) || STEMS_HJ.has(ch))) stem = ch;
    if (BRANCHES_KO.has(ch) || BRANCHES_HJ.has(ch)) branch = ch; // 마지막 지지 유지
  }
  return stem && branch ? { stem, branch } : null;
}

function natalBranches(natal: Pillars4): string[] {
  return natal.map(last);
}

/* ────────────────────────────────────────────────────────────────────────────
 * 개별 신살 매핑 테이블
 * ──────────────────────────────────────────────────────────────────────────── */
const 금여록: Record<string, string> = {
  갑: "진", 을: "사", 병: "미", 정: "신", 무: "미", 기: "신", 경: "술", 신: "해", 임: "축", 계: "인",
};

const 양인: Record<string, string> = {
  갑: "묘", 병: "오", 무: "오", 경: "유", 임: "자",
  을: "진", 정: "미", 기: "미", 신: "술", 계: "축",
};

const 백호: Record<string, string> = {
  갑: "진", 을: "미", 병: "술", 정: "축", 무: "진", 임: "술", 계: "축",
};

const 천을귀인: Record<string, string[]> = {
  갑: ["축", "미"], 을: ["자", "신"], 병: ["유", "해"], 정: ["유", "해"],
  무: ["축", "미"], 기: ["자", "신"], 경: ["축", "미"], 신: ["인", "오"],
  임: ["묘", "사"], 계: ["묘", "사"],
};

const 학당귀인: Record<string, string> = {
  갑: "사", 을: "오", 병: "인", 정: "유", 무: "인", 기: "유", 경: "사", 신: "자", 임: "신", 계: "묘",
};

const 문창귀인: Record<string, string> = {
  갑: "사", 을: "오", 병: "신", 정: "유", 무: "신", 기: "유", 경: "해", 신: "자", 임: "인", 계: "묘",
};

/** 홍염은 흉살 */
const 홍염살: Record<string, string> = {
  갑: "오", 을: "오", 병: "인", 정: "미", 무: "진", 기: "진", 경: "술", 신: "유", 임: "자", 계: "신",
};

const 태극귀인: Array<{ stems: string[]; branches: string[] }> = [
  { stems: ["갑", "을"], branches: ["자", "오"] },
  { stems: ["병", "정"], branches: ["묘", "유"] },
  { stems: ["무", "기"], branches: ["진", "술", "축", "미"] },
  { stems: ["경", "신"], branches: ["인", "해"] },
  { stems: ["임", "계"], branches: ["사", "신"] },
];

const 관귀학관: Array<{ stems: string[]; branch: string }> = [
  { stems: ["갑", "을"], branch: "사" },
  { stems: ["병", "정"], branch: "신" },
  { stems: ["무", "기"], branch: "해" },
  { stems: ["경", "신"], branch: "인" },
  { stems: ["임", "계"], branch: "신" },
];

const 천주성: Array<{ stems: string[]; branch: string }> = [
  { stems: ["갑", "병"], branch: "사" },
  { stems: ["을", "정"], branch: "오" },
  { stems: ["무"], branch: "신" },
  { stems: ["기"], branch: "유" },
  { stems: ["경"], branch: "해" },
  { stems: ["신"], branch: "자" },
  { stems: ["임"], branch: "인" },
  { stems: ["계"], branch: "묘" },
];

const 암록: Record<string, string> = {
  갑: "해", 을: "술", 병: "신", 정: "미", 무: "신", 기: "미", 경: "사", 신: "진", 임: "인", 계: "축",
};

const 천라지망_pairs: ReadonlyArray<readonly [string, string]> = [
  ["술", "해"],
  ["진", "사"],
];

const 현침: { stems: Set<string>; branches: Set<string> } = {
  stems: new Set(["갑", "신"]),
  branches: new Set(["묘", "오", "미", "신"]),
};

const 괴강_일주세트 = new Set(["임진", "경진", "경술", "무술"]);

const 공망표: Array<{ set: Set<string>; voids: [string, string] }> = [
  { set: new Set(["갑자","을축","병인","정묘","무진","기사","경오","신미","임술","계유"]), voids: ["술","해"] },
  { set: new Set(["갑술","을해","병자","정축","무인","기묘","경진","신사","임오","계미"]), voids: ["신","유"] },
  { set: new Set(["갑신","을유","병술","정해","무자","기축","경인","신묘","임진","계사"]), voids: ["오","미"] },
  { set: new Set(["갑오","을미","병신","정유","무술","기해","경자","신축","임인","계묘"]), voids: ["진","사"] },
  { set: new Set(["갑진","을사","병오","정미","무신","기유","경술","신해","임자","계축"]), voids: ["인","묘"] },
  { set: new Set(["갑인","을묘","병진","정사","무오","기미","경신","신유","임진","계해"]), voids: ["자","축"] },
];

const 삼재그룹: Array<{ group: Set<string>; years: Set<string> }> = [
  { group: new Set(["해","묘","미"]), years: new Set(["사","오","미"]) },
  { group: new Set(["인","오","술"]), years: new Set(["신","유","술"]) },
  { group: new Set(["사","유","축"]), years: new Set(["해","자","축"]) },
  { group: new Set(["신","자","진"]), years: new Set(["인","묘","진"]) },
];

const 천덕귀인_byMonth:
  ReadonlyArray<{ month: string; needBranch: string } | { month: string; needStem: string }> = [
    { month: "자", needBranch: "사" },
    { month: "축", needStem: "경" },
    { month: "인", needStem: "정" },
    { month: "묘", needBranch: "신" },
    { month: "진", needStem: "임" },
    { month: "사", needBranch: "해" },
    { month: "미", needStem: "갑" },
    { month: "유", needBranch: "인" },
    { month: "술", needStem: "병" },
    { month: "해", needStem: "을" },
  ];

const 월덕귀인_byMonthStem: Readonly<Record<string, string>> = {
  자: "임", 축: "경", 인: "병", 묘: "갑", 진: "임", 사: "경", 오: "병", 미: "갑", 신: "임", 유: "경", 술: "병", 해: "신",
} as const;

/** 원진/귀문 쌍 */
const 원진_pairs: ReadonlyArray<readonly [string, string]> = [
  ["자","미"], ["인","유"], ["축","오"], ["묘","신"], ["진","해"], ["사","술"],
] as const;

const 귀문_pairs: ReadonlyArray<readonly [string, string]> = [
  ["인","미"], ["묘","신"], ["진","해"], ["사","술"], ["자","유"], ["축","오"],
] as const;

// 귀문 강세쌍
const 귀문_strong_set = new Set(["인미","미인","묘신","신문"]);

/** 무순서 쌍 포함 여부 */
function isInPairList(list: ReadonlyArray<readonly [string, string]>, a: string, b: string): boolean {
  for (const [x, y] of list) if ((x === a && y === b) || (x === b && y === a)) return true;
  return false;
}

/* helpers: 공망쌍/삼재 3지 구하기 */
function getVoidPair(pillar: string): [string, string] | null {
  for (const row of 공망표) if (row.set.has(pillar)) return row.voids;
  return null;
}
function getSamjaeYears(branch: string): string[] | null {
  for (const g of 삼재그룹) if (g.group.has(branch)) return Array.from(g.years);
  return null;
}

/* ────────────────────────────────────────────────────────────────────────────
 * 메인
 * ──────────────────────────────────────────────────────────────────────────── */
export function buildShinsalTags({
  natal,
  daewoon,
  sewoon,
  wolwoon,
  basis,
}: {
  natal: Pillars4;
  daewoon?: string | null;
  sewoon?: string | null;
  wolwoon?: string | null;
  basis?: ShinsalBasis;
}): {
  title: string;
  /** 원국-위치별 길/흉 + 운별 길/흉 */
  good: TagBucketsByPos & { dae: string[]; se: string[]; wolun: string[] };
  bad: TagBucketsByPos & { dae: string[]; se: string[]; wolun: string[] };
  /** 셀렉트에 보여줄 참고값 */
  meta: {
    voidPair: { day?: [string, string]; year?: [string, string] };
    samjaeYears: { day?: string[]; year?: string[] };
    currentBasis: { voidBasis: "day" | "year"; samjaeBasis: "day" | "year" };
  };
} {
  const voidBasis = basis?.voidBasis ?? "day";
  const samjaeBasis = basis?.samjaeBasis ?? "day";

  const title = `원국 ${natal.join(" · ")}`;
  const dStem = first(natal[idx.day]);
  const dBranch = last(natal[idx.day]);
  const mBranch = last(natal[idx.month]);
  const yBranch = last(natal[idx.year]);

  //const stems = natalStems(natal);
  const branches = natalBranches(natal);

  const natalGoodPos: TagBucketPos[] = [];
  const natalBadPos: TagBucketPos[] = [];

  // ── 길신 ── (라벨: #일간X<위치>_태그 / #월지X<위치>_태그 / #<위치>X<위치>_태그)
  // 금여록
  if (금여록[dStem]) {
    const b = 금여록[dStem];
    const best = findBestPosForBranch(b, natal);
    if (best) natalGoodPos.push({ name: labelSB_at("금여록", best.pos), weight: best.weight, pos: best.pos });
  }

  // 천을귀인
  if (천을귀인[dStem]) {
    for (const b of 천을귀인[dStem]) {
      const best = findBestPosForBranch(b, natal);
      if (best) natalGoodPos.push({ name: labelSB_at("천을귀인", best.pos), weight: best.weight, pos: best.pos });
    }
  }

  // 학당귀인
  if (학당귀인[dStem]) {
    const b = 학당귀인[dStem];
    const best = findBestPosForBranch(b, natal);
    if (best) natalGoodPos.push({ name: labelSB_at("학당귀인", best.pos), weight: best.weight, pos: best.pos });
  }

  // 문창귀인
  if (문창귀인[dStem]) {
    const b = 문창귀인[dStem];
    const best = findBestPosForBranch(b, natal);
    if (best) natalGoodPos.push({ name: labelSB_at("문창귀인", best.pos), weight: best.weight, pos: best.pos });
  }

  // 태극귀인
  for (const g of 태극귀인) {
    if (g.stems.includes(dStem)) {
      for (const b of g.branches) {
        const best = findBestPosForBranch(b, natal);
        if (best) natalGoodPos.push({ name: labelSB_at("태극귀인", best.pos), weight: best.weight, pos: best.pos });
      }
    }
  }

  // 관귀학관
  for (const g of 관귀학관) {
    if (g.stems.includes(dStem)) {
      const b = g.branch;
      const best = findBestPosForBranch(b, natal);
      if (best) natalGoodPos.push({ name: labelSB_at("관귀학관", best.pos), weight: best.weight, pos: best.pos });
    }
  }

  // 천주성
  for (const g of 천주성) {
    if (g.stems.includes(dStem)) {
      const b = g.branch;
      const best = findBestPosForBranch(b, natal);
      if (best) natalGoodPos.push({ name: labelSB_at("천주성", best.pos), weight: best.weight, pos: best.pos });
    }
  }

  // 암록
  if (암록[dStem]) {
    const b = 암록[dStem];
    const best = findBestPosForBranch(b, natal);
    if (best) natalGoodPos.push({ name: labelSB_at("암록", best.pos), weight: best.weight, pos: best.pos });
  }

  // 월덕귀인(월지→요구 천간; 그 천간이 존재하는 위치와 결합)
  {
    const needStem = 월덕귀인_byMonthStem[mBranch];
    if (needStem) {
      const st = findBestPosForStem(needStem, natal);
      if (st) {
        natalGoodPos.push({ name: labelMonth_withPos("월덕귀인", st.pos), weight: st.weight, pos: st.pos });
      }
    }
  }

  // 천덕귀인(월지 기반)
  for (const rule of 천덕귀인_byMonth) {
    if (rule.month !== mBranch) continue;
    if ("needBranch" in rule) {
      const b = rule.needBranch;
      const best = findBestPosForBranch(b, natal);
      if (best) natalGoodPos.push({ name: labelMonth_withPos("천덕귀인", best.pos), weight: best.weight, pos: best.pos });
    } else if ("needStem" in rule) {
      const st = findBestPosForStem(rule.needStem, natal);
      if (st) {
        natalGoodPos.push({ name: labelMonth_withPos("천덕귀인", st.pos), weight: st.weight, pos: st.pos });
      }
    }
  }

  // 삼기귀인(표기: #<위치>X<위치>X<위치>_삼기귀인(천상|인중|지하))
  {
    const triples: Array<{ key: "천상"|"인중"|"지하"; set: Set<string> }> = [
      { key: "천상", set: new Set(["갑","무","병"]) },
      { key: "인중", set: new Set(["을","병","정"]) },
      { key: "지하", set: new Set(["신","임","계"]) },
    ];
    const combos: ReadonlyArray<ReadonlyArray<PosIndex>> = [
      [idx.year, idx.month, idx.day],
      [idx.month, idx.day, idx.hour],
      [idx.day, idx.hour, idx.year],
      [idx.hour, idx.year, idx.month],
    ];
    const ring = natal.map(first);
    for (const t of triples) {
      for (const c of combos) {
        const have = new Set([ring[c[0]], ring[c[1]], ring[c[2]]]);
        if (![...t.set].every((x) => have.has(x))) continue;
        const chosen = [...c].reduce((best, p) => (POS_WEIGHT[p] > POS_WEIGHT[best] ? p : best), c[0]);
        const label = `#${posKo(c[0])}X${posKo(c[1])}X${posKo(c[2])}_삼기귀인(${t.key})`;
        const weight =
          (c.includes(idx.day) ? POS_WEIGHT[idx.day] : 0) ||
          (c.includes(idx.month) ? POS_WEIGHT[idx.month] : 0) ||
          POS_WEIGHT[idx.year];
        natalGoodPos.push({ name: label, weight, pos: chosen });
        break;
      }
    }
  }

  // ── 흉살 ──
  // 양인
  if (양인[dStem]) {
    const b = 양인[dStem];
    const best = findBestPosForBranch(b, natal);
    if (best) natalBadPos.push({ name: labelSB_at("양인", best.pos), weight: best.weight, pos: best.pos });
  }

  // 백호
  if (백호[dStem]) {
    const b = 백호[dStem];
    const best = findBestPosForBranch(b, natal);
    if (best) natalBadPos.push({ name: labelSB_at("백호", best.pos), weight: best.weight, pos: best.pos });
  }

  // 홍염살(흉)
  if (홍염살[dStem]) {
    const b = 홍염살[dStem];
    const best = findBestPosForBranch(b, natal);
    if (best) natalBadPos.push({ name: labelSB_at("홍염살", best.pos), weight: best.weight, pos: best.pos });
  }

  // 천라지망: 두 지지 동시 존재 → 양쪽 주 모두 표기
  for (const [a, b] of 천라지망_pairs) {
    const pa = findBestPosForBranch(a, natal);
    const pb = findBestPosForBranch(b, natal);
    if (pa && pb) {
      const label = labelPair_at("천라지망", pa.pos, pb.pos);
      natalBadPos.push({ name: label, weight: pa.weight, pos: pa.pos });
      natalBadPos.push({ name: label, weight: pb.weight, pos: pb.pos });
    }
  }

  // 현침: 일간×각 지지(해당되면 모두 표기)
  if (현침.stems.has(dStem)) {
    const positions: PosIndex[] = [idx.year, idx.month, idx.day, idx.hour];
    for (const p of positions) {
      const b = last(natal[p]);
      if (현침.branches.has(b)) {
        natalBadPos.push({ name: labelSB_at("현침살", p), weight: POS_WEIGHT[p], pos: p });
      }
    }
  }

  // 괴강살: 일주 단독
  if (괴강_일주세트.has(natal[idx.day])) {
    natalBadPos.push({ name: labelIlju("괴강살"), weight: POS_WEIGHT[idx.day], pos: idx.day });
  }

  // 공망(원국): 기준쌍 활성 지지 *실존* 시 해당 위치에만 표기
  const dayVoid  = getVoidPair(natal[idx.day]);
  const yearVoid = getVoidPair(natal[idx.year]);
  {
    const active = voidBasis === "day" ? dayVoid : yearVoid;
    if (active) {
      const [v1, v2] = active;
      const positions: PosIndex[] = [idx.year, idx.month, idx.day, idx.hour];
      for (const p of positions) {
        const b = last(natal[p]);
        if (b === v1 || b === v2) {
          natalBadPos.push({ name: labelVoid_at(voidBasis, p), weight: POS_WEIGHT[p], pos: p });
        }
      }
    }
  }

  // 원진: (시+연) 제외, 성립하면 양쪽 주 모두 표기
  {
    const pairs: Array<[PosIndex, PosIndex]> = [
      [idx.year,  idx.month],
      [idx.year,  idx.day],
      // [idx.year, idx.hour], // 제외
      [idx.month, idx.day],
      [idx.month, idx.hour],
      [idx.day,   idx.hour],
    ];
    for (const [p1, p2] of pairs) {
      const b1 = last(natal[p1]), b2 = last(natal[p2]);
      if (isInPairList(원진_pairs, b1, b2)) {
        const label = labelPair_at("원진", p1, p2);
        natalBadPos.push({ name: label, weight: POS_WEIGHT[p1], pos: p1 });
        natalBadPos.push({ name: label, weight: POS_WEIGHT[p2], pos: p2 });
      }
    }
  }

  // 귀문: 연지 제외 + 인접(월-일, 일-시)만; 양쪽 표기(+보너스 가중은 그대로)
  {
    const pairs: Array<[PosIndex, PosIndex, "월일" | "일시"]> = [
      [idx.month, idx.day, "월일"],
      [idx.day,   idx.hour, "일시"],
    ];
    for (const [p1, p2, kind] of pairs) {
      const b1 = last(natal[p1]), b2 = last(natal[p2]);
      if (isInPairList(귀문_pairs, b1, b2)) {
        const bonus = (kind === "월일" ? 1 : 0) + (귀문_strong_set.has(b1 + b2) ? 1 : 0);
        const label = labelPair_at("귀문", p1, p2);
        natalBadPos.push({ name: label, weight: POS_WEIGHT[p1] + bonus, pos: p1 });
        natalBadPos.push({ name: label, weight: POS_WEIGHT[p2] + bonus, pos: p2 });
      }
    }
  }

  // ── 위치별 분류 ──
  const goodPosDedup = uniqKeepMaxPerPos(natalGoodPos);
  const badPosDedup  = uniqKeepMaxPerPos(natalBadPos);

  const goodByPos: TagBucketsByPos = { si: [], il: [], yeon: [], wol: [] };
  const badByPos: TagBucketsByPos  = { si: [], il: [], yeon: [], wol: [] };
  for (const it of goodPosDedup) goodByPos[posToKey(it.pos)].push(it.name);
  for (const it of badPosDedup)  badByPos[posToKey(it.pos)].push(it.name);

  // ── 운(대운/세운/월운) ──
  const luckGoodDae: string[] = [];
  const luckGoodSe: string[]  = [];
  const luckGoodWol: string[] = [];
  const luckBadDae: string[]  = [];
  const luckBadSe: string[]   = [];
  const luckBadWol: string[]  = [];

  function pushLuck(arr: string[], v: string) {
    if (!arr.includes(v)) arr.push(v);
  }

  function matchLuckOne(src: Source, luck: string | null) {
    const gz = parseGZ(luck);
    if (!gz) return;
    const Lb = gz.branch;
    const Ls = gz.stem;

    const good = src === "dae" ? luckGoodDae : src === "se" ? luckGoodSe : luckGoodWol;
    const bad  = src === "dae" ? luckBadDae  : src === "se" ? luckBadSe  : luckBadWol;

    // 길신 (일간×운)
    if (금여록[dStem] === Lb)        pushLuck(good, labelLuck_SB("금여록", src));
    if (천을귀인[dStem]?.includes(Lb)) pushLuck(good, labelLuck_SB("천을귀인", src));
    if (학당귀인[dStem] === Lb)     pushLuck(good, labelLuck_SB("학당귀인", src));
    if (문창귀인[dStem] === Lb)     pushLuck(good, labelLuck_SB("문창귀인", src));
    for (const g of 태극귀인) if (g.stems.includes(dStem) && g.branches.includes(Lb))
      pushLuck(good, labelLuck_SB("태극귀인", src));
    for (const g of 관귀학관) if (g.stems.includes(dStem) && g.branch === Lb)
      pushLuck(good, labelLuck_SB("관귀학관", src));
    for (const g of 천주성) if (g.stems.includes(dStem) && g.branch === Lb)
      pushLuck(good, labelLuck_SB("천주성", src));
    if (암록[dStem] === Lb)          pushLuck(good, labelLuck_SB("암록", src));

    // 흉살 (일간×운)
    if (양인[dStem] === Lb)          pushLuck(bad, labelLuck_SB("양인", src));
    if (백호[dStem] === Lb)          pushLuck(bad, labelLuck_SB("백호", src));
    if (홍염살[dStem] === Lb)        pushLuck(bad, labelLuck_SB("홍염살", src));

    // 천라지망(운지+원국 지지) → #세운X<위치>_천라지망
    for (const nb of branches) {
      if (isInPairList(천라지망_pairs, Lb, nb)) {
        const pos = findBestPosForBranch(nb, natal)?.pos;
        if (pos !== undefined) pushLuck(bad, labelLuck_SrcWithPos("천라지망", src, pos));
        break;
      }
    }

    // 현침(일간×운지)
    if (현침.stems.has(dStem) && 현침.branches.has(Lb)) {
      pushLuck(bad, labelLuck_SB("현침살", src));
    }

    // 공망(기준) — 운지가 공망쌍이면 표기
    const pair = voidBasis === "day" ? dayVoid : yearVoid;
    if (pair && (Lb === pair[0] || Lb === pair[1])) {
      pushLuck(bad, labelLuck_Void(src, voidBasis));
    }

    // 천덕귀인(월지×운)
    for (const rule of 천덕귀인_byMonth) {
      if (rule.month !== mBranch) continue;
      if ("needBranch" in rule && Lb === rule.needBranch) pushLuck(good, labelLuck_Month("천덕귀인", src));
      if ("needStem" in rule && Ls === rule.needStem)     pushLuck(good, labelLuck_Month("천덕귀인", src));
    }

    // 월덕귀인(월지×운간)
    {
      const needStem = 월덕귀인_byMonthStem[mBranch];
      if (needStem && Ls === needStem) pushLuck(good, labelLuck_Month("월덕귀인", src));
    }

    // 천의성(월지×운지)
    const 천의매핑: Record<string, string> = {
      자:"해", 축:"자", 인:"축", 묘:"인", 진:"묘", 사:"진", 오:"사", 미:"오", 신:"미", 유:"신", 술:"유", 해:"술",
    };
    if (천의매핑[mBranch] === Lb) pushLuck(good, labelLuck_Month("천의성", src));

    // 원진(운지+원국 지지) — #세운X<위치>_원진
    for (const nb of branches) {
      if (isInPairList(원진_pairs, Lb, nb)) {
        const pos = findBestPosForBranch(nb, natal)?.pos;
        if (pos !== undefined) pushLuck(bad, labelLuck_SrcWithPos("원진", src, pos));
        break;
      }
    }

    // 귀문(운지+월/일지) — 연지 제외
    {
      // 일지 매칭
      if (isInPairList(귀문_pairs, Lb, dBranch)) pushLuck(bad, labelLuck_SrcWithPos("귀문", src, idx.day));
      // 월지 매칭
      if (isInPairList(귀문_pairs, Lb, mBranch)) pushLuck(bad, labelLuck_SrcWithPos("귀문", src, idx.month));
    }

    // 삼재(세운): (일지|연지) × 세운
    if (src === "se") {
      const baseBranch = samjaeBasis === "day" ? dBranch : yBranch;
      const yrs = baseBranch ? getSamjaeYears(baseBranch) : null;
      if (yrs && yrs.includes(Lb)) pushLuck(bad, labelLuck_Samjae(src, samjaeBasis));
    }

    // 상문/조객(세운): 연지 × 세운
    if (src === "se") {
      const 표: Record<string, { sang: string; joe: string }> = {
        자:{sang:"인",joe:"술"}, 축:{sang:"묘",joe:"해"}, 인:{sang:"진",joe:"자"}, 묘:{sang:"사",joe:"축"},
        진:{sang:"오",joe:"인"}, 사:{sang:"미",joe:"묘"}, 오:{sang:"신",joe:"진"}, 미:{sang:"유",joe:"사"},
        신:{sang:"술",joe:"오"}, 유:{sang:"해",joe:"미"}, 술:{sang:"자",joe:"신"}, 해:{sang:"축",joe:"유"},
      };
      const p = 표[yBranch];
      if (p) {
        if (Lb === p.sang) pushLuck(bad, labelLuck_SangJoe(src, "상문살"));
        if (Lb === p.joe)  pushLuck(bad, labelLuck_SangJoe(src, "조객살"));
      }
    }
  }

  matchLuckOne("dae", daewoon ?? null);
  matchLuckOne("se",  sewoon  ?? null);
  matchLuckOne("wol", wolwoon ?? null);

  return {
    title,
    good: { ...goodByPos, dae: luckGoodDae, se: luckGoodSe, wolun: luckGoodWol },
    bad:  { ...badByPos,  dae: luckBadDae,  se: luckBadSe,  wolun: luckBadWol },
    meta: {
      voidPair: { day: dayVoid ?? undefined, year: yearVoid ?? undefined },
      samjaeYears: {
        day: getSamjaeYears(dBranch) ?? undefined,
        year: getSamjaeYears(yBranch) ?? undefined,
      },
      currentBasis: { voidBasis, samjaeBasis },
    },
  };
}
