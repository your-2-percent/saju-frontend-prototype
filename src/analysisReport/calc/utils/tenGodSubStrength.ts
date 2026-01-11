/* ========================= 타입 ========================= */
type Element = "목" | "화" | "토" | "금" | "수";
export type TenGodMain = "비겁" | "식상" | "재성" | "관성" | "인성";
export type TenGodSubtype =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

export type PerTenGodSub = Record<TenGodSubtype, number>;

export type PerTenGodAggregated = Record<TenGodMain, {
  a: TenGodSubtype; // 정
  b: TenGodSubtype; // 편
  aVal: number;
  bVal: number;
}>;

const MAIN_ORDER: readonly TenGodMain[] = ["비겁", "식상", "재성", "관성", "인성"] as const;
const MAIN_TO_SUB: Record<TenGodMain, readonly [TenGodSubtype, TenGodSubtype]> = {
  비겁: ["비견", "겁재"],
  식상: ["식신", "상관"],
  재성: ["정재", "편재"],
  관성: ["정관", "편관"],
  인성: ["정인", "편인"],
} as const;

/* ========================= 간지/오행 기초 ========================= */
const STEM_TO_ELEMENT: Record<string, Element> = {
  갑:"목", 을:"목", 병:"화", 정:"화", 무:"토", 기:"토",
  경:"금", 신:"금", 임:"수", 계:"수",
  甲:"목", 乙:"목", 丙:"화", 丁:"화", 戊:"토", 己:"토",
  庚:"금", 辛:"금", 壬:"수", 癸:"수",
};
const BRANCH_MAIN_ELEMENT: Record<string, Element> = {
  자:"수", 축:"토", 인:"목", 묘:"목", 진:"토", 사:"화",
  오:"화", 미:"토", 신:"금", 유:"금", 술:"토", 해:"수",
  子:"수", 丑:"토", 寅:"목", 卯:"목", 辰:"토", 巳:"화",
  午:"화", 未:"토", 申:"금", 酉:"금", 戌:"토", 亥:"수",
};
const BRANCH_MAIN_STEM: Record<string, string> = {
  자:"계", 축:"기", 인:"갑", 묘:"을", 진:"무", 사:"병",
  오:"정", 미:"기", 신:"경", 유:"신", 술:"무", 해:"임",
  子:"계", 丑:"기", 寅:"갑", 卯:"을", 辰:"무", 巳:"병",
  午:"정", 未:"기", 申:"경", 酉:"신", 戌:"무", 亥:"임",
};
const YANG_STEMS = new Set(["갑","병","무","경","임","甲","丙","戊","庚","壬"]);
const SHENG_NEXT: Record<Element, Element> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
const KE:         Record<Element, Element> = { 목:"토", 화:"금", 토:"수", 금:"목", 수:"화" };
const KE_REV:     Record<Element, Element> = { 토:"목", 금:"화", 수:"토", 목:"금", 화:"수" };
const SHENG_PREV: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };

export function isStemKey(k: string) {
  return "갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸".includes(k.charAt(0));
}
function isYangStem(stem: string) {
  return YANG_STEMS.has(stem.charAt(0));
}
function elementOfKey(key: string): Element | null {
  const c = key.charAt(0);
  if (STEM_TO_ELEMENT[c]) return STEM_TO_ELEMENT[c];
  if (BRANCH_MAIN_ELEMENT[c]) return BRANCH_MAIN_ELEMENT[c];
  return null;
}
// 음양 비교용: 지지는 본기, 천간은 자신
function comparableStemOfKey(key: string): string | null {
  const c = key.charAt(0);
  if (STEM_TO_ELEMENT[c]) return c;
  if (BRANCH_MAIN_STEM[c]) return BRANCH_MAIN_STEM[c];
  return null;
}

export function mapKeyToTenGodSub(dayStem: string, targetKey: string): TenGodSubtype {
  const dayEl = elementOfKey(dayStem);
  const targetEl = elementOfKey(targetKey);
  if (!dayEl || !targetEl) return "비견";

  let main: TenGodSubtype;
  if (targetEl === dayEl) main = "비견";
  else if (targetEl === SHENG_NEXT[dayEl]) main = "식신";
  else if (targetEl === KE[dayEl])        main = "편재";
  else if (targetEl === KE_REV[dayEl])    main = "편관";
  else if (targetEl === SHENG_PREV[dayEl])main = "편인";
  else main = "비견";

  const dayYang = isYangStem(dayStem);
  const comp = comparableStemOfKey(targetKey);
  const tgtYang = comp ? isYangStem(comp) : dayYang;

  switch (main) {
    case "비견": return dayYang === tgtYang ? "비견" : "겁재";
    case "식신": return dayYang === tgtYang ? "식신" : "상관";
    case "편재": return dayYang === tgtYang ? "편재" : "정재";
    case "편관": return dayYang === tgtYang ? "편관" : "정관";
    case "편인": return dayYang === tgtYang ? "편인" : "정인";
  }
}

