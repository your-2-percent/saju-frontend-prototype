// features/AnalysisReport/computePowerData.ts
import type { PowerData, TenGod, Element } from "./types";
import { STEM_TO_ELEMENT, BRANCH_MAIN_ELEMENT } from "./hiddenStem";
import { mapElementsToTenGods } from "./tenGod";
import { getTenGodColors } from "./colors";
import { TONGGEUN_HAGEONCHUNG, TONGGEUN_CLASSIC } from "./tonggeun";
import { applyHarmonyOverlay, normalizeGZ } from "../logic/relations";
import { computeDeukFlags, type DeukFlags, type CriteriaMode } from "./strength";

/* =========================
 * 한자→한글 보정
 * ========================= */
const STEM_H2K: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
const BRANCH_H2K: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};
const toKoStem = (ch: string) => STEM_H2K[ch] ?? ch;
const toKoBranch = (ch: string) => BRANCH_H2K[ch] ?? ch;
function toKoGZ(raw: string): string {
  if (!raw || raw.length < 2) return "";
  return `${toKoStem(raw[0]!)}` + `${toKoBranch(raw[1]!)}`;
}

/* =========================
 * 자리 가중치(현대/고전)
 * ========================= */
type PillarPos = "year" | "month" | "day" | "hour";
const PILLAR_ORDER: PillarPos[] = ["year", "month", "day", "hour"];

// 현대
const WEIGHTS_MODERN: Record<PillarPos, { stem: number; branch: number }> = {
  year:  { stem: 10, branch: 10 },
  month: { stem: 15, branch: 30 },
  day:   { stem: 25, branch: 25 },
  hour:  { stem: 15, branch: 15 },
};

// 고전
const WEIGHTS_CLASSIC: Record<PillarPos, { stem: number; branch: number }> = {
  year:  { stem: 10, branch: 10 },
  month: { stem: 15, branch: 45 },
  day:   { stem: 25, branch: 40 },
  hour:  { stem: 15, branch: 12.5 },
};

/* =========================
 * 음양
 * ========================= */
type YinYang = "양" | "음";
const YIN_STEMS = new Set(["을", "정", "기", "신", "계"]);
const BRANCH_YANG = new Set(["자","인","진","오","신","술"]);
const BRANCH_INVERT = new Set(["사","오","자","해"]); // 반전

const stemPolarity = (s: string): YinYang => (YIN_STEMS.has(s) ? "음" : "양");
const branchPolarity = (b: string): YinYang => {
  const base: YinYang = BRANCH_YANG.has(b) ? "양" : "음";
  return BRANCH_INVERT.has(b) ? (base === "양" ? "음" : "양") : base;
};

/* =========================
 * 정규화(합 100, 정수)
 * ========================= */
function normalizeTo100(values: number[]): number[] {
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum <= 0) return values.map(() => 0);
  const pct = values.map((v) => (v * 100) / sum);
  const floor = pct.map(Math.round);
  const used = floor.reduce((a, b) => a + b, 0);
  const rem = 100 - used;
  const frac = pct.map((v, i) => ({ i, f: v - floor[i]! })).sort((a, b) => b.f - a.f);
  for (let k = 0; k < rem; k++) floor[frac[k]!.i] += 1;
  return floor;
}

/* =========================
 * 2-2 투출 가중
 * ========================= */
function projectionPercent(dist: 0 | 1 | 2, samePol: boolean): number {
  if (dist === 0) return samePol ? 1.0 : 0.8;
  if (dist === 1) return samePol ? 0.6 : 0.5;
  return samePol ? 0.3 : 0.2;
}

/* =========================
 * 왕상휴수사 + 십신↔오행 매핑
 * ========================= */
type StrengthLevel = "왕" | "상" | "휴" | "수" | "사";
const LV_ADJ: Record<StrengthLevel, number> = { 왕:+0.15, 상:+0.10, 휴:-0.15, 수:-0.20, 사:-0.25 };

const SHENG_NEXT: Record<Element, Element> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
const SHENG_PREV: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };
const KE:         Record<Element, Element> = { 목:"토", 화:"금", 토:"수", 금:"목", 수:"화" };
const KE_REV:     Record<Element, Element> = { 토:"목", 금:"화", 수:"토", 목:"금", 화:"수" };

function relationLevel(me: Element, nb: Element): StrengthLevel {
  if (me === nb) return "왕";
  if (SHENG_NEXT[nb] === me) return "상";
  if (SHENG_NEXT[me] === nb) return "휴";
  if (KE[me] === nb)        return "수";
  if (KE[nb] === me)        return "사";
  return "휴";
}

/* =========================
 * 유틸
 * ========================= */
const gzStem = (gz: string) => (gz && gz.length >= 1 ? gz[0]! : "");
const gzBranch = (gz: string) => (gz && gz.length >= 2 ? gz[1]! : "");

/* =========================
 * 타입
 * ========================= */
export type TenGodSubtype =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

export interface ComputeOptions {
  pillars: string[];
  dayStem?: string;
  mode?: "hgc" | "classic";
  hidden?: "all" | "regular";
  debug?: boolean;
  useHarmonyOverlay?: boolean;
  criteriaMode?: CriteriaMode;
  luck?: {
    tab: "원국" | "대운" | "세운" | "월운" | "일운";
    dae?: string | null;
    se?: string | null;
    wol?: string | null;
    il?: string | null;
  };
  hourKey: string
}

export interface ComputeResult {
  totals: PowerData[];
  perTenGod: Record<TenGod, { a: TenGodSubtype; b: TenGodSubtype; aVal: number; bVal: number }>;
  elementScoreRaw: Record<Element, number>;
  deukFlags: DeukFlags;
  /** 천간별 세부 오행 기여(예: 갑목/을목/경금/신금 …) */
  perStemElement: Record<string, number>;
  /** 위 값을 각 대분류(비겁·식상·…) 토탈에 맞춰 비례 스케일한 값 */
  perStemElementScaled: Record<string, number>;
}

/* =========================
 * 메인
 * ========================= */
export function computePowerDataDetailed(opts: ComputeOptions): ComputeResult {
  const {
    pillars, dayStem: dayStemOverride,
    mode: hiddenMode, /* hidden: _hiddenStemSetting, */
    debug, useHarmonyOverlay, criteriaMode, luck
  } = opts;

  const WEIGHTS = criteriaMode === "modern" ? WEIGHTS_MODERN : WEIGHTS_CLASSIC;

  // 누적 버킷
  const elementScore: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };

  // 입력 정규화
  const pillarsKo = (pillars ?? []).slice(0, 4).map(toKoGZ);
  // ✔ 연/월/일 3개만 유효하면 진행, 시주는 없어도 OK
  const requiredOK =
    pillarsKo.length === 4 &&
    pillarsKo[0] && pillarsKo[0].length >= 2 &&
    pillarsKo[1] && pillarsKo[1].length >= 2 &&
    pillarsKo[2] && pillarsKo[2].length >= 2;
  if (!requiredOK) {
    const zeros: PowerData[] = (["비겁","식상","재성","관성","인성"] as TenGod[])
      .map(n => ({ name:n, value:0, color:"#999" }));
    return {
      totals: zeros,
      perTenGod: {
        비겁:{a:"비견",b:"겁재",aVal:0,bVal:0},
        식상:{a:"식신",b:"상관",aVal:0,bVal:0},
        재성:{a:"정재",b:"편재",aVal:0,bVal:0},
        관성:{a:"정관",b:"편관",aVal:0,bVal:0},
        인성:{a:"정인",b:"편인",aVal:0,bVal:0},
      },
      elementScoreRaw: elementScore,
      deukFlags: {
        비겁:{령:false,지:false,세:false},
        식상:{령:false,지:false,세:false},
        재성:{령:false,지:false,세:false},
        관성:{령:false,지:false,세:false},
        인성:{령:false,지:false,세:false},
      },
      perStemElement: {},
      perStemElementScaled: {},
    };
  }

  const dayStemFromPillars = gzStem(pillarsKo[2]!);
  const dayStem = dayStemOverride ?? dayStemFromPillars;
  const dayEl: Element =
    dayStem === "갑" || dayStem === "을" ? "목" :
    dayStem === "병" || dayStem === "정" ? "화" :
    dayStem === "무" || dayStem === "기" ? "토" :
    dayStem === "경" || dayStem === "신" ? "금" : "수";

  const tongMap = hiddenMode === "classic" ? TONGGEUN_CLASSIC : TONGGEUN_HAGEONCHUNG;

  // 파트 트래킹
  type StemPart = { stem?: string; el?: Element; pol?: YinYang; val: number };
  const stemParts: StemPart[] = [{val:0},{val:0},{val:0},{val:0}];

  type BranchPart = { el: Element; pol: YinYang; val: number };
  const branchParts: BranchPart[][] = [[],[],[],[]];

  /* 2) 자리 점수(천간/지지) */
  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i]!;
    if (!gz || gz.length < 2) continue;
    const pos = PILLAR_ORDER[i]!;
    const s = gzStem(gz);
    const b = gzBranch(gz);
    const w = WEIGHTS[pos];

    // 천간 기본
    const elS = STEM_TO_ELEMENT[s];
    if (elS) {
      elementScore[elS] += w.stem;
      stemParts[i] = { stem: s, el: elS, pol: stemPolarity(s), val: w.stem };
    }

    // 지지 기본(주기운 100%)
    const elB = BRANCH_MAIN_ELEMENT[b];
    if (elB) {
      elementScore[elB] += w.branch;
      branchParts[i].push({ el: elB, pol: branchPolarity(b), val: w.branch });
    }
  }

  /* 2-1) 통근율(천간) */
  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i]!;
    if (!gz || gz.length < 2) continue;
    const pos = PILLAR_ORDER[i]!;
    const rate = tongMap[gz] ?? 0;
    if (rate === 0) continue;
    const s = gzStem(gz);
    const elS = STEM_TO_ELEMENT[s];
    if (!elS) continue;
    const add = WEIGHTS[pos].stem * rate;
    elementScore[elS] += add;
    stemParts[i].val += add;
  }

  /* 2-2) 투출(지지 → 같은 오행의 천간) */
  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i]!;
    if (!gz || gz.length < 2) continue;
    const b = gzBranch(gz);
    const mainEl = BRANCH_MAIN_ELEMENT[b];
    if (!mainEl) continue;

    const base = WEIGHTS[PILLAR_ORDER[i]!].branch;
    const bPol = branchPolarity(b);

    let addSum = 0;
    const cand: number[] = [i];
    if (i - 1 >= 0) cand.push(i - 1);
    if (i + 1 <= 3) cand.push(i + 1);
    if (i - 2 >= 0) cand.push(i - 2);
    if (i + 2 <= 3) cand.push(i + 2);
    const uniq = Array.from(new Set(cand));

    for (const si of uniq) {
      if (!pillarsKo[si] || pillarsKo[si]!.length < 2) continue;
      const s = gzStem(pillarsKo[si]!);
      const sEl = STEM_TO_ELEMENT[s];
      if (!sEl || sEl !== mainEl) continue;
      const same = stemPolarity(s) === bPol;
      const dist = Math.abs(si - i) as 0 | 1 | 2;
      const pct = projectionPercent(dist, same);
      addSum += base * pct;
    }

    if (addSum !== 0) {
      elementScore[mainEl] += addSum;
      branchParts[i].push({ el: mainEl, pol: bPol, val: addSum });
    }
  }

  /* 3) 왕상휴수사 보정(천간/지지 각각) */
  // 천간
  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i]!;
    if (!gz || gz.length < 2) continue;       // ← 추가
    const s = gzStem(gz);
    const el = STEM_TO_ELEMENT[s];
    if (!el) continue;
    let adj = 0;

    const b = gzBranch(pillarsKo[i]!);
    const nbElV = BRANCH_MAIN_ELEMENT[b];
    if (nbElV) adj += LV_ADJ[relationLevel(el, nbElV)];

    const sideIdx = i === 0 ? [1] : i === 3 ? [2] : [i - 1, i + 1];
    for (const j of sideIdx) {
      const ns = gzStem(pillarsKo[j]!);
      const nbEl = STEM_TO_ELEMENT[ns];
      if (!nbEl) continue;
      adj += LV_ADJ[relationLevel(el, nbEl)];
    }

    const before = stemParts[i].val;
    if (before !== 0 && adj !== 0) {
      const after = Math.round((before * (1 + adj)) * 10) / 10;
      const delta = after - before;
      elementScore[el] += delta;
      stemParts[i].val = after;
    }
  }
  // 지지
  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i]!;
    if (!gz || gz.length < 2) continue;       // ← 추가
    const b = gzBranch(gz);
    const el = BRANCH_MAIN_ELEMENT[b];
    if (!el) continue;
    let adj = 0;

    const s = gzStem(pillarsKo[i]!);
    const nbElU = STEM_TO_ELEMENT[s];
    if (nbElU) adj += LV_ADJ[relationLevel(el, nbElU)];

    const sideIdx = i === 0 ? [1] : i === 3 ? [2] : [i - 1, i + 1];
    for (const j of sideIdx) {
      if (!pillarsKo[j] || pillarsKo[j]!.length < 2) continue;
      const nb = gzBranch(pillarsKo[j]!);
      const nbEl = BRANCH_MAIN_ELEMENT[nb];
      if (!nbEl) continue;
      adj += LV_ADJ[relationLevel(el, nbEl)];
    }

    const baseHere = branchParts[i].reduce((a, p) => a + p.val, 0);
    if (baseHere !== 0 && adj !== 0) {
      const after = Math.round((baseHere * (1 + adj)) * 10) / 10;
      const delta = after - baseHere;
      elementScore[el] += delta;
      if (branchParts[i].length > 0) branchParts[i][0]!.val += delta;
    }
  }

  /* (옵션) 합충형파해 오버레이 */
  if (useHarmonyOverlay) {
    applyHarmonyOverlay(pillarsKo, elementScore);
  }

  /* 3.5) 운 오버레이 */
  type LuckKind = "dae" | "se" | "wol";
  const LUCK_PCT: Record<LuckKind, { stem: number; branch: number }> = {
    dae: { stem: 0.040, branch: 0.040 },
    se:  { stem: 0.030, branch: 0.030 },
    wol: { stem: 0.020, branch: 0.020 },
  };

  type LuckPart = { stem?: string; el: Element; pol: YinYang; val: number };
  const luckSubs: LuckPart[] = [];

  function addLuckGZ(raw: string | null | undefined, kind: LuckKind) {
    const ko = raw ? normalizeGZ(raw) : "";
    if (!ko || ko.length < 2) return;
    const s = gzStem(ko);
    const b = gzBranch(ko);
    const elS = STEM_TO_ELEMENT[s];
    const elB = BRANCH_MAIN_ELEMENT[b];
    const sumBase = Math.max(
      1,
      (elementScore.목??0)+(elementScore.화??0)+(elementScore.토??0)+(elementScore.금??0)+(elementScore.수??0)
    );
    const pct = LUCK_PCT[kind];

    if (elS) {
      const add = Math.round(sumBase * pct.stem);
      elementScore[elS] += add;
      luckSubs.push({ stem: s, el: elS, pol: stemPolarity(s), val: add }); // 천간(운)
    }
    if (elB) {
      const add = Math.round(sumBase * pct.branch);
      elementScore[elB] += add;
      luckSubs.push({ el: elB, pol: branchPolarity(b), val: add }); // 지지(운) — stem 없음
    }
  }

  if (luck && luck.tab !== "원국") {
    addLuckGZ(luck.dae, "dae");
    if (luck.tab === "세운" || luck.tab === "월운") addLuckGZ(luck.se, "se");
    if (luck.tab === "월운") addLuckGZ(luck.wol, "wol");
  }

  /* 4) 오행→십신 대분류 누적 */
  const tenAcc: Record<TenGod, number> = { 비겁:0, 식상:0, 재성:0, 관성:0, 인성:0 };
  (Object.entries(elementScore) as [Element, number][]).forEach(([el, v]) => {
    tenAcc[mapElementsToTenGods(el, dayStem)] += v;
  });

  /* 5) 십신 소분류(음양 반영) */
  const subAcc: Record<TenGodSubtype, number> = {
    비견:0, 겁재:0, 식신:0, 상관:0, 정재:0, 편재:0, 정관:0, 편관:0, 정인:0, 편인:0,
  };

  function pickSubtype(el: Element, srcPol: YinYang) {
    const SHENG_PREV_LOCAL: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };
    const major: TenGod =
      el === dayEl ? "비겁" :
      SHENG_NEXT[dayEl] === el ? "식상" :
      SHENG_PREV_LOCAL[dayEl] === el ? "인성" :
      KE[dayEl] === el ? "재성" :
      KE[el] === dayEl ? "관성" : "비겁";
    const dayPol = stemPolarity(dayStem);
    const sub: TenGodSubtype = (() => {
      switch (major) {
        case "비겁": return srcPol === dayPol ? "비견" : "겁재";
        case "식상": return srcPol === dayPol ? "식신" : "상관";
        case "재성": return srcPol !== dayPol ? "정재" : "편재";
        case "관성": return srcPol !== dayPol ? "정관" : "편관";
        case "인성": return srcPol !== dayPol ? "정인" : "편인";
        default: return srcPol === dayPol ? "비견" : "겁재";
      }
    })();
    return { major, sub };
  }

  const addSub = (el: Element, pol: YinYang, val: number) => {
    const { sub } = pickSubtype(el, pol);
    subAcc[sub] = (subAcc[sub] ?? 0) + val;
  };

  // 원국 천간/지지/운(천간·지지) 소분류 누적
  stemParts.forEach(p => { if (p.el && p.pol && p.val) addSub(p.el, p.pol, p.val); });
  branchParts.forEach(parts => parts.forEach(p => addSub(p.el, p.pol, p.val)));
  luckSubs.forEach(p => addSub(p.el, p.pol, p.val));

  /* 6) 대분류 정규화 → totals */
  const order: TenGod[] = ["비겁","식상","재성","관성","인성"];
  const pct = normalizeTo100(order.map(k => tenAcc[k]));
  const colors = getTenGodColors(dayStem);
  const totals: PowerData[] = order.map((name, i) => ({
    name,
    value: Math.round(pct[i]!),   // 🔥 소수점 반올림
    color: colors[name],
  }));

  /* 7) 세부 원자료(perStemRaw) 구성:
        - 원국 천간 기여
        - 운의 천간 기여
        - 원국 지지 기여를 해당 오행의 두 천간(예: 금→경/신)에 균등 분배
        - 운의 지지 기여도 동일하게 균등 분배                                  */
  const perStemRaw: Record<string, number> = {};

  // 원국 천간
  stemParts.forEach(p => {
    if (p.stem && p.el && p.val) {
      const label = `${p.stem}${p.el}`; // 예: "경금"
      perStemRaw[label] = (perStemRaw[label] ?? 0) + p.val;
    }
  });
  // 운 천간
  luckSubs.forEach(p => {
    if (p.stem && p.el && p.val) {
      const label = `${p.stem}${p.el}`;
      perStemRaw[label] = (perStemRaw[label] ?? 0) + p.val;
    }
  });
  const BRANCH_MAIN_STEM: Record<string, string> = {
    자: "계", 축: "기", 인: "갑", 묘: "을", 진: "무",
    사: "병", 오: "정", 미: "기", 신: "경", 유: "신",
    술: "무", 해: "임",
  };

  branchParts.forEach((parts, idx) => {
    const gz = pillarsKo[idx]!;
    if (!gz || gz.length < 2) return;         // ← 추가
    const b = gzBranch(gz);
    const mainStem = BRANCH_MAIN_STEM[b];
    const mainEl = BRANCH_MAIN_ELEMENT[b];
    if (mainStem && mainEl) {
      const label = `${mainStem}${mainEl}`;
      const sum = parts.reduce((s, p) => s + p.val, 0);
      perStemRaw[label] = (perStemRaw[label] ?? 0) + sum;
    }
  });

  // 운 지지 반영
  luckSubs.forEach(p => {
    if (!p.stem && p.el && p.val) {
      const b = Object.keys(BRANCH_MAIN_ELEMENT).find(k => BRANCH_MAIN_ELEMENT[k] === p.el);
      if (b) {
        const mainStem = BRANCH_MAIN_STEM[b];
        if (mainStem) {
          const label = `${mainStem}${p.el}`;
          perStemRaw[label] = (perStemRaw[label] ?? 0) + p.val;
        }
      }
    }
  });

  // 십신별 대표 오행
  function elementOfGod(god: TenGod, dEl: Element): Element {
    switch (god) {
      case "비겁": return dEl;
      case "식상": return SHENG_NEXT[dEl];
      case "재성": return KE[dEl];
      case "관성": return KE_REV[dEl];
      case "인성": return SHENG_PREV[dEl];
    }
    return dEl;
  }
  // const lastCharElement = (label: string): Element | null => {
  //   const ch = label.slice(-1) as Element;
  //   if (ch === "목" || ch === "화" || ch === "토" || ch === "금" || ch === "수") return ch;
  //   return null;
  // };

  // perStemRaw → totals에 비례 스케일(소수 1자리, 합 일치)
  const STEM_LABELS = [
    "갑목","을목",
    "병화","정화",
    "무토","기토",
    "경금","신금",
    "임수","계수",
  ];

  const perStemElementScaled: Record<string, number> = {};

  STEM_LABELS.forEach(l => { perStemElementScaled[l] = 0; });

    order.forEach((god) => {
    const target = totals.find(t => t.name === god)?.value ?? 0;
    const majorEl = elementOfGod(god, dayEl);

    // majorEl과 같은 오행의 천간만 parts로 추출
    const parts = Object.entries(perStemRaw)
      .filter(([label]) => label.endsWith(majorEl));

    const sum = parts.reduce((s, [, v]) => s + v, 0);

    if (sum > 0) {
      parts.forEach(([label, v]) => {
        perStemElementScaled[label] = Math.round((target * (v / sum)) * 10) / 10;
      });
    } else {
      // parts가 비어 있으면 그냥 0 유지
      parts.forEach(([label]) => { perStemElementScaled[label] = 0; });
    }
  });

  /* 8) 소분류(십신)를 대분류 값으로 리스케일 */
  const perTenGod: Record<TenGod, { a: TenGodSubtype; b: TenGodSubtype; aVal: number; bVal: number }> = {
    비겁:{a:"비견",b:"겁재",aVal:subAcc.비견||0,bVal:subAcc.겁재||0},
    식상:{a:"식신",b:"상관",aVal:subAcc.식신||0,bVal:subAcc.상관||0},
    재성:{a:"정재",b:"편재",aVal:subAcc.정재||0,bVal:subAcc.편재||0},
    관성:{a:"정관",b:"편관",aVal:subAcc.정관||0,bVal:subAcc.편관||0},
    인성:{a:"정인",b:"편인",aVal:subAcc.정인||0,bVal:subAcc.편인||0},
  };
  for (const name of order) {
    const target = totals.find(t => t.name === name)!.value;
    const p = perTenGod[name]!;
    const sum = (p.aVal || 0) + (p.bVal || 0);
    if (sum > 0) {
      const a = Math.round((target * p.aVal) / sum);
      const b = target - a;
      p.aVal = a; p.bVal = b;
    } else {
      p.aVal = Math.round(target / 2);
      p.bVal = target - p.aVal;
    }
  }

  // 득령/득지/득세
  const { flags: deukFlags } = computeDeukFlags(pillarsKo, elementScore);

  if (debug) {
    console.log("[PowerData]", {
      criteriaMode, hiddenMode,
      elementScore, totals, perTenGod,
      perStemRaw, perStemElementScaled,
      deukFlags, luck,
    });
  }

  // 최종 반환: perStemElement는 perStemRaw 전체(원자료)로 노출
  return {
    totals,
    perTenGod,
    elementScoreRaw: elementScore,
    deukFlags,
    perStemElement: perStemRaw,
    perStemElementScaled,
  };
}
