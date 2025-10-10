// features/AnalysisReport/logic/gyeokguk.ts
// 격국(內格/外格) 판정 엔진 — 원국과 대응

import { getSolarTermBoundaries } from "@/features/myoun";
import { hiddenStemMappingHGC, hiddenStemMappingClassic } from "@/shared/domain/hidden-stem/const";
import { getTwelveUnseong } from "@/shared/domain/간지/twelve";
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

/* =========================
 * 기본 맵/유틸
 * ========================= */
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

/* =========================
 * 월지 지장간 월률 분포표 (초/중/정 + 가중치)
 * ========================= */
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

/* =========================
 * 절입일 +12일 판정 (고지용)
 * ========================= */
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

/* =========================
 * 삼합 (월지 기준 고지 보조)
 * ========================= */
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

/* =========================
 * 십신 매핑(정/편 포함)
 * ========================= */
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


function mapBranchToElement(branch: string): Element {
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
}

/** 천간 → 오행 */
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

// function hasAdjacencyAcrossPillars(
//   groupA: TenGodSubtype[],
//   groupB: TenGodSubtype[],
//   tenGodList: TenGodSubtype[],
//   gzList: string[], // ["갑자","병인","경오","임신"]
//   dayStem: string,
//   options?: { includeSamePillar?: boolean } // 🔥 옵션 추가
// ): boolean {
//   // ① 일반 인접 (천간↔천간, 지지↔지지, 기둥 간 인접)
//   for (let i = 0; i < tenGodList.length - 1; i++) {
//     const a = tenGodList[i];
//     const b = tenGodList[i + 1];
//     if (
//       (groupA.includes(a) && groupB.includes(b)) ||
//       (groupB.includes(a) && groupA.includes(b))
//     ) {
//       return true;
//     }
//   }

//   // ② 같은 기둥(천간↔지지) 비교 — 옵션일 때만 활성
//   if (options?.includeSamePillar) {
//     for (const gz of gzList) {
//       const gan = gz.charAt(0);
//       const ji = gz.charAt(1);
//       const tgGan = mapStemToTenGodSub(dayStem, gan);
//       const tgJi = mapBranchToTenGodSub(dayStem, ji);
//       if (
//         (groupA.includes(tgGan) && groupB.includes(tgJi)) ||
//         (groupB.includes(tgGan) && groupA.includes(tgJi))
//       ) {
//         return true;
//       }
//     }
//   }

//   return false;
// }



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

// 십성 대분류 헬퍼(러프)
// const tgMain = (day: string, target: string): "비겁"|"식상"|"재성"|"관성"|"인성" => {
//   const d = STEM_TO_ELEMENT[day], t = STEM_TO_ELEMENT[target];
//   if (!d || !t) return "비겁";
//   if (t === d) return "비겁";
//   if (t === SHENG_NEXT[d]) return "식상";
//   if (t === KE[d]) return "재성";
//   if (t === KE_REV[d]) return "관성";
//   if (t === SHENG_PREV[d]) return "인성";
//   return "비겁";
// };

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

  const stems = [stemOf(yGZ), stemOf(mGZ), stemOf(dGZ), stemOf(hGZ)].filter(Boolean);
  const branches = [branchOf(yGZ), branchOf(mGZ), branchOf(dGZ), branchOf(hGZ)].filter(Boolean);
  const dEl = STEM_TO_ELEMENT[dayStem];
  const subs = stems.map((s)=> mapStemToTenGodSub(dayStem, s));

  const out: string[] = [];

  // ── 1) 양인/월지겁재/건록(전록/귀록)
  // 양인: 일간 양간 + 월지가 동오행 음지(표준 매핑로직 사용)
  if (isYangStem(dayStem) && YANGIN_MAP[dayStem] === monthBranch) {
    out.push("양인격");
  }
  // ── 1-1) 건록격 (일간과 오행이 같고 음양도 같은 경우)
  const GEONLOK_SET: Array<[string, string]> = [
    ["을", "묘"],
    ["병", "사"],
    ["정", "오"],
    ["경", "신"],
    ["임", "해"],
    ["계", "자"],
    ["무", "사"],
    ["기", "오"],
  ];

  for (const [stem, branch] of GEONLOK_SET) {
    if (dayStem === stem && monthBranch === branch) {
      out.push("건록격");
      break;
    }
  }
  // 월지겁재: 일간 음간 + 월지가 同五行 양지(표준 매핑)
  if (!isYangStem(dayStem) && WOLGEOP_MAP[dayStem] === monthBranch) {
    out.push("월지겁재격");
  }
  // 전록/귀록: 일지/시지가 건록지이며 오행도 일간과 일치
  const dayLok = LOK_BRANCH[dayStem];
  if (dayLok && branchOf(dGZ) === dayLok && dEl === BRANCH_MAIN_ELEMENT[branchOf(dGZ)]) {
    out.push("전록격");
  }
  if (dayLok && branchOf(hGZ) === dayLok && dEl === BRANCH_MAIN_ELEMENT[branchOf(hGZ)]) {
    out.push("귀록격");
  }

  // pillars: [년간지, 월간지, 일간지, 시간지] 형식 가정 예) "경자"

  // ── 원국만 사용 (운 영향 없음) ──
  const stemsOnly = [yGZ, mGZ, dGZ, hGZ].map(firstChar);
  const branchOnly  = [yGZ, mGZ, dGZ, hGZ].map(secondChar);

  const elCount: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };

  // 천간 가산
  for (const s of stemsOnly) {
    if (!s) continue;
    const e = STEM_TO_ELEMENT[s as keyof typeof STEM_TO_ELEMENT];
    if (e) elCount[e] += 10;
  }

  // 지지 본기 가산(정기만 반영)
  const hiddenMainStems: string[] = [];
  for (const b of branchOnly) {
    if (!b) continue;
    const mainStem = BRANCH_MAIN_STEM[b as keyof typeof BRANCH_MAIN_STEM];
    if (mainStem) hiddenMainStems.push(mainStem);
    const e = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
    if (e) elCount[e] += 6;
  }

  //const allStemsFor10God = [...stemsOnly, ...hiddenMainStems].filter(Boolean) as string[];
  //const subList = allStemsFor10God.map((s) => mapStemToTenGodSub(dayStem, s));
  
  // const cntMain = (main: "비겁"|"식상"|"재성"|"관성"|"인성") => {
  //   const group: Record<typeof main, TenGodSubtype[]> = {
  //     비겁: ["비견", "겁재"],
  //     식상: ["식신", "상관"],
  //     재성: ["편재", "정재"],
  //     관성: ["편관", "정관"],
  //     인성: ["편인", "정인"],
  //   };
  //   return subList.filter(x => group[main].includes(x)).length;
  // };

  // // 관인격 판별 (인접 조건 추가)
  // if (cntMain("관성") && cntMain("인성")) {
  //   const pos = stems.map((s, idx) => ({
  //     s,
  //     kind: tgMain(dayStem, s),
  //     idx,
  //   }));

  //   // 관·인 위치 찾기
  //   const gPos = pos.filter(p => p.kind === "관성");
  //   const iPos = pos.filter(p => p.kind === "인성");

  //   // 인접 여부 체크: |idx 차이| <= 1이면 인접
  //   const isAdjacent = gPos.some(g => iPos.some(i => Math.abs(g.idx - i.idx) <= 1));

  //   if (isAdjacent) {
  //     const anyGwan = gPos[0]?.s;
  //     const anyIn = iPos[0]?.s;
  //     const gEl = STEM_TO_ELEMENT[anyGwan];
  //     const iEl = STEM_TO_ELEMENT[anyIn];
  //     if (gEl && iEl && SHENG_NEXT[gEl] === iEl && dEl && SHENG_NEXT[iEl] === dEl) {
  //       out.push("관인상생격");
  //     } else {
  //       out.push("관인격");
  //     }
  //   }
  // }
  const HIDDEN_MAP = (mapping === "hgc"
  ? hiddenStemMappingHGC
  : hiddenStemMappingClassic) as typeof hiddenStemMappingClassic;

  function getHiddenStems(branch: string): string[] {
    return HIDDEN_MAP[branch] ?? [];
  }

  const validGZ = [yGZ, mGZ, dGZ, hGZ].filter(Boolean) as string[];
  const allPillars = validGZ.flatMap(gz => [gz.charAt(0), gz.charAt(1)]);

  const tenGodList: TenGodSubtype[] = allPillars.flatMap(item => {
    try {
      // 천간인 경우
      if (["갑","을","병","정","무","기","경","신","임","계"].includes(item)) {
        return [mapStemToTenGodSub(dayStem, item)];
      }
      // 지지인 경우
      if (["자","축","인","묘","진","사","오","미","신","유","술","해"].includes(item)) {
        // 지지 자체 + 지장간까지 포함
        const tgBranch = mapBranchToTenGodSub(dayStem, item);
        const hidden = getHiddenStems(item).map(h => mapStemToTenGodSub(dayStem, h));
        return [tgBranch, ...hidden];
      }
      return [];
    } catch {
      return [];
    }
  });

  const hasType = (target: TenGodSubtype[]) =>
    tenGodList.some(tg => target.includes(tg));

  const hasAdjacency = (groupA: TenGodSubtype[], groupB: TenGodSubtype[]) => {
    // 동적 기둥 구간 탐색용
    const pillarStarts: number[] = []; // 각 기둥 시작 인덱스
    for (let i = 0; i < tenGodList.length; i++) {
      const tg = tenGodList[i];
      // 천간은 무조건 기둥 시작점
      if (["비견","겁재","식신","상관","편재","정재","편관","정관","편인","정인"].includes(tg)) {
        // 맨 처음은 무조건 추가, 이후엔 "간-지-지장" 패턴 뒤에 새 간이 오면 새로운 기둥 시작
        if (i === 0 || (i > 0 && tenGodList[i-1] !== tg)) {
          pillarStarts.push(i);
        }
      }
    }

    // 각 기둥을 배열로 자르기
    const pillars: TenGodSubtype[][] = [];
    for (let p = 0; p < pillarStarts.length; p++) {
      const start = pillarStarts[p];
      const end = pillarStarts[p + 1] ?? tenGodList.length;
      pillars.push(tenGodList.slice(start, end));
    }

    // 같은 기둥 내부 인접 쌍 검사
    for (const pillar of pillars) {
      for (let i = 0; i < pillar.length - 1; i++) {
        const a = pillar[i];
        const b = pillar[i + 1];
        if (
          (groupA.includes(a) && groupB.includes(b)) ||
          (groupB.includes(a) && groupA.includes(b))
        ) {
          return true;
        }
      }
    }

    // 기둥 간 인접: 현재 기둥 마지막 ↔ 다음 기둥 첫
    for (let p = 0; p < pillars.length - 1; p++) {
      const last = pillars[p][pillars[p].length - 1];
      const next = pillars[p + 1][0];
      if (
        (groupA.includes(last) && groupB.includes(next)) ||
        (groupB.includes(last) && groupA.includes(next))
      ) {
        return true;
      }
    }

    return false;
  };

  // ===== 십신 그룹 매핑 =====
  const groupMap = {
    식상: ["식신", "상관"] as const,
    재성: ["편재", "정재"] as const,
    관성: ["편관", "정관"] as const,
    인성: ["편인", "정인"] as const,
    비겁: ["비견", "겁재"] as const,
  };

  // 관인상생격
  if (
    hasType([...groupMap.관성]) &&
    hasType([...groupMap.인성]) &&
    hasAdjacency([...groupMap.관성], [...groupMap.인성])
  ) {
    out.push("관인상생격");
  }

  // ===== 격국 판별 =====

  // 식상생재격: 식상이 재성을 생하고, 인접(간↔지 or 옆기둥)해야 성립
  if (
    hasType([...groupMap.식상]) &&
    hasType([...groupMap.재성]) &&
    hasAdjacency([...groupMap.식상], [...groupMap.재성])
  ) {
    out.push("식상생재격");
  }


  // dayStem = 일간 (기준)
  const tenGodUnseongList: TenGodOrUnseong[] = [];

  for (let i = 0; i < allPillars.length; i++) {
    const item = allPillars[i];
    const isStem = i % 2 === 0;

    try {
      if (isStem) {
        const tg = mapStemToTenGodSub(dayStem, item);
        tenGodUnseongList.push(tg);
      } else {
        const tgBranch = mapBranchToTenGodSub(dayStem, item);
        const unseong = getTwelveUnseong(dayStem, item); // now typed as TwelveUnseong | ""
        tenGodUnseongList.push(tgBranch);
        if (unseong) tenGodUnseongList.push(unseong as TwelveUnseong);
      }
    } catch {
      continue;
    }
  }

  // 식상생재
  if (
    hasType([...groupMap.식상]) &&
    hasType([...groupMap.재성]) &&
    hasAdjacency([...groupMap.식상], [...groupMap.재성])
  ) {
    out.push("식상생재격");
  }

  // 식상제살격: 식상이 칠살(편관)을 제어 — (편관 존재 + 정관 과다 X + 식상 수 ≥ 살 수)
  const cnt = (labels: string[]) => subs.filter((x)=> labels.includes(x)).length;
  const nSiksang = cnt(["식신","상관"]);
  const nCheolsal = cnt(["편관"]);
  const nJeonggwan = cnt(["정관"]);
  if (nCheolsal>=1 && nSiksang>=1 && nSiksang >= nCheolsal && nJeonggwan <= nCheolsal) {
    out.push("식상제살격");
  }
  // 상관패인격: 상관이 인성을 패함 — 상관≥인성 & 둘 다 존재
  const nSanggan = cnt(["상관"]);
  const nInseong = cnt(["정인","편인"]);
  if (nSanggan>=1 && nInseong>=1 && nSanggan >= nInseong) {
    out.push("상관패인격");
  }

  // ── 3) 칠살/살인상생
  const hasCheolsal = subs.includes("편관");
  if (hasCheolsal) out.push("칠살격");
  if (hasCheolsal && nInseong>=1) out.push("살인상생격");

  // ── 4) 전왕/종격 (전부 원국 강도 기준으로 엄격화)
  const str = roughElementStrength(pillars);
  const sortedEl = Object.entries(str).sort((a,b)=>b[1]-a[1]);
  const top = sortedEl[0];
  if (top && top[1] >= 60) out.push(`전왕격(${top[0]})`);
  // 종격: 최강 원소 75↑ & 2등과 격차 ≥12 & 일간 오행 ≠ 최강
  if (sortedEl.length >= 2) {
    const [firstEl, firstVal] = sortedEl[0];
    const [, secondVal] = sortedEl[1];
    if (firstVal >= 75 && firstVal - secondVal >= 12 && dEl !== firstEl) {
      out.push(`종격(${firstEl})`);
    }
  }

  // ── 5) 간합 화기 (가화/진화/화기) — 합화 오행 강도 반영
  for (const p of STEM_COMB_PAIRS) {
  const hasA = stems.includes(p.a);
  const hasB = stems.includes(p.b);
  if (!hasA || !hasB) continue;

  const toEl = p.to;
  const toStr = (str[toEl] ?? 0);

  const aEl = STEM_TO_ELEMENT[p.a];
  const bEl = STEM_TO_ELEMENT[p.b];
  const origMax = Math.max(str[aEl] ?? 0, str[bEl] ?? 0);

  // 계절(월지 본기)이 합화 오행을 지지하는지
  const seasonFav = BRANCH_MAIN_ELEMENT[monthBranch] === toEl;

  // 합화 오행이 원국 최강인지
  const sortedForTop = Object.entries(str).sort((x, y) => y[1] - x[1]);
  const isTop = sortedForTop[0]?.[0] === toEl;

  // 중복 태깅 방지 플래그
  let tagged = false;

  // 🔥 화기격(化氣格): "완전 변환"으로 간주
  // - 합화 오행 강도 높음(≥60)
  // - 계절 지지(seasonFav) 또는 최강(isTop)
  // - 원래 두 오행의 강도 약함(≤20)
  // - 합화 오행과 원래 오행 간 격차 큼(≥20)
  if (toStr >= 60 && (seasonFav || isTop) && origMax <= 20 && (toStr - origMax >= 20)) {
    out.push(`화기격(${toEl})`);
    tagged = true;
  }

  // 🌡️ 진화격(眞化格): 강하게 변환되었으나 완전변환까진 아님
  // - 합화 오행 강도(≥50)
  // - 계절 지지 또는 최강
  // - 원래 두 오행 약함(≤25)
  if (!tagged && toStr >= 50 && (seasonFav || isTop) && origMax <= 25) {
    out.push(`진화격(${toEl})`);
    tagged = true;
  }

  // 💧 가화격(假化格): 합화 조짐만 있음
  // - 합화 오행 보통 이상(≥35)
  // - 위 조건들 미충족 시에만
  if (!tagged && toStr >= 35) {
      out.push(`가화격(${toEl})`);
    }
  }

  // ── 6) 금신/시묘/록마류 및 비천록마 (화기 완전 부재 조건 강화)
  const hPair = `${stemOf(hGZ)}${branchOf(hGZ)}`;
  if (["갑","기"].includes(dayStem) && ["기사","계유","을축"].includes(hPair)) out.push("금신격");
  if (["진","술","축","미"].includes(branchOf(hGZ))) out.push("시묘격");
  if (["병","정"].includes(dayStem) && (branchOf(dGZ)==="오" || branchOf(mGZ)==="오") && !branches.includes("자")) out.push("도충록마격");
  // 비천록마격: 자/해 일주 + 화기운(병·정 / 사·오) **완전 부재**
  const hasFireStem = stems.some((s) => s==="병" || s==="정");
  const hasFireBranch = branches.some((b) => b==="사" || b==="오");
  if (["자","해"].includes(branchOf(dGZ)) && !hasFireStem && !hasFireBranch) {
    out.push("비천록마격");
  }

  // ── 7) 삼기/삼상/재관쌍미
  // 천상삼기: 갑·무·경 모두 존재
  if (["갑","무","경"].every((s)=> stems.includes(s))) out.push("천상삼기격");
  // 인중삼기: 임·계·신 모두
  if (["임","계","신"].every((s)=> stems.includes(s))) out.push("인중삼기격");
  // 지하삼기: 을·병·정 모두
  if (["을","병","정"].every((s)=> stems.includes(s))) out.push("지하삼기격");
  // 삼상격: 상위 3원소가 근접(Top-3차이 ≤ 8) + 상위3 합 ≥ 80
  const topVals = Object.values(str).sort((a,b)=>b-a);
  if (topVals.length>=3 && topVals[0]-topVals[2] <= 8 && (topVals[0]+topVals[1]+topVals[2] >= 80)) {
    out.push("삼상격");
  }
  // 재관쌍미: 재성과 관성이 균형적으로 공존 (수량 균형)
  const nJae = cnt(["정재","편재"]);
  const nGwan = cnt(["정관","편관"]);
  if (nJae>=1 && nGwan>=1 && Math.abs(nJae - nGwan) <= 1) {
    out.push("재관쌍미격");
  }

  // ── 8) 지지세트/동체/일기류
  const hasAll = (need: string[]) => need.every((b)=> branches.includes(b));
  if (hasAll(["진","술","축","미"])) out.push("사고격");
  if (hasAll(["인","신","사","해"])) out.push("사생격");
  if (hasAll(["자","오","묘","유"])) out.push("사정격");

  if (branches.length===4 && branches.every((b)=> b === branches[0])) out.push("지지원일기격");
  if (stems.length===4 && stems.every((s)=> s === stems[0])) out.push("천원일기격");
  if (stems.length===4 && stems.every((s)=> isYangStem(s))) out.push("양간부잡격");
  if (stems.length===4 && stems.every((s)=> !isYangStem(s))) out.push("음간부잡격");

  if (pillars.every((gz)=> gz && gz === pillars[0])) out.push("봉황지격");
  if (stems.length===4 && stems.every((s)=> s===stems[0]) && branches.length===4 && branches.every((b)=> b===branches[0])) {
    out.push("간지동체격");
  }

  // 전식록: 식상 존재 + 일지/시지 건록
  const hasSiksang = cnt(["식신","상관"])>=1;
  if (hasSiksang && (branchOf(dGZ)===LOK_BRANCH[dayStem] || branchOf(hGZ)===LOK_BRANCH[dayStem])) {
    out.push("전식록격");
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
export function detectStructureTags(pillars: [string, string, string, string], mapping = "classic", unified: UnifiedPowerResult) {
  // pillars: [년간지, 월간지, 일간지, 시간지] 형식 가정 예) "경자"
  const [yGZ, mGZ, dGZ, hGZ] = (pillars ?? []).slice(0, 4);

  // ── 원국만 사용 (운 영향 없음) ──
  const stemsOnly = [yGZ, mGZ, dGZ, hGZ].map(firstChar);
  const branchOnly  = [yGZ, mGZ, dGZ, hGZ].map(secondChar);

  const dayStem   = firstChar(dGZ);
  const isYangDay = STEM_IS_YANG[dayStem as keyof typeof STEM_IS_YANG] ?? false;

  const tags = new Set<string>();

  // ── 1) 오행 강도(천간 10, 지지본기 6) ─────────────────
  const elCount: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };

  // 천간 가산
  for (const s of stemsOnly) {
    if (!s) continue;
    const e = STEM_TO_ELEMENT[s as keyof typeof STEM_TO_ELEMENT];
    if (e) elCount[e] += 10;
  }

  // 지지 본기 가산(정기만 반영)
  const hiddenMainStems: string[] = [];
  for (const b of branchOnly) {
    if (!b) continue;
    const mainStem = BRANCH_MAIN_STEM[b as keyof typeof BRANCH_MAIN_STEM];
    if (mainStem) hiddenMainStems.push(mainStem);
    const e = BRANCH_MAIN_ELEMENT[b as keyof typeof BRANCH_MAIN_ELEMENT];
    if (e) elCount[e] += 6;
  }

  const HIDDEN_MAP = (mapping === "classic"
    ? hiddenStemMappingHGC
    : hiddenStemMappingClassic) as typeof hiddenStemMappingClassic;

  function getHiddenStems(branch: string): string[] {
    return HIDDEN_MAP[branch] ?? [];
  }

  // ── 2) 십신 리스트(천간 + 지지 본기=정기 포함) ─────────
  const allStemsFor10God = [...stemsOnly, ...hiddenMainStems].filter(Boolean) as string[];
  const subList = allStemsFor10God.map((s) => mapStemToTenGodSub(dayStem, s));

  const cntSub = (sub: TenGodSubtype) => subList.filter(x => x === sub).length;
  const cntMain = (main: "비겁"|"식상"|"재성"|"관성"|"인성") => {
    const group: Record<typeof main, TenGodSubtype[]> = {
      비겁: ["비견", "겁재"],
      식상: ["식신", "상관"],
      재성: ["편재", "정재"],
      관성: ["편관", "정관"],
      인성: ["편인", "정인"],
    };
    return subList.filter(x => group[main].includes(x)).length;
  };

  // 월지 양인(陽刃) 판정: 정확 테이블 사용
  const monthBranch = branchOnly[1];
  const hasYangin =
    !!dayStem &&
    YANGIN_MONTH_BY_DAY_STEM[dayStem as keyof typeof YANGIN_MONTH_BY_DAY_STEM] === monthBranch;

  // ──────────────────────────────────────────────────────
  // A) 조화·상생형 구조
  // ──────────────────────────────────────────────────────

  // 감리상지: 水·火 공존 + 木/土 통관  (둘 다 강해야)
  const elPct = unified.elementPercent100;
  if (
    elPct["수"] >= 20 &&
    elPct["화"] >= 20 &&
    elPct["토"] >= 15
  ) {
    tags.add("감리상지");
  }

  const validGZ = [yGZ, mGZ, dGZ, hGZ].filter(Boolean) as string[];
  const allPillars = validGZ.flatMap(gz => [gz.charAt(0), gz.charAt(1)]);

  const tenGodList: TenGodSubtype[] = allPillars.flatMap(item => {
    try {
      // 천간인 경우
      if (["갑","을","병","정","무","기","경","신","임","계"].includes(item)) {
        return [mapStemToTenGodSub(dayStem, item)];
      }
      // 지지인 경우
      if (["자","축","인","묘","진","사","오","미","신","유","술","해"].includes(item)) {
        // 지지 자체 + 지장간까지 포함
        const tgBranch = mapBranchToTenGodSub(dayStem, item);
        const hidden = getHiddenStems(item).map(h => mapStemToTenGodSub(dayStem, h));
        return [tgBranch, ...hidden];
      }
      return [];
    } catch {
      return [];
    }
  });

  const hasAdjacency = (
    groupA: (TenGodSubtype | TwelveUnseong)[],
    groupB: (TenGodSubtype | TwelveUnseong)[]
  )  => {
    // 1️⃣ 기둥 단위로 자르기 (천간이 나오면 새 기둥 시작)
    const pillars: TenGodOrUnseong[][] = [];
    let current: TenGodOrUnseong[] = [];

    for (const tg of tenGodList) {
      if (
        ["비견","겁재","식신","상관","편재","정재","편관","정관","편인","정인"].includes(tg)
      ) {
        if (current.length > 0) pillars.push(current);
        current = [tg];
      } else {
        current.push(tg);
      }
    }
    if (current.length > 0) pillars.push(current);

    // 2️⃣ 같은 기둥 내부 인접
    for (const pillar of pillars) {
      for (let i = 0; i < pillar.length - 1; i++) {
        const a = pillar[i];
        const b = pillar[i + 1];
        if (
          (groupA.includes(a) && groupB.includes(b)) ||
          (groupB.includes(a) && groupA.includes(b))
        ) return true;
      }
    }

    // 3️⃣ 기둥 간 인접 (현재 기둥 전체 ↔ 다음 기둥 전체)
    for (let p = 0; p < pillars.length - 1; p++) {
      const A = pillars[p];
      const B = pillars[p + 1];
      for (const a of A) {
        for (const b of B) {
          if (
            (groupA.includes(a) && groupB.includes(b)) ||
            (groupB.includes(a) && groupA.includes(b))
          ) return true;
        }
      }
    }

    return false;
  };

  // 화상위재: 상관이 존재하고 재성과 상생 관계이며 관성이 약함
  const cntSiksang = cntSub("식신") + cntSub("상관");
  const cntSanggan = cntSub("상관");
  const cntJaesung = cntMain("재성");
  const cntGwan = cntMain("관성");

  // 인접 또는 흐름(식상→재성) 판정
  const hasAdjacencySR = hasAdjacency(["식신", "상관"], ["편재", "정재"]); // 위에서 만든 함수 재활용

  if (
    // (1) 상관 존재 (또는 식상이 2 이상)
    (cntSanggan >= 1 || cntSiksang >= 2) &&
    // (2) 재성 존재
    cntJaesung >= 1 &&
    // (3) 식상 세력이 재성보다 큼
    cntSiksang > cntJaesung &&
    // (4) 관성이 약하거나 없음
    cntGwan <= 1 &&
    // (5) 식상과 재성이 연결(혹은 인접)
    hasAdjacencySR
  ) {
    tags.add("화상위재");
  }

  const hasType = (target: TenGodSubtype[]) =>
    tenGodList.some(tg => target.includes(tg));

  const groupMap: Record<MainGroup, TenGodSubtype[]> = {
    비겁: ["비견", "겁재"],
    식상: ["식신", "상관"],
    재성: ["편재", "정재"],
    관성: ["편관", "정관"],
    인성: ["편인", "정인"],
  };

  // 재생관 / 재생관살: 재성과 관성이 동시에 강함
  if (
    hasType([...groupMap.재성]) &&
    hasType([...groupMap.관성]) &&
    hasAdjacency([...groupMap.재성], [...groupMap.관성])
  ) {
    const hasCheolSal = subList.includes("편관");
    tags.add(hasCheolSal ? "재생관살" : "재생관");
  }

  // 재인불애: 재성·인성 모두 강하고 균형(±1), 식상/관성은 과다하지 않음
  if (
    cntMain("재성") >= 2 &&
    cntMain("인성") >= 2 &&
    Math.abs(cntMain("재성") - cntMain("인성")) <= 1 &&
    cntMain("식상") <= 1 &&
    cntMain("관성") <= 1
  ) {
    tags.add("재인불애");
  }

  // 화겁/화록 위생·위재 (다수 + 상생 환경)
  const biCnt    = cntSub("비견");
  const geobCnt  = cntSub("겁재");
  const sikCnt   = cntSub("식신") + cntSub("상관");
  const jaeCnt   = cntSub("정재") + cntSub("편재");

  if (geobCnt >= 2 && sikCnt >= 1 && elCount["화"] + elCount["목"] >= 20) tags.add("화겁위생");
  if (geobCnt >= 2 && jaeCnt >= 1 && elCount["화"] + elCount["토"] >= 20) tags.add("화겁위재");
  
  const gwanCnt = cntMain("관성");

  // 화겁위재 예시
  if (
    geobCnt >= 2 &&
    jaeCnt >= 1 &&
    // 화 + 토 비중 충분
    elCount["화"] + elCount["토"] >= 20 &&
    // 변화 흐름: 겁재 인접 재성 혹은 인접 → 변화 가능성
    hasAdjacency(["겁재"], ["정재", "편재"]) &&
    // 관성 억제 조건
    gwanCnt <= 1
  ) {
    tags.add("화겁위재");
  }

  // 화록위재 예시
  if (
    biCnt >= 2 && 
    jaeCnt >= 1 &&
    elCount["화"] + elCount["토"] >= 20 &&
    // “록지(건록 지지)”와 재성 인접 혹은 변화 흐름
    hasAdjacency(["건록"], ["정재","편재"]) &&
    gwanCnt <= 1
  ) {
    tags.add("화록위재");
  }

  // 재명유기: 일간 오행 & 재성 오행이 둘 다 충분히 강함(≥20)

  function hasStemRootedInBranch(stem: string, branch: string): boolean {
    const stemEl = STEM_TO_ELEMENT[stem];
    const branchMainEl = BRANCH_MAIN_ELEMENT[branch];
    return stemEl === branchMainEl;
  }

  const gzList = [yGZ, mGZ, dGZ, hGZ].filter(Boolean);
  const dayBranch = dGZ.charAt(1);

  // 일간 득근 여부 (자기 일지 본기 기준)
  const dayHasRoot = hasStemRootedInBranch(dayStem, dayBranch);

  // 천간 중 재성 찾기
  const jaeStems = gzList
    .map(gz => gz.charAt(0))
    .filter(stem => {
      const tg = mapStemToTenGodSub(dayStem, stem);
      return tg === "편재" || tg === "정재";
    });

  // 재성 천간이 통근했는가?
  let jaeHasRoot = false;
  for (const gz of gzList) {
    const gan = gz.charAt(0);
    const branch = gz.charAt(1);

    if (jaeStems.includes(gan)) {
      if (hasStemRootedInBranch(gan, branch)) {
        jaeHasRoot = true;
        break;
      }
    }
  }

  // 최종 판정
  if (dayHasRoot && jaeHasRoot) {
    tags.add("재명유기");
  }

  // ──────────────────────────────────────────────────────
  // B) 과다/불균형·억제/설기류
  // ──────────────────────────────────────────────────────

  // 관살과다: 관성이 과잉(≥3)이고 비중도 절반 이상
  if (
    cntMain("관성") >= 3 &&
    cntMain("관성") >= 0.5 * (cntMain("비겁") + cntMain("식상") + cntMain("재성") + cntMain("인성"))
  ) {
    tags.add("관살과다");
  }

  // 인수과다: 인성 과잉(≥3)이고 비중도 절반 이상
  if (
    cntMain("인성") >= 3 &&
    cntMain("인성") >= 0.5 * (cntMain("비겁") + cntMain("식상") + cntMain("재성") + cntMain("관성"))
  ) {
    tags.add("인수과다");
  }

  // 인다관설: 인성이 관을 설(인성≥2 & 관성≥1)
  if (cntMain("인성") >= 2 && cntMain("관성") >= 1) {
    tags.add("인다관설");
  }

  // 재다신약: 재성 강(≥3) + 비겁+인성 약(≤1)
  if (cntMain("재성") >= 3 && (cntMain("비겁") + cntMain("인성")) <= 1) {
    tags.add("재다신약");
  }

  // 재자약살: 신강(비겁+인성≥2) + 편관=1 + 재성≥1
  const cheolsalCnt = cntSub("편관");
  if (
    (cntMain("비겁") + cntMain("인성")) >= 2 &&
    cheolsalCnt === 1 &&
    cntMain("재성") >= 1
  ) {
    tags.add("재자약살");
  }

  // 제살태과: 편관≥2 + (식상+인성)≥3 → 과제어
  if (cheolsalCnt >= 2 && (sikCnt + cntMain("인성")) >= 3) {
    tags.add("제살태과");
  }

  // 군비쟁재 / 군겁쟁재: 비겁(비견+겁재) 다수 + 재성 존재 + 비겁 > 재성
  const totalBigup = biCnt + geobCnt;

  // 군비쟁재
  if (
    (biCnt >= 2 || totalBigup >= 2) &&
    jaeCnt >= 1 &&
    totalBigup > jaeCnt // ✅ 재성보다 비겁이 더 많을 때만
  ) {
    tags.add("군비쟁재");
  }

  // 군겁쟁재
  if (
    geobCnt >= 2 &&
    jaeCnt >= 1 &&
    totalBigup > jaeCnt // ✅ 재성보다 비겁이 더 많을 때만
  ) {
    tags.add("군겁쟁재");
  }

  // ──────────────────────────────────────────────────────
  // C) 상관·관살 상호작용류
  // ──────────────────────────────────────────────────────
  const sanggwanCnt = cntSub("상관");
  const jeonggwanCnt = cntSub("정관");

  // 상관견관: 상관≥2 + 관성≥1
  if (sanggwanCnt >= 2 && (cheolsalCnt + jeonggwanCnt) >= 1) {
    tags.add("상관견관");
  }

  // 상관상진: 상관≥2 + 관성=0
  if (sanggwanCnt >= 2 && (cheolsalCnt + jeonggwanCnt) === 0) {
    tags.add("상관상진");
  }

  // 상관대살(양간): 양간일 + 상관≥2 + 편관≥1
  if (isYangDay && sanggwanCnt >= 2 && cheolsalCnt >= 1) {
    tags.add("상관대살");
  }
  // 상관합살(음간): 음간일 + 상관≥2 + 편관≥1
  if (!isYangDay && sanggwanCnt >= 2 && cheolsalCnt >= 1) {
    tags.add("상관합살");
  }

  // 식신봉효: 식신≥2 + 편인≥1
  if (cntSub("식신") >= 2 && cntSub("편인") >= 1) {
    tags.add("식신봉효");
  }

  // 관인쌍전: 관성≥2 + 인성≥2
  if (cntMain("관성") >= 2 && cntMain("인성") >= 2) {
    tags.add("관인쌍전");
  }

  // 양인합살: 월지 양인 + 편관≥1 + (일간 강=비겁+인성≥2)
  if (hasYangin && cheolsalCnt >= 1 && (cntMain("비겁") + cntMain("인성")) >= 2) {
    tags.add("양인합살");
  }

  const safeStemsOnly = [yGZ?.charAt(0), mGZ?.charAt(0), dGZ?.charAt(0), hGZ?.charAt(0)]
    .filter(Boolean); // ✅ undefined, 빈문자 제거

  const safeBranchOnly = [yGZ?.charAt(1), mGZ?.charAt(1), dGZ?.charAt(1), hGZ?.charAt(1)]
    .filter(Boolean); // ✅ undefined, 빈문자 제거


  // 십신 그룹 매핑
  type MainGroup = "비겁" | "식상" | "재성" | "관성" | "인성";
  type TenGodSubtype = "비견" | "겁재" | "식신" | "상관" | "편재" | "정재" | "편관" | "정관" | "편인" | "정인";

  // 천간 검사 (일간 제외)
  const hasTypeInStem = (main: keyof typeof groupMap) => {
    const stemsToCheck = safeStemsOnly.filter(s => s !== dayStem);
    return stemsToCheck.some(s => {
      try {
        const tg = mapStemToTenGodSub(dayStem, s!);
        return groupMap[main].includes(tg);
      } catch {
        return false;
      }
    });
  };

  // 지지 표면 검사
  const hasTypeInBranch = (main: keyof typeof groupMap) =>
    safeBranchOnly.some(b => {
      try {
        const branchElement = mapBranchToElement(b!);
        const tg = elementToTenGod(dayStem, branchElement);
        return groupMap[main].includes(tg);
      } catch {
        return false;
      }
    });

  // 지장간 검사
  const hasTypeInHidden = (main: keyof typeof groupMap) =>
    safeBranchOnly.some(b => {
      try {
        const hiddenStems = getHiddenStems(b!).filter(h => h !== dayStem);
        return hiddenStems.some(h => {
          const tg = mapStemToTenGodSub(dayStem, h);
          return groupMap[main].includes(tg);
        });
      } catch {
        return false;
      }
    });

  // 전체 검사
  (["비겁", "식상", "재성", "관성", "인성"] as const).forEach(main => {
    const existStem = hasTypeInStem(main);
    const existBranch = hasTypeInBranch(main);
    const existHidden = hasTypeInHidden(main);

    // 1️⃣ 완전 없음 → 천지무
    if (!existStem && !existBranch && !existHidden) {
      tags.add(`천지무${main}`);
    }
    // 2️⃣ 천간X + 지지X + 지장간O → 무
    else if (!existStem && !existBranch && existHidden) {
      tags.add(`무${main}`);
    }
  });

  return Array.from(tags);

}