/* ========================= 운 주입 유틸 ========================= */
function addGZToPerKey(
  perKey: Record<string, number>,
  gz: string | null | undefined,
  weight = 100,
  stemWeightRatio = 0.5
) {
  if (!gz || gz.length < 2 || weight <= 0) return;
  const s = gz.charAt(0);
  const b = gz.charAt(1);
  const wS = Math.round(weight * stemWeightRatio);
  const wB = Math.round(weight * (1 - stemWeightRatio));
  if (s) perKey[s] = (perKey[s] ?? 0) + wS;
  if (b) perKey[b] = (perKey[b] ?? 0) + wB;
}

export function mergeLuckIntoPerKey(
  base: Record<string, number>,
  opts: {
    tab: "원국" | "대운" | "세운" | "월운" | "일운";
    dae?: string | null;
    se?: string | null;
    wol?: string | null;
    il?: string | null;
    weightPerLayer?: number;
    stemWeightRatio?: number;
  }
): Record<string, number> {
  const perKey = { ...base };
  const w = opts.weightPerLayer ?? 100;
  const r = opts.stemWeightRatio ?? 0.5;

  if (opts.tab !== "원국") addGZToPerKey(perKey, opts.dae, w, r);
  if (opts.tab === "세운" || opts.tab === "월운" || opts.tab === "일운") addGZToPerKey(perKey, opts.se, w, r);
  if (opts.tab === "월운" || opts.tab === "일운") addGZToPerKey(perKey, opts.wol, w, r);
  if (opts.tab === "일운") addGZToPerKey(perKey, opts.il, w, r);
  return perKey;
}

/* ========================= 브레이크다운 + 퍼센트 ========================= */
// 소분류별 합계 + 어떤 간지(key)가 몇 점 기여했는지
export function computeTenGodSubBreakdown(
  perKeyScaled: Record<string, number>,
  dayStem: string
): { totals: PerTenGodSub; byKey: Record<TenGodSubtype, Record<string, number>>; grandTotal: number } {
  const totals: PerTenGodSub = {
    비견:0, 겁재:0, 식신:0, 상관:0, 정재:0, 편재:0, 정관:0, 편관:0, 정인:0, 편인:0,
  };
  const byKey: Record<TenGodSubtype, Record<string, number>> = {
    비견:{}, 겁재:{}, 식신:{}, 상관:{}, 정재:{}, 편재:{}, 정관:{}, 편관:{}, 정인:{}, 편인:{},
  };
  let grandTotal = 0;

  for (const [key, raw] of Object.entries(perKeyScaled)) {
    const score = Number(raw) || 0;
    if (score <= 0) continue;
    // 키가 천간/지지 둘 다 허용
    if (!elementOfKey(key)) continue;

    const sub = mapKeyToTenGodSub(dayStem.charAt(0), key.charAt(0));
    totals[sub] += score;
    byKey[sub][key] = (byKey[sub][key] ?? 0) + score;
    grandTotal += score;
  }
  return { totals, byKey, grandTotal };
}

export function normalizeToPercent100(map: Record<string, number>): Record<string, number> {
  const sum = Object.values(map).reduce((a, b) => a + b, 0);
  if (sum <= 0) {
    const zeroed: Record<string, number> = {};
    for (const k of Object.keys(map)) zeroed[k] = 0;
    return zeroed;
  }
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(map)) out[k] = +(v * 100 / sum).toFixed(2);
  return out;
}

export function aggregateMainFromSubPercent(subPct: PerTenGodSub): PerTenGodAggregated {
  const out = {} as PerTenGodAggregated;
  for (const m of MAIN_ORDER) {
    const [a, b] = MAIN_TO_SUB[m];
    out[m] = { a, b, aVal: subPct[a], bVal: subPct[b] };
  }
  return out;
}