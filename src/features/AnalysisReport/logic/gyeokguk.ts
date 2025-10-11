// features/AnalysisReport/logic/gyeokguk.ts
// 격국(內格/外格) 판정 엔진 — 원국과 대응

import { getSolarTermBoundaries } from "@/features/myoun";
import { hiddenStemMappingHGC, hiddenStemMappingClassic } from "@/shared/domain/hidden-stem/const";
//import { getTwelveUnseong } from "@/shared/domain/간지/twelve";
import { UnifiedPowerResult } from "@/features/AnalysisReport/utils/unifiedPower";

export type Element = "목" | "화" | "토" | "금" | "수";

export interface GyeokgukInner {
  월령: string;       // 월지 정기
  사령: string;       // 월률·절입·삼합 반영
  진신: string;       // = 사령
  가신: string;       // 진신을 극 + 음양 동일 천간
  내격: string;       // 십신격 (비견/겁재 제외)
  외격: string[];     // 특수/잡격들(다중)
  reason: string[];   // 판정 사유 로그
}

const STEM_TO_ELEMENT: Record<string, Element> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
};
const BRANCH_MAIN_ELEMENT: Record<string, Element> = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
  오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};

const BRANCH_MAIN_STEM: Record<string, string> = {
  자: "계", 축: "기", 인: "갑", 묘: "을", 진: "무", 사: "병",
  오: "정", 미: "기", 신: "경", 유: "신", 술: "무", 해: "임",
  子: "계", 丑: "기", 寅: "갑", 卯: "을", 辰: "무", 巳: "병",
  午: "정", 未: "기", 申: "경", 酉: "신", 戌: "무", 亥: "임",
};

/** 천간 → 양/음 여부 */
function isYangStem(stem: string): boolean {
  return ["갑", "병", "무", "경", "임"].includes(stem);
}

function BRANCH_IS_YANG(branch: string): boolean {
  return ["자", "인", "진", "오", "신", "술"].includes(branch);
}

const SHENG_NEXT: Record<Element, Element> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const KE: Record<Element, Element> = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
const KE_REV: Record<Element, Element> = { 토: "목", 금: "화", 수: "토", 목: "금", 화: "수" };
const SHENG_PREV: Record<Element, Element> = { 화: "목", 토: "화", 금: "토", 수: "금", 목: "수" };

const normStemKo = (s: string) => {
  const m: Record<string, string> = { 甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무", 己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계" };
  return m[s] ?? s;
};
const stemOf = (gz?: string) => (gz && gz.length >= 1 ? gz.charAt(0) : "");
const branchOf = (gz?: string) => (gz && gz.length >= 2 ? gz.charAt(1) : "");
const uniq = <T,>(arr: T[]) => Array.from(new Set(arr));

const DIST_MAP: Record<
  string,
  { 초기?: { stem: string; w: number }; 중기?: { stem: string; w: number }; 정기: { stem: string; w: number } }
> = {
  자: { 초기: { stem: "임", w: 10 }, 정기: { stem: "계", w: 20 } },
  축: { 초기: { stem: "계", w: 9 }, 중기: { stem: "신", w: 3 }, 정기: { stem: "기", w: 18 } },
  인: { 초기: { stem: "갑", w: 10 }, 중기: { stem: "병", w: 7 }, 정기: { stem: "갑", w: 16 } },
  묘: { 초기: { stem: "을", w: 9 }, 정기: { stem: "을", w: 20 } },
  진: { 초기: { stem: "무", w: 7 }, 중기: { stem: "계", w: 3 }, 정기: { stem: "무", w: 18 } },
  사: { 초기: { stem: "병", w: 10 }, 중기: { stem: "경", w: 7 }, 정기: { stem: "병", w: 16 } },
  오: { 초기: { stem: "정", w: 10 }, 중기: { stem: "기", w: 9 }, 정기: { stem: "정", w: 11 } },
  미: { 초기: { stem: "기", w: 9 }, 중기: { stem: "을", w: 3 }, 정기: { stem: "기", w: 18 } },
  신: { 초기: { stem: "경", w: 10 }, 중기: { stem: "임", w: 7 }, 정기: { stem: "경", w: 16 } },
  유: { 초기: { stem: "신", w: 9 }, 정기: { stem: "신", w: 20 } },
  술: { 초기: { stem: "무", w: 7 }, 중기: { stem: "정", w: 3 }, 정기: { stem: "무", w: 18 } },
  해: { 초기: { stem: "임", w: 16 }, 중기: { stem: "갑", w: 7 }, 정기: { stem: "임", w: 16 } },
};

const BRANCH_TO_TERM: Record<string, string> = {
  인: "입춘", 묘: "경칩", 진: "청명", 사: "입하", 오: "망종", 미: "소서",
  신: "입추", 유: "백로", 술: "한로", 해: "입동", 자: "대설", 축: "소한",
};

function isWithinEarlyPhase(branch: string, date: Date): boolean {
  const jieName = BRANCH_TO_TERM[branch];
  if (!jieName) return false;
  const list = getSolarTermBoundaries(date);
  const jie = list.find((s) => s.name === jieName);
  if (!jie) return false;
  const start = new Date(jie.date);
  const diffDays = Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays <= 12;
}

const SAMHAP_SETS: Record<string, string[]> = {
  진: ["신", "자", "진"], // 수국
  술: ["인", "오", "술"], // 화국
  축: ["사", "유", "축"], // 금국
  미: ["해", "묘", "미"], // 목국
};
function hasSamHapWithMonth(monthBranch: string, otherBranches: string[]): boolean {
  const set = SAMHAP_SETS[monthBranch];
  if (!set) return false;
  return set.filter((b) => b !== monthBranch).every((b) => otherBranches.includes(b));
}

function mapStemToTenGodSub(dayStem: string, targetStem: string):
  | "비견" | "겁재" | "식신" | "상관" | "정재" | "편재" | "정관" | "편관" | "정인" | "편인" {
  const d = STEM_TO_ELEMENT[dayStem], t = STEM_TO_ELEMENT[targetStem];
  if (!d || !t) return "비견";
  let kind: "비견" | "식신" | "편재" | "편관" | "편인";
  if (t === d) kind = "비견";
  else if (t === SHENG_NEXT[d]) kind = "식신";
  else if (t === KE[d]) kind = "편재";
  else if (t === KE_REV[d]) kind = "편관";
  else if (t === SHENG_PREV[d]) kind = "편인";
  else kind = "비견";
  const same = isYangStem(dayStem) === isYangStem(targetStem);
  switch (kind) {
    case "비견": return same ? "비견" : "겁재";
    case "식신": return same ? "식신" : "상관";
    case "편재": return same ? "편재" : "정재";
    case "편관": return same ? "편관" : "정관";
    case "편인": return same ? "편인" : "정인";
  }
}

function mapBranchToTenGodSub(dayStem: string, branch: string):
  | "비견" | "겁재" | "식신" | "상관" | "정재" | "편재" | "정관" | "편관" | "정인" | "편인" {

  const d = STEM_TO_ELEMENT[dayStem];      // ✅ 천간 → 오행
  const t = BRANCH_MAIN_ELEMENT[branch];    // ✅ 지지 → 오행

  if (!d || !t) return "비견";

  // 기본 오행 관계
  let kind: "비견" | "식신" | "편재" | "편관" | "편인";
  if (t === d) kind = "비견";
  else if (t === SHENG_NEXT[d]) kind = "식신";
  else if (t === KE[d]) kind = "편재";
  else if (t === KE_REV[d]) kind = "편관";
  else if (t === SHENG_PREV[d]) kind = "편인";
  else kind = "비견";

  const samePolarity = isYangStem(dayStem) === BRANCH_IS_YANG(branch); // ✅ 천간/지지 음양비교

  switch (kind) {
    case "비견": return samePolarity ? "비견" : "겁재";
    case "식신": return samePolarity ? "식신" : "상관";
    case "편재": return samePolarity ? "편재" : "정재";
    case "편관": return samePolarity ? "편관" : "정관";
    case "편인": return samePolarity ? "편인" : "정인";
  }
}

/*function mapBranchToElement(branch: string): Element {
  const branchElementMap: Record<string, Element> = {
    자: "수",
    축: "토",
    인: "목",
    묘: "목",
    진: "토",
    사: "화",
    오: "화",
    미: "토",
    신: "금",
    유: "금",
    술: "토",
    해: "수",
  };
  return branchElementMap[branch] ?? "토"; // 기본값 안전장치
}*/

function mapStemToElement(stem: string): Element {
  const stemElementMap: Record<string, Element> = {
    갑: "목",
    을: "목",
    병: "화",
    정: "화",
    무: "토",
    기: "토",
    경: "금",
    신: "금",
    임: "수",
    계: "수",
  };
  return stemElementMap[stem] ?? "토";
}

type TenGodSubtype =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

export type TwelveUnseong =
  | "장생" | "목욕" | "관대" | "건록" | "제왕"
  | "쇠" | "병" | "사" | "묘" | "절" | "태" | "양";

export type TenGodOrUnseong = TenGodSubtype | TwelveUnseong;

/** 일간 기준으로 오행을 십신으로 변환 */
function elementToTenGod(dayStem: string, targetEl: Element): TenGodSubtype {
  const dayEl = mapStemToElement(dayStem);
  const dayYang = isYangStem(dayStem);

  // 상생·상극 관계 정의
  const cycle: Record<Element, Element> = {
    목: "화", // 목생화
    화: "토",
    토: "금",
    금: "수",
    수: "목",
  };
  const control: Record<Element, Element> = {
    목: "토", // 목극토
    화: "금",
    토: "수",
    금: "목",
    수: "화",
  };

  // 관계 판별
  let relation: "비겁" | "식상" | "재성" | "관성" | "인성";
  if (targetEl === dayEl) relation = "비겁";
  else if (cycle[dayEl] === targetEl) relation = "식상";
  else if (cycle[targetEl] === dayEl) relation = "인성";
  else if (control[dayEl] === targetEl) relation = "재성";
  else if (control[targetEl] === dayEl) relation = "관성";
  else relation = "비겁"; // fallback

  // 음양 일치 여부로 편/정 구분
  const sameYang = dayYang === isYangStem(elementToStem(targetEl));

  switch (relation) {
    case "비겁": return sameYang ? "비견" : "겁재";
    case "식상": return sameYang ? "식신" : "상관";
    case "재성": return sameYang ? "정재" : "편재";
    case "관성": return sameYang ? "정관" : "편관";
    case "인성": return sameYang ? "정인" : "편인";
  }
}

/** 오행 → 대표 천간 (양 기준으로 매핑) */
function elementToStem(el: Element): string {
  const map: Record<Element, string> = {
    목: "갑",
    화: "병",
    토: "무",
    금: "경",
    수: "임",
  };
  return map[el];
}

/* =========================
 * 외격 탐지 (특수격 다중 수집)
 * ========================= */
// ▼▼▼ 이 블록만 갈아끼우면 됩니다 ▼▼▼

const LOK_BRANCH: Record<string, string> = {
  갑: "인", 을: "묘", 병: "사", 정: "오", 무: "오", 기: "사", 경: "신", 신: "유", 임: "해", 계: "자",
};

// 월지 양인 / 월지겁재 (월지-일간 관계 전용 맵)
const YANGIN_MAP: Record<string, string> = { 갑: "묘", 병: "오", 무: "오", 경: "유", 임: "자" };
const WOLGEOP_MAP: Record<string, string> = { 을: "인", 정: "사", 신: "신", 계: "해" };

// 간합(화기)쌍
const STEM_COMB_PAIRS: Array<{ a: string; b: string; to: Element }> = [
  { a: "갑", b: "기", to: "토" },
  { a: "을", b: "경", to: "금" },
  { a: "병", b: "신", to: "수" },
  { a: "정", b: "임", to: "목" },
  { a: "무", b: "계", to: "화" },
];

// 원소 강도 러프 추정(천간10 + 지지본기6)
const roughElementStrength = (pillars: string[]) => {
  const el: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  for (const gz of pillars) {
    const s = stemOf(gz);
    const b = branchOf(gz);
    const se = STEM_TO_ELEMENT[s as keyof typeof STEM_TO_ELEMENT];
    const be = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
    if (se) el[se] += 10;
    if (be) el[be] += 6;
  }
  return el;
};

function detectOuterGyeok(opts: {
  pillars: [string,string,string,string];
  dayStem: string;
  monthBranch: string;
  emittedStems: string[];
  mapping?: string;
}) {
  const { pillars, dayStem, monthBranch, mapping } = opts;
  const [yGZ, mGZ, dGZ, hGZ] = (pillars ?? []).slice(0, 4);

  const stems    = [stemOf(yGZ), stemOf(mGZ), stemOf(dGZ), stemOf(hGZ)].filter(Boolean);
  const branches = [branchOf(yGZ), branchOf(mGZ), branchOf(dGZ), branchOf(hGZ)].filter(Boolean);
  const dEl = STEM_TO_ELEMENT[dayStem];
  const subs = stems.map((s)=> mapStemToTenGodSub(dayStem, s));

  const out: string[] = [];

  // ─────────────────────────────────────────────────────
  // 헬퍼들
  // ─────────────────────────────────────────────────────
  const cntStem = (ch: string) => stems.filter(s => s === ch).length;
  const cntBr   = (br: string) => branches.filter(b => b === br).length;
  const hasAll  = (need: string[]) => need.every((b)=> branches.includes(b));
  //const hasAny  = (cands: string[]) => cands.some((b)=> branches.includes(b));
  const hasSub  = (labels: string[]) => subs.some(x => labels.includes(x));
  const monthStem = stemOf(mGZ);

  const isYang  = (s: string) => isYangStem(s);
  const sameElementAllStems = () => {
    const els = stems.map(s => STEM_TO_ELEMENT[s]);
    return els.length === 4 && els.every(e => e === els[0]);
  };
  const parityPatternAlt = () => {
    if (stems.length !== 4) return false;
    const ps = stems.map(isYang); // true=양, false=음
    const p1 = (ps[0] && !ps[1] &&  ps[2] && !ps[3]); // 양음양음
    const p2 = (!ps[0] && ps[1] && !ps[2] && ps[3]); // 음양음양
    return p1 || p2;
  };

  // ─────────────────────────────────────────────────────
  // 1) 양인/월지겁재/건록(전록/귀록)
  // ─────────────────────────────────────────────────────
  if (isYangStem(dayStem) && YANGIN_MAP[dayStem] === monthBranch) {
    out.push("양인격");
  }

  const GEONLOK_SET: Array<[string, string]> = [
    ["을", "묘"], ["병", "사"], ["정", "오"], ["경", "신"], ["임", "해"], ["계", "자"],
    ["무", "사"], ["기", "오"],
  ];
  for (const [stem, branch] of GEONLOK_SET) {
    if (dayStem === stem && monthBranch === branch) { out.push("건록격"); break; }
  }

  if (!isYangStem(dayStem) && WOLGEOP_MAP[dayStem] === monthBranch) {
    out.push("월지겁재격");
  }

  const dayLok = LOK_BRANCH[dayStem];
  if (dayLok && branchOf(dGZ) === dayLok && dEl === BRANCH_MAIN_ELEMENT[branchOf(dGZ)]) {
    out.push("전록격");
  }
  if (dayLok && branchOf(hGZ) === dayLok && dEl === BRANCH_MAIN_ELEMENT[branchOf(hGZ)]) {
    out.push("귀록격");
  }

  // ─────────────────────────────────────────────────────
  // 2) 원국 강도 기초(간10/지지본기6)
  // ─────────────────────────────────────────────────────
  const stemsOnly  = [yGZ, mGZ, dGZ, hGZ].map(firstChar);
  const branchOnly = [yGZ, mGZ, dGZ, hGZ].map(secondChar);
  const elCount: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };

  for (const s of stemsOnly) {
    if (!s) continue;
    const e = STEM_TO_ELEMENT[s as keyof typeof STEM_TO_ELEMENT];
    if (e) elCount[e] += 10;
  }

  const hiddenMainStems: string[] = [];
  for (const b of branchOnly) {
    if (!b) continue;
    const mainStem = BRANCH_MAIN_STEM[b as keyof typeof BRANCH_MAIN_STEM];
    if (mainStem) hiddenMainStems.push(mainStem);
    const e = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
    if (e) elCount[e] += 6;
  }

  const HIDDEN_MAP = (mapping === "hgc"
    ? hiddenStemMappingHGC
    : hiddenStemMappingClassic) as typeof hiddenStemMappingClassic;

  function getHiddenStems(branch: string): string[] {
    return (HIDDEN_MAP[branch] ?? []).filter(h => ["갑","을","병","정","무","기","경","신","임","계"].includes(h));
  }

  const validGZ = [yGZ, mGZ, dGZ, hGZ].filter(Boolean) as string[];
  const allPillars = validGZ.flatMap(gz => [gz.charAt(0), gz.charAt(1)]);

  // 십신 플랫(간+지지표면+지장간 전체) — 존재성 판단용
  const tenGodList: TenGodSubtype[] = allPillars.flatMap(item => {
    try {
      if (["갑","을","병","정","무","기","경","신","임","계"].includes(item)) {
        return [mapStemToTenGodSub(dayStem, item)];
      }
      if (["자","축","인","묘","진","사","오","미","신","유","술","해"].includes(item)) {
        const tgBranch = mapBranchToTenGodSub(dayStem, item);
        const hidden = getHiddenStems(item).map(h => mapStemToTenGodSub(dayStem, h));
        return [tgBranch, ...hidden];
      }
      return [];
    } catch { return []; }
  });

  const hasType = (target: TenGodSubtype[]) => tenGodList.some(tg => target.includes(tg));

  // 인접/흐름(지장간 배제: 간 + 지지표면만)
  const hasAdjacency = (groupA: TenGodSubtype[], groupB: TenGodSubtype[]) => {
    const stemSeq: TenGodSubtype[] = [];
    const branchSeq: (TenGodSubtype | null)[] = [];

    // 각 기둥을 [간TG], [지지표면TG]로 분리
    for (const gz of validGZ) {
      const gan = gz.charAt(0);
      const ji  = gz.charAt(1);

      // 천간 → 십신
      stemSeq.push(mapStemToTenGodSub(dayStem, gan));

      // 지지 '표면(본기 오행)' → 십신 (지장간 배제)
      const mainEl = BRANCH_MAIN_ELEMENT[ji as keyof typeof BRANCH_MAIN_ELEMENT];
      if (!mainEl) {
        branchSeq.push(null);
      } else {
        branchSeq.push(elementToTenGod(dayStem, mainEl));
      }
    }

    const pairOK = (a?: TenGodSubtype | null, b?: TenGodSubtype | null) =>
      !!a && !!b && ((groupA.includes(a) && groupB.includes(b)) || (groupB.includes(a) && groupA.includes(b)));

    // 1) 같은 기둥 수직 인접: 간 ↔ 지지표면
    for (let i = 0; i < stemSeq.length; i++) {
      if (pairOK(stemSeq[i], branchSeq[i])) return true;
    }

    // 2) 수평 인접(같은 행): 간 ↔ 다음 간, 지지표면 ↔ 다음 지지표면
    for (let i = 0; i < stemSeq.length - 1; i++) {
      if (pairOK(stemSeq[i], stemSeq[i + 1])) return true;           // 간-간
      if (pairOK(branchSeq[i], branchSeq[i + 1])) return true;       // 지지표면-지지표면
    }

    // ❌ 대각선 금지: (지지표면[i] ↔ 간[i+1]) 또는 (간[i] ↔ 지지표면[i+1])는 검사하지 않음
    return false;
  };

  // 십신 그룹
  const groupMap = {
    식상: ["식신", "상관"] as const,
    재성: ["편재", "정재"] as const,
    관성: ["편관", "정관"] as const,
    인성: ["편인", "정인"] as const,
    비겁: ["비견", "겁재"] as const,
  };

  // 관인상생격
  if (hasType([...groupMap.관성]) && hasType([...groupMap.인성]) && hasAdjacency([...groupMap.관성], [...groupMap.인성])) {
    out.push("관인상생격");
  }

  // 식상생재격
  if (hasType([...groupMap.식상]) && hasType([...groupMap.재성]) && hasAdjacency([...groupMap.식상], [...groupMap.재성])) {
    out.push("식상생재격");
  }

  // 식상제살/상관패인/칠살/살인상생
  const cnt = (labels: string[]) => subs.filter((x)=> labels.includes(x)).length;
  const nSiksang = cnt(["식신","상관"]);
  const nCheolsal = cnt(["편관"]);
  const nJeonggwan = cnt(["정관"]);
  const nInseong = cnt(["정인","편인"]);
  const nJae = cnt(["정재","편재"]);
  const nGwan = cnt(["정관","편관"]);

  if (nCheolsal>=1 && nSiksang>=1 && nSiksang >= nCheolsal && nJeonggwan <= nCheolsal) out.push("식상제살격");
  const nSanggan = cnt(["상관"]);
  if (nSanggan>=1 && nInseong>=1 && nSanggan >= nInseong) out.push("상관패인격");
  const hasCheolsal = subs.includes("편관");
  if (hasCheolsal && nInseong>=1) out.push("살인상생격");

  // 전왕/종격
  const str = roughElementStrength(pillars);
  const sortedEl = Object.entries(str).sort((a,b)=>b[1]-a[1]);
  const top = sortedEl[0];
  if (top && top[1] >= 60) out.push(`전왕격(${top[0]})`);
  if (sortedEl.length >= 2) {
    const [firstEl, firstVal] = sortedEl[0];
    const [, secondVal] = sortedEl[1];
    if (firstVal >= 75 && firstVal - secondVal >= 12 && dEl !== firstEl) out.push(`종격(${firstEl})`);
  }

  // 간합 화기(가화/진화/화기)
  for (const p of STEM_COMB_PAIRS) {
    const hasA = stems.includes(p.a);
    const hasB = stems.includes(p.b);
    if (!hasA || !hasB) continue;

    const toEl = p.to;
    const toStr = (str[toEl] ?? 0);

    const aEl = STEM_TO_ELEMENT[p.a];
    const bEl = STEM_TO_ELEMENT[p.b];
    const origMax = Math.max(str[aEl] ?? 0, str[bEl] ?? 0);

    const seasonFav = BRANCH_MAIN_ELEMENT[monthBranch] === toEl;
    const sortedForTop = Object.entries(str).sort((x, y) => y[1] - x[1]);
    const isTop = sortedForTop[0]?.[0] === toEl;

    let tagged = false;
    if (toStr >= 60 && (seasonFav || isTop) && origMax <= 20 && (toStr - origMax >= 20)) {
      out.push(`화기격(${toEl})`); tagged = true;
    }
    if (!tagged && toStr >= 50 && (seasonFav || isTop) && origMax <= 25) {
      out.push(`진화격(${toEl})`); tagged = true;
    }
    if (!tagged && toStr >= 35) {
      out.push(`가화격(${toEl})`);
    }
  }

  // 금신/시묘/록마/비천록마
  const hPair = `${stemOf(hGZ)}${branchOf(hGZ)}`;
  if (["갑","기"].includes(dayStem) && ["기사","계유","을축"].includes(hPair)) out.push("금신격");
  if (["진","술","축","미"].includes(branchOf(hGZ))) out.push("시묘격");
  if (["병","정"].includes(dayStem) && (branchOf(dGZ)==="오" || branchOf(mGZ)==="오") && !branches.includes("자")) out.push("도충록마격");
  const hasFireStem = stems.some((s) => s==="병" || s==="정");
  const hasFireBranch = branches.some((b) => b==="사" || b==="오");
  if (["자","해"].includes(branchOf(dGZ)) && !hasFireStem && !hasFireBranch) out.push("비천록마격");

  // 삼기/삼상/재관쌍미
  if (["갑","무","경"].every((s)=> stems.includes(s))) out.push("천상삼기격");
  if (["임","계","신"].every((s)=> stems.includes(s))) out.push("인중삼기격");
  if (["을","병","정"].every((s)=> stems.includes(s))) out.push("지하삼기격");
  const topVals = Object.values(str).sort((a,b)=>b-a);
  if (topVals.length>=3 && topVals[0]-topVals[2] <= 8 && (topVals[0]+topVals[1]+topVals[2] >= 80)) out.push("삼상격");
  if (nJae>=1 && nGwan>=1 && Math.abs(nJae - nGwan) <= 1) out.push("재관쌍미격");

  // 지지세트/동체/일기류
  if (hasAll(["진","술","축","미"])) out.push("사고격");
  if (hasAll(["인","신","사","해"])) out.push("사생격");
  if (hasAll(["자","오","묘","유"])) out.push("사정격");

  if (branches.length===4 && branches.every((b)=> b === branches[0])) out.push("지지원일기격");
  // 🔧 양간부잡격(수정): 천간 ‘동일 오행’ + 양음양음/음양음양 패턴
  if (stems.length===4 && sameElementAllStems() && parityPatternAlt()) {
    out.push("양간부잡격");
  }

  // 봉황지격: 4주 간지 모두 동일
  if (pillars.every((gz)=> gz && gz === pillars[0])) out.push("봉황지격");

  // 간지동체격: 4주 모두 동일 간 + 동일 지 (사실상 봉황지격과 동격이지만 별도 표기 유지)
  if (stems.length===4 && stems.every((s)=> s===stems[0]) &&
      branches.length===4 && branches.every((b)=> b===branches[0])) {
    out.push("간지동체격");
  }

  // 전식록: 식상 + 일지/시지 건록
  const hasSiksang = nSiksang>=1;
  if (hasSiksang && (branchOf(dGZ)===LOK_BRANCH[dayStem] || branchOf(hGZ)===LOK_BRANCH[dayStem])) {
    out.push("전식록격");
  }

  // ─────────────────────────────────────────────────────
  // ★ 추가 격들
  // ─────────────────────────────────────────────────────

  // ① 복덕수기격: 천간 을 3개 이상 + 사유축 금국(세 지지 모두) + (사/유/축 중 하나는 반드시 일지)
  if (cntStem("을") >= 3 && hasAll(["사","유","축"]) && ["사","유","축"].includes(branchOf(dGZ))) {
    out.push("복덕수기격");
  }

  // ② 구진득위격: 일간 무/기(토) + (해묘미 방합 or 인묘진 삼합 = 목국) or (해자축/신자진 = 수국)
  const isToDay = (dayStem === "무" || dayStem === "기");
  const woodSets = [ ["해","묘","미"], ["인","묘","진"] ];
  const waterSets = [ ["해","자","축"], ["신","자","진"] ];
  if (isToDay && (woodSets.some(set => hasAll(set)) || waterSets.some(set => hasAll(set)))) {
    out.push("구진득위격");
  }

  // ③ 육갑추건격: 일주 ∈ {갑자,갑인,갑진,갑오,갑신,갑술} + 해 2개↑
  //   단, 원국에 관살(정/편관) 있거나, 사(巳) 있거나, 인(寅) 있거나, 재성(정/편재) 있으면 성립 어렵다 → 제외 처리
  const SIX_GAP = new Set(["갑자","갑인","갑진","갑오","갑신","갑술"]);
  const dPair = `${stemOf(dGZ)}${branchOf(dGZ)}`;
  if (SIX_GAP.has(dPair) && cntBr("해") >= 2) {
    const disq = hasSub(["정관","편관"]) || branches.includes("사") || branches.includes("인") || hasSub(["정재","편재"]);
    if (!disq) out.push("육갑추건격");
  }

  // ④ 육임추간격(합록격): 일주 ∈ {임자,임인,임진,임오,임신,임술} + 인(寅) 다수(≥2) + 해(亥) 존재(인해합)
  const SIX_IM = new Set(["임자","임인","임진","임오","임신","임술"]);
  if (SIX_IM.has(dPair) && cntBr("인") >= 2 && branches.includes("해")) {
    out.push("육임추간격");
  }

  // ⑤ 육을서귀격: 을일주 + 병자시, (재성 必), 월지에 재/관 없어야, 자-오 충 회피(오 불가), 인목 회피
  if (dayStem === "을" && `${stemOf(hGZ)}${branchOf(hGZ)}` === "병자") {
    const monthSub = mapStemToTenGodSub(dayStem, monthStem);
    const monthHasJaeOrGwan = ["정재","편재","정관","편관"].includes(monthSub as string);
    if (!monthHasJaeOrGwan && hasSub(["정재","편재"]) && !branches.includes("오") && !branches.includes("인")) {
      out.push("육을서귀격");
    }
  }

  // ⑥ 육음조양격: 일주 ∈ {신해,신축,신유} + 무자시, 자-오 충 회피, 원국에 관성 없을 것(엄격)
  const SIX_YIN_SET = new Set(["신해","신축","신유"]);
  if (SIX_YIN_SET.has(dPair) && `${stemOf(hGZ)}${branchOf(hGZ)}` === "무자" && !branches.includes("오") && !hasSub(["정관","편관"])) {
    out.push("육음조양격");
  }

  // ⑦ 임기용배격: 임진 일주 + (진/인 합계) ≥ 2
  if (dPair === "임진" && (cntBr("진") + cntBr("인")) >= 2) {
    out.push("임기용배격");
  }

  // ⑧ 축요사격: 계축/신축 일주 + 축 다수(≥2) + 원국에 관성 전무 + 자수 없음
  if ((dPair === "계축" || dPair === "신축") && cntBr("축") >= 2 && !hasSub(["정관","편관"]) && !branches.includes("자")) {
    out.push("축요사격");
  }

  // ⑨ 정란차격: 경금 일주 + 지지 신자진 삼합(수국)
  if (dayStem === "경" && hasAll(["신","자","진"])) {
    out.push("정란차격");
  }

  // ⑩ 자요사격: 갑자 일주 + 갑자시
  if (dPair === "갑자" && `${stemOf(hGZ)}${branchOf(hGZ)}` === "갑자") {
    out.push("자요사격");
  }

  return uniq(out);
}


// ▲▲▲ 이 블록만 갈아끼우면 됩니다 ▲▲▲


/* =========================
 * 공개 엔진: 내격 + 외격
 * ========================= */
export function computeNaegyeok(params: {
  dayStem: string;
  monthBranch: string;
  date: Date;
  pillars: [string, string, string, string];  // 원국 전체 (연월일시)
  emittedStems?: string[];                    // 연/월/일/시 천간
  otherBranches?: string[];                   // 월 제외 연/일/시 지지
  isNeutralized?: (stemKo: string) => boolean;
  mapping?: string;
}): GyeokgukInner {
  const { dayStem, monthBranch, date, pillars, emittedStems = [], otherBranches = [], isNeutralized, mapping } = params;
  const rsn: string[] = [];

  const dist0 = DIST_MAP[monthBranch];
  if (!dist0) return { 월령: "-", 사령: "-", 진신: "-", 가신: "-", 내격: "-", 외격: [], reason: ["월지 분포표 없음"] };
  const dist = {
    초기: dist0.초기 ? { stem: normStemKo(dist0.초기.stem), w: dist0.초기.w } : undefined,
    중기: dist0.중기 ? { stem: normStemKo(dist0.중기.stem), w: dist0.중기.w } : undefined,
    정기: { stem: normStemKo(dist0.정기.stem), w: dist0.정기.w },
  };

  const wolryeong = dist.정기.stem;
  let saryeong = wolryeong;

  // 1) 왕지: 자오묘유 → 정기 고정
  if (["자", "오", "묘", "유"].includes(monthBranch)) {
    saryeong = dist.정기.stem;
    rsn.push("왕지: 정기 그대로 채택");
  }
  // 2) 생지: 투출 우선, 동시 투출이면 가중치 큰 것, 미투출이면 정기
  else if (["인", "신", "사", "해"].includes(monthBranch)) {
    const cand: { from: "초기" | "중기" | "정기"; stem: string; w: number; emitted: boolean }[] = [];
    if (dist.초기) cand.push({ from: "초기", stem: dist.초기.stem, w: dist.초기.w, emitted: emittedStems.includes(dist.초기.stem) });
    if (dist.중기) cand.push({ from: "중기", stem: dist.중기.stem, w: dist.중기.w, emitted: emittedStems.includes(dist.중기.stem) });
    cand.push({ from: "정기", stem: dist.정기.stem, w: dist.정기.w, emitted: emittedStems.includes(dist.정기.stem) });

    const emittedOnly = cand.filter((c) => c.emitted);
    if (emittedOnly.length === 1) {
      saryeong = emittedOnly[0].stem;
      rsn.push(`생지: ${emittedOnly[0].from} 투출 채택`);
    } else if (emittedOnly.length > 1) {
      emittedOnly.sort((a, b) => b.w - a.w);
      saryeong = emittedOnly[0].stem;
      rsn.push(`생지: 동시 투출 → 가중치 큰 ${emittedOnly[0].from} 채택`);
    } else {
      saryeong = dist.정기.stem;
      rsn.push("생지: 미투출 → 정기 채택");
    }
  }
  // 3) 고지: 삼합 성립 시 중기, 아니면 절입+12 이내 여기, 이후 정기
  else if (["진", "술", "축", "미"].includes(monthBranch)) {
    if (hasSamHapWithMonth(monthBranch, otherBranches) && dist.중기) {
      saryeong = dist.중기.stem;
      rsn.push("고지: 삼합 성립 → 중기 채택");
    } else if (isWithinEarlyPhase(monthBranch, date) && dist.초기) {
      saryeong = dist.초기.stem;
      rsn.push("고지: 절입 +12일 이내 → 여기 채택");
    } else {
      saryeong = dist.정기.stem;
      rsn.push("고지: 절입 +12일 이후 → 정기 채택");
    }
  }

  const jinshin = saryeong;

  // 가신: 진신을 극하면서 음양 동일
  let gasin = "";
  const jinEl = STEM_TO_ELEMENT[jinshin];
  if (jinEl) {
    const needEl = (Object.entries(KE).find(([, v]) => v === jinEl)?.[0] ?? null) as Element | null;
    if (needEl) {
      const pick = Object.entries(STEM_TO_ELEMENT).find(([s, e]) => e === needEl && isYangStem(s) === isYangStem(jinshin));
      gasin = pick?.[0] ?? "";
    }
  }

  if (isNeutralized?.(jinshin)) rsn.push("예외: 격 후보가 합/충으로 무력화");

  // 내격: 비견/겁재 제외
  let naegyeok = "-";
const sub = mapStemToTenGodSub(dayStem, jinshin);

// ① 건록팔자 목록 (일간-월지)
const GEONLOK_SET: Array<[string, string]> = [
  ["을", "묘"], ["병", "사"], ["정", "오"], ["경", "신"],
  ["임", "해"], ["계", "자"], ["무", "사"], ["기", "오"],
];

// ② 비견/겁재 예외 허용 조건
const isGeonlok = GEONLOK_SET.some(([s,b]) => s === dayStem && b === monthBranch);
const isYangin = isYangStem(dayStem) && YANGIN_MAP[dayStem] === monthBranch;
const isWolgeop = !isYangStem(dayStem) && WOLGEOP_MAP[dayStem] === monthBranch;

if (sub === "비견" || sub === "겁재") {
  if (isGeonlok) {
    naegyeok = "건록격";
    rsn.push("예외: 비견/겁재지만 건록팔자 → 건록격");
  } else if (isYangin) {
    naegyeok = "양인격";
    rsn.push("예외: 비견이지만 양인격 조건 충족");
  } else if (isWolgeop) {
    naegyeok = "월지겁재격";
    rsn.push("예외: 겁재지만 월지겁재격 조건 충족");
  } else {
    rsn.push("예외: 비견/겁재는 내격에서 제외됨");
  }
} else if (sub === "편관") {
  naegyeok = "편관격(칠살격)";
} else {
  const nameMap: Record<string, string> = {
    식신: "식신격", 상관: "상관격",
    정재: "정재격", 편재: "편재격",
    정관: "정관격", 편관: "편관격",
    정인: "정인격", 편인: "편인격",
  };
  naegyeok = nameMap[sub] ?? "-";
}

  // 외격(특수격) 수집
  const outer = detectOuterGyeok({ pillars, dayStem, monthBranch, emittedStems, mapping });

  return { 월령: wolryeong, 사령: saryeong, 진신: jinshin, 가신: gasin, 내격: naegyeok, 외격: outer, reason: rsn };
}

// ================== 오행 물상 ===================== //

type StemKo = "갑"|"을"|"병"|"정"|"무"|"기"|"경"|"신"|"임"|"계";

// 조합 키 빌더 (순서 보존)
const pairKey = (a: StemKo, b: StemKo) => `${a}+${b}` as const;
const triKey  = (a: StemKo, b: StemKo, c: StemKo) => `${a}+${b}+${c}` as const;

// ===== 1) 2간(쌍) 태그 사전 =====
// (출력 다중 가능할 땐 배열 – 요청대로 "조합만" 표기, 설명 없음)
const MULSANG_PAIR_TAGS: Record<string, string[]> = {
  // I. 갑목(甲)
  [pairKey("갑","갑")]: ["쌍목위림"],
  [triKey("갑","갑","갑")]: undefined as never, // 안전장치(트리플은 아래에서 별도 등록)
  [pairKey("갑","을")]: ["등라계갑","등라반목"],
  [pairKey("갑","병")]: ["목화통명","청룡반수"],
  [pairKey("갑","정")]: ["유신유화"],
  [pairKey("갑","무")]: ["독산고목"],
  [pairKey("갑","기")]: ["양토육목"],
  [pairKey("갑","경")]: ["동량지목","흔목위재"],
  [pairKey("갑","신")]: ["목곤쇄편"],
  [pairKey("갑","임")]: ["횡당유영"],
  [pairKey("갑","계")]: ["수근로수"],
  // (특수 삼간)
  [triKey("경","갑","정")]: ["벽갑인정","벽갑인화"],

  // II. 을목(乙)
  [pairKey("을","을")]: ["복음잡초"],
  [pairKey("을","병")]: ["염양려화"],
  [pairKey("을","정")]: ["화소초원"],
  [pairKey("을","무")]: ["선화명병"],
  [pairKey("을","기")]: ["양토배화"],
  [pairKey("을","경")]: ["백호창광"],
  [pairKey("을","신")]: ["이전최화"],
  [pairKey("을","임")]: ["출수부용"],
  [pairKey("을","계")]: ["청초조로"],

  // III. 병화(丙)
  [pairKey("병","갑")]: ["비조부혈"],
  [pairKey("병","을")]: ["염양려화"],
  [pairKey("병","병")]: ["복음훙광"],
  [pairKey("병","정")]: ["삼기순수"],
  [pairKey("병","무")]: ["월기득사"],
  [pairKey("병","기")]: ["대지보조"],
  [pairKey("병","경")]: ["형옥입백"],
  [pairKey("병","신")]: ["일월상회"],
  [pairKey("병","임")]: ["강휘상영"],
  [pairKey("병","계")]: ["흑운차일"],

  // IV. 정화(丁)
  [pairKey("정","갑")]: ["유신유화"],
  [pairKey("정","을")]: ["건시열화"],
  [pairKey("정","병")]: ["항아분월"],
  [pairKey("정","정")]: ["양화위염"],
  [pairKey("정","무")]: ["유화유로"],
  [pairKey("정","기")]: ["성타구진"],
  [pairKey("정","경")]: ["화련진금"],
  [pairKey("정","신")]: ["소훼주옥"],
  [pairKey("정","임")]: ["성기득사"],
  [pairKey("정","계")]: ["주작투강"],

  // V. 무토(戊)
  [pairKey("무","갑")]: ["거석압목"],
  [pairKey("무","을")]: ["청룡합령"],
  [pairKey("무","병")]: ["일출동산"],
  [pairKey("무","정")]: ["유화유로"],
  [pairKey("무","무")]: ["복음준산"],
  [pairKey("무","기")]: ["물이유취"],
  [pairKey("무","경")]: ["조주위학"],
  [pairKey("무","신")]: ["반음설기"],
  [pairKey("무","임")]: ["산명수수"],
  [pairKey("무","계")]: ["암석침식"],

  // VI. 기토(己)
  [pairKey("기","갑")]: ["목강토산"],
  [pairKey("기","을")]: ["야초난생"],
  [pairKey("기","병")]: ["대지보조"],
  [pairKey("기","정")]: ["주작입묘"],
  [pairKey("기","무")]: ["경련상배"],
  [pairKey("기","기")]: ["복음연약"],
  [pairKey("기","경")]: ["전도형격"],
  [pairKey("기","신")]: ["습니오옥"],
  [pairKey("기","임")]: ["기토탁임"],
  [pairKey("기","계")]: ["옥토위생"],

  // VII. 경금(庚)
  [pairKey("경","갑")]: ["흔목위재","복궁최잔"],
  [pairKey("경","을")]: ["상합유정","백호창광"],
  [pairKey("경","병")]: ["태백입형"],
  [pairKey("경","정")]: ["득화이예","정정지격"],
  [pairKey("경","무")]: ["토중금매","토다금매"],
  [pairKey("경","기")]: ["관부형격","금실무성"],
  [pairKey("경","경")]: ["양금상살"],
  [pairKey("경","신")]: ["철추쇄옥"],
  [pairKey("경","임")]: ["금수쌍청","득수이청"],
  [pairKey("경","계")]: ["보도사로"],

  // VIII. 신금(辛)
  [pairKey("신","갑")]: ["월하송영"],
  [pairKey("신","을")]: ["이전최화"],
  [pairKey("신","병")]: ["간합패사"],
  [pairKey("신","정")]: ["화소주옥"],
  [pairKey("신","무")]: ["반음피상"],
  [pairKey("신","기")]: ["입옥자형"],
  [pairKey("신","경")]: ["백호출력"],
  [pairKey("신","신")]: ["복음상극"],
  [pairKey("신","임")]: ["도세주옥"],
  [pairKey("신","계")]: ["천뢰화개"],

  // IX. 임수(壬)
  [pairKey("임","갑")]: ["수중유영"],
  [pairKey("임","을")]: ["출수홍련"],
  [pairKey("임","병")]: ["강휘상영"],
  [pairKey("임","정")]: ["간합성기"],
  [pairKey("임","무")]: ["산명수수"],
  [pairKey("임","기")]: ["기토탁임"],
  [pairKey("임","경")]: ["경발수원"],
  [pairKey("임","신")]: ["도세주옥"],
  [pairKey("임","임")]: ["왕양대해"],
  [pairKey("임","계")]: ["천진지양","충천분지"],

  // X. 계수(癸)
  [pairKey("계","갑")]: ["양류감로"],
  [pairKey("계","을")]: ["이화춘우"],
  [pairKey("계","병")]: ["화개패사"],
  [pairKey("계","정")]: ["등사요교"],
  [pairKey("계","무")]: ["천을회합"],
  [pairKey("계","기")]: ["습윤옥토"],
  [pairKey("계","경")]: ["반음침백"],
  [pairKey("계","신")]: ["양쇠음성"],
  [pairKey("계","임")]: ["양쇠음성"],
  [pairKey("계","계")]: ["복음천라"],
};

// ===== 2) 3간(삼존/특수) 태그 사전 =====
const MULSANG_TRI_TAGS: Record<string, string[]> = {
  [triKey("갑","갑","갑")]: ["삼목위삼"],
  [triKey("을","을","을")]: ["삼을위초"],
  [triKey("병","병","병")]: ["삼병위양"],
  [triKey("정","정","정")]: ["삼정위화"],
  [triKey("무","무","무")]: ["삼무위산"],
  [triKey("기","기","기")]: ["삼기위토"],
  [triKey("경","경","경")]: ["삼경위강"],
  [triKey("신","신","신")]: ["삼신위금"],
  [triKey("임","임","임")]: ["삼임위해"],
  [triKey("계","계","계")]: ["삼계위수"],

  // 특수 3간
  [triKey("경","갑","정")]: ["벽갑인정","벽갑인화"],
};

function transformMulsangTags() {
  const newPairs: Record<string, string[]> = {};
  const newTris: Record<string, string[]> = {};

  // 천간 문자 세트 (한글 + 한자)
  const STEMS_REGEX = /[갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸]/g;

  // --- 2간
  for (const [key, tags] of Object.entries(MULSANG_PAIR_TAGS)) {
    if (!tags) continue;

    // key 안에서 한글 또는 한자 천간 2글자 추출
    const match = key.match(STEMS_REGEX);
    if (!match || match.length < 2) continue;

    const [a, b] = match;
    newPairs[key] = tags.map(t => `${a}X${b}_${t}`);
  }

  // --- 3간
  for (const [key, tags] of Object.entries(MULSANG_TRI_TAGS)) {
    if (!tags) continue;

    const match = key.match(STEMS_REGEX);
    if (!match || match.length < 3) continue;

    const [a, b, c] = match;
    newTris[key] = tags.map(t => `${a}X${b}X${c}_${t}`);
  }

  return { newPairs, newTris };
}

// 실행 예시
const { newPairs, newTris } = transformMulsangTags();

// ===== 3) 탐색 함수 =====
export function detectMulsangTerms(pillars: [string,string,string,string]): string[] {
  const [y, m, d, h] = pillars;
  const S = (gz: string) => stemOf(gz) as StemKo | "";
  const hs = S(h), ds = S(d), ms = S(m), ys = S(y);

  const tags: string[] = [];

  // --- 인접 2간
  const pairs: Array<[StemKo|"" , StemKo|""]> = [[hs, ds],[ds, ms],[ms, ys]];
  for (const [a,b] of pairs) {
    if (!a || !b) continue;
    const key = pairKey(a,b);
    const found = newPairs[key]; // ← ✅ 교체
    if (found && found.length) tags.push(...found);
    const rev = pairKey(b,a);
    if (rev !== key && newPairs[rev]) tags.push(...newPairs[rev]);
  }

  // --- 인접 3간
  const tris: Array<[StemKo|"" , StemKo|"" , StemKo|""]> = [[hs, ds, ms],[ds, ms, ys]];
  for (const [a,b,c] of tris) {
    if (!a || !b || !c) continue;
    const key = triKey(a,b,c);
    const found = newTris[key]; // ← ✅ 교체
    if (found && found.length) tags.push(...found);
    const key2 = triKey(c,b,a);
    if (key2 !== key && newTris[key2]) tags.push(...newTris[key2]);
  }

  return Array.from(new Set(tags));
}

export const STEMS = ["갑","을","병","정","무","기","경","신","임","계"] as const;
export const BRANCHES = ["자","축","인","묘","진","사","오","미","신","유","술","해"] as const;

// 타입만 분리
export type Stem = typeof STEMS[number];
export type Branch = typeof BRANCHES[number];
const STEM_IS_YANG: Record<typeof STEMS[number], boolean> = {
  "갑":true,"을":false,"병":true,"정":false,"무":true,"기":false,"경":true,"신":false,"임":true,"계":false,
};

/** 월지 양인(陽刃) 위치: 일간별 */
const YANGIN_MONTH_BY_DAY_STEM: Record<typeof STEMS[number], typeof BRANCHES[number]> = {
  "갑":"묘", // 甲刃在卯
  "을":"인", // 乙刃在寅
  "병":"오", // 丙刃在午
  "정":"사", // 丁刃在巳
  "무":"오", // 戊刃在午
  "기":"사", // 己刃在巳
  "경":"유", // 庚刃在酉
  "신":"신", // 辛刃在申
  "임":"자", // 壬刃在子
  "계":"해", // 癸刃在亥
};

/** 유틸: 안전 charAt(0/1) */
function firstChar(s: string | undefined | null): string { return s?.charAt(0) ?? ""; }
function secondChar(s: string | undefined | null): string { return s?.charAt(1) ?? ""; }

/** 메인: 원국 4주에서 구조 태그 산출 */
export function detectStructureTags(
  pillars: [string, string, string, string],
  mapping: string,
  unified: UnifiedPowerResult
) {
  // pillars: [년간지, 월간지, 일간지, 시간지] (예: "경자")
  const [yGZ, mGZ, dGZ, hGZ] = (pillars ?? []).slice(0, 4);

  // ── 안전 파서 ──
  const first = (s?: string) => (s?.length ?? 0) >= 1 ? s!.charAt(0) : "";
  const second = (s?: string) => (s?.length ?? 0) >= 2 ? s!.charAt(1) : "";

  // ── 원국만 사용 ──
  const stemsOnly  = [yGZ, mGZ, dGZ, hGZ].map(first).filter(Boolean) as string[];
  const branchOnly = [yGZ, mGZ, dGZ, hGZ].map(second).filter(Boolean) as string[];

  const dayStem   = first(dGZ);
  const isYangDay = STEM_IS_YANG[dayStem as keyof typeof STEM_IS_YANG] ?? false;

  const tags = new Set<string>();

  // ── 지장간 매핑 선택 ──
  const HIDDEN_MAP = mapping === "classic" ? hiddenStemMappingClassic : hiddenStemMappingHGC;
  const VALID_STEM_SET = new Set(["갑","을","병","정","무","기","경","신","임","계"]);

  const getHiddenStemsAll = (branch: string): string[] =>
    (HIDDEN_MAP[branch] ?? []).filter((s) => VALID_STEM_SET.has(s));

  // ✅ “표면 전용” 지지→십신 (지장간 전혀 사용 안 함)
  const tgOfBranchSurface = (day: string, branch: string): TenGodSubtype => {
    const el = BRANCH_MAIN_ELEMENT[branch as keyof typeof BRANCH_MAIN_ELEMENT];
    // branch 표면 오행이 없으면 안전탈출
    if (!el) throw new Error(`Unknown branch main element: ${branch}`);
    return elementToTenGod(day, el);
  };

  // ── 1) 오행 강도(천간 10, 지지본기 6) ──
  const elCount: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };

  for (const s of stemsOnly) {
    const e = STEM_TO_ELEMENT[s as keyof typeof STEM_TO_ELEMENT];
    if (e) elCount[e] += 10;
  }

  const hiddenMainStems: string[] = [];
  for (const b of branchOnly) {
    const mainStem = BRANCH_MAIN_STEM[b as keyof typeof BRANCH_MAIN_STEM];
    if (mainStem) hiddenMainStems.push(mainStem); // 본기만 축적 (집계용)
    const e = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
    if (e) elCount[e] += 6;
  }

  // ── 2) 십신 집계 리스트(천간 + 지지 본기=정기만) ──
  //    ※ 요청사항대로 집계는 “본기만” 사용 (초기/중기 불포함)
  const allStemsFor10God = [...stemsOnly, ...hiddenMainStems] as string[];
  const subList = allStemsFor10God.map((s) => mapStemToTenGodSub(dayStem, s));

  type MainGroup = "비겁" | "식상" | "재성" | "관성" | "인성";
  type TenGodSubtype = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";

  const groupMap: Record<MainGroup, TenGodSubtype[]> = {
    비겁: ["비견", "겁재"],
    식상: ["식신", "상관"],
    재성: ["편재", "정재"],
    관성: ["편관", "정관"],
    인성: ["편인", "정인"],
  };

  const cntSub  = (sub: TenGodSubtype) => subList.filter((x) => x === sub).length;
  const cntMain = (main: MainGroup) => subList.filter((x) => groupMap[main].includes(x)).length;

  // 월지 양인
  const monthBranch = branchOnly[1];
  const hasYangin = !!dayStem && YANGIN_MONTH_BY_DAY_STEM[dayStem as keyof typeof YANGIN_MONTH_BY_DAY_STEM] === monthBranch;

  // ─────────────────────────
  // A) 조화·상생형 구조
  // ─────────────────────────

  // 감리상지
  const elPct = unified.elementPercent100;
  if (elPct["수"] >= 20 && elPct["화"] >= 20 && elPct["토"] >= 15) {
    tags.add("감리상지");
  }

  // ✅ 인접/흐름 판정 시퀀스 (지장간 완전 배제: 천간 + 지지 ‘표면’만)
  const validGZ = [yGZ, mGZ, dGZ, hGZ].filter(Boolean) as string[];
  const seq: TenGodSubtype[] = [];
  for (const gz of validGZ) {
    const gan = gz.charAt(0);
    const ji  = gz.charAt(1);
    // 천간 십신
    seq.push(mapStemToTenGodSub(dayStem, gan));
    // 지지 표면 십신 (지장간 NO)
    seq.push(tgOfBranchSurface(dayStem, ji));
  }

  // 인접 판정
  const hasAdjacency = (
    groupA: (TenGodSubtype | TwelveUnseong)[],
    groupB: (TenGodSubtype | TwelveUnseong)[]
  ) => {
    // seq = [간, 지, 간, 지, ...] 전제 (지장간 미포함)
    const pairOK = (x?: TenGodSubtype | TwelveUnseong, y?: TenGodSubtype | TwelveUnseong) =>
      !!x && !!y &&
      (
        (groupA as unknown as string[]).includes(x as unknown as string) &&
        (groupB as unknown as string[]).includes(y as unknown as string)
      ) ||
      (
        (groupB as unknown as string[]).includes(x as unknown as string) &&
        (groupA as unknown as string[]).includes(y as unknown as string)
      );

    // 1) 같은 기둥 수직 인접만 체크: (간[i] ↔ 지[i])
    for (let i = 0; i + 1 < seq.length; i += 2) {
      if (pairOK(seq[i], seq[i + 1])) return true;
    }

    // ❌ 기둥 경계/대각선은 검사하지 않음
    //    (지[i] ↔ 간[i+1]) / (간[i] ↔ 지[i+1]) / 수평 등 전부 무시

    return false;
  };


  const hasType = (targets: TenGodSubtype[]) => seq.some((tg) => targets.includes(tg));

  // 화상위재
  const cntSiksang = cntSub("식신") + cntSub("상관");
  const cntSanggan = cntSub("상관");
  const cntJaesung = cntMain("재성");
  const cntGwan    = cntMain("관성");
  const hasAdjacencySR = hasAdjacency(["식신", "상관"], ["편재", "정재"]);

  if (
    (cntSanggan >= 1 || cntSiksang >= 2) &&
    cntJaesung >= 1 &&
    cntSiksang > cntJaesung &&
    cntGwan <= 1 &&
    hasAdjacencySR
  ) {
    tags.add("화상위재");
  }

  // 재생관 / 재생관살
  if (hasType(groupMap.재성) && hasType(groupMap.관성) && hasAdjacency(groupMap.재성, groupMap.관성)) {
    const hasCheolSal = subList.includes("편관"); // 집계: 본기만
    tags.add(hasCheolSal ? "재생관살" : "재생관");
  }

  // 재인불애
  if (
    cntMain("재성") >= 2 &&
    cntMain("인성") >= 2 &&
    Math.abs(cntMain("재성") - cntMain("인성")) <= 1 &&
    cntMain("식상") <= 1 &&
    cntMain("관성") <= 1
  ) {
    tags.add("재인불애");
  }

  // 화겁/화록 위생·위재 (예시)
  const biCnt   = cntSub("비견");
  const geobCnt = cntSub("겁재");
  const sikCnt  = cntSub("식신") + cntSub("상관");
  const jaeCnt  = cntSub("정재") + cntSub("편재");
  const gwanCnt = cntMain("관성");

  if (geobCnt >= 2 && sikCnt >= 1 && elCount["화"] + elCount["목"] >= 20) tags.add("화겁위생");
  if (geobCnt >= 2 && jaeCnt >= 1 && elCount["화"] + elCount["토"] >= 20) tags.add("화겁위재");

  if (
    geobCnt >= 2 && jaeCnt >= 1 &&
    elCount["화"] + elCount["토"] >= 20 &&
    hasAdjacency(["겁재"], ["정재","편재"]) &&
    gwanCnt <= 1
  ) tags.add("화겁위재");

  if (
    biCnt >= 2 && jaeCnt >= 1 &&
    elCount["화"] + elCount["토"] >= 20 &&
    hasAdjacency(["건록"], ["정재","편재"]) &&
    gwanCnt <= 1
  ) tags.add("화록위재");

  // 재명유기 (본기 기준 통근)
  const hasStemRootedInBranch = (stem: string, branch: string): boolean => {
    const stemEl   = STEM_TO_ELEMENT[stem];
    const branchEl = BRANCH_MAIN_ELEMENT[branch as keyof typeof BRANCH_MAIN_ELEMENT];
    return !!stemEl && !!branchEl && stemEl === branchEl;
  };

  const gzList = [yGZ, mGZ, dGZ, hGZ].filter(Boolean) as string[];
  const dayBranch = second(dGZ);
  const dayHasRoot = hasStemRootedInBranch(dayStem, dayBranch);

  const jaeStems = gzList
    .map((gz) => gz.charAt(0))
    .filter((stem) => ["편재","정재"].includes(mapStemToTenGodSub(dayStem, stem)));

  let jaeHasRoot = false;
  for (const gz of gzList) {
    const gan = gz.charAt(0), br = gz.charAt(1);
    if (jaeStems.includes(gan) && hasStemRootedInBranch(gan, br)) { jaeHasRoot = true; break; }
  }
  if (dayHasRoot && jaeHasRoot) tags.add("재명유기");

  // ─────────────────────────
  // B) 과다/불균형·억제/설기
  // ─────────────────────────
  if (cntMain("관성") >= 3 && cntMain("관성") >= 0.5 * (cntMain("비겁")+cntMain("식상")+cntMain("재성")+cntMain("인성"))) {
    tags.add("관살과다");
  }
  if (cntMain("인성") >= 3 && cntMain("인성") >= 0.5 * (cntMain("비겁")+cntMain("식상")+cntMain("재성")+cntMain("관성"))) {
    tags.add("인수과다");
  }
  if (cntMain("인성") >= 3 && cntMain("관성") >= 1) tags.add("인다관설");
  if (cntMain("재성") >= 3 && (cntMain("비겁")+cntMain("인성")) <= 1) tags.add("재다신약");

  const cheolsalCnt = cntSub("편관");
  if ((cntMain("비겁")+cntMain("인성")) >= 2 && cheolsalCnt === 1 && cntMain("재성") >= 1) tags.add("재자약살");
  if (cheolsalCnt >= 2 && (sikCnt + cntMain("인성")) >= 3) tags.add("제살태과");

  const totalBigup = biCnt + geobCnt;
  if ((biCnt >= 2 || totalBigup >= 2) && jaeCnt >= 1 && totalBigup > jaeCnt) tags.add("군비쟁재");
  if (geobCnt >= 2 && jaeCnt >= 1 && totalBigup > jaeCnt) tags.add("군겁쟁재");

  // ─────────────────────────
  // C) 상관·관살 상호작용
  // ─────────────────────────
  const sanggwanCnt = cntSub("상관");
  const jeonggwanCnt = cntSub("정관");

  if (sanggwanCnt >= 2 && (cheolsalCnt + jeonggwanCnt) >= 1) tags.add("상관견관");
  if (sanggwanCnt >= 2 && (cheolsalCnt + jeonggwanCnt) === 0) tags.add("상관상진");
  if (isYangDay && sanggwanCnt >= 2 && cheolsalCnt >= 1) tags.add("상관대살");
  if (!isYangDay && sanggwanCnt >= 2 && cheolsalCnt >= 1) tags.add("상관합살");
  if (cntSub("식신") >= 2 && cntSub("편인") >= 1) tags.add("식신봉효");
  if (cntSub("정관") >= 1 && cntSub("정인") >= 1 &&
      hasAdjacency(["정관"], ["정인"])) tags.add("관인쌍전");
  if (hasYangin && cheolsalCnt >= 1 && (cntMain("비겁")+cntMain("인성")) >= 2) tags.add("양인합살");

  // ─────────────────────────
  // D) 천지 무십신 전용 검사
  //     → 여기서만 ‘지장간 전체(정/중/초기)’ 사용
  // ─────────────────────────
  const safeBranchOnly = [second(yGZ), second(mGZ), second(dGZ), second(hGZ)].filter(Boolean) as string[];

  // ✅ 지장간 전체(정/중/초기) — 오직 여기서만 사용
  // 1) 천간(일간 제외) → 십신 집합
  const stemsToCheck = [
    yGZ?.charAt(0),   // 연간
    mGZ?.charAt(0),   // 월간
    /* dGZ?.charAt(0) — 일간은 제외 */
    hGZ?.charAt(0),   // 시간
  ].filter(Boolean) as string[];

  const stemTGSet = new Set<TenGodSubtype>(
    stemsToCheck.map(s => mapStemToTenGodSub(dayStem, s))
  );

  // 2) 지지 "표면(본기 오행)" → 십신 집합  ※ 지장간 배제
  const surfaceTGSet = new Set<TenGodSubtype>(
    safeBranchOnly.flatMap((b) => {
      const el = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
      if (!el) return [];
      return [elementToTenGod(dayStem, el)];
    })
  );

  // 3) 지장간 전체(정/중/초기) → 십신 집합  ※ 여기서만 지장간 사용
  const hiddenAllTGSet = new Set<TenGodSubtype>(
    safeBranchOnly.flatMap(b =>
      getHiddenStemsAll(b).map(h => mapStemToTenGodSub(dayStem, h))
    )
  );

  // 4) 그룹별 존재여부 계산 (인접/흐름 무관, 전역 포함)
  (["비겁","식상","재성","관성","인성"] as const).forEach((main) => {
    const targets = groupMap[main]; // 예: ["편재","정재"]

    // 어디서든 하나라도 존재하면 true
    const existStem    = targets.some((t) => stemTGSet.has(t));
    const existSurface = targets.some((t) => surfaceTGSet.has(t));
    const existHidden  = targets.some((t) => hiddenAllTGSet.has(t));

    // 정의:
    // - 천지무X: 천간X & 지지표면X & 지장간전체X
    // - 무X:     천간X & 지지표면X & 지장간전체O
    if (!existStem && !existSurface && !existHidden) {
      tags.add(`천지무${main}`);
    } else if (!existStem && !existSurface && existHidden) {
      tags.add(`무${main}`);
    }
  });

  return Array.from(tags);
}

