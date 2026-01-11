// features/AnalysisReport/logic/gyeokguk/rules.ts
import type { Element } from "@/analysisReport/calc/logic/gyeokguk/types";
import { type StemKo } from "@/analysisReport/calc/logic/gyeokguk/utils";
import { HiddenStemMode } from "@/saju/input/useSajuSettingsStore";
import type { KoBranch } from "@/analysisReport/calc/logic/relations/groups"

/* =========================
 * 기본 오행 매핑
 * ========================= */
export const STEM_TO_ELEMENT: Record<string, Element> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토",
  기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
};

export const BRANCH_MAIN_ELEMENT: Record<string, Element> = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
  오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};

export const BRANCH_MAIN_STEM: Record<string, string> = {
  자: "계", 축: "기", 인: "갑", 묘: "을", 진: "무", 사: "병",
  오: "정", 미: "기", 신: "경", 유: "신", 술: "무", 해: "임",
};

/* =========================
 * 생극 관계
 * ========================= */
export const SHENG_NEXT: Record<Element, Element> = {
  목: "화", 화: "토", 토: "금", 금: "수", 수: "목",
};

export const SHENG_PREV: Record<Element, Element> = {
  화: "목", 토: "화", 금: "토", 수: "금", 목: "수",
};

export const KE: Record<Element, Element> = {
  목: "토", 화: "금", 토: "수", 금: "목", 수: "화",
};

export const KE_REV: Record<Element, Element> = {
  토: "목", 금: "화", 수: "토", 목: "금", 화: "수",
};

/* =========================
 * 지장간 분포
 * ========================= */
export const DIST_MAP: Record<
  string,
  {
    초기?: { stem: string; w: number };
    중기?: { stem: string; w: number };
    정기: { stem: string; w: number };
  }
> = {
  자: { 초기: { stem: "임", w: 10 }, 정기: { stem: "계", w: 20 } },
  축: { 초기: { stem: "계", w: 9 }, 중기: { stem: "신", w: 3 }, 정기: { stem: "기", w: 18 } },
  인: { 초기: { stem: "무", w: 7 }, 중기: { stem: "병", w: 7 }, 정기: { stem: "갑", w: 16 } },
  묘: { 초기: { stem: "갑", w: 10 }, 정기: { stem: "을", w: 20 } },
  진: { 초기: { stem: "을", w: 9 }, 중기: { stem: "계", w: 3 }, 정기: { stem: "무", w: 18 } },
  사: { 초기: { stem: "무", w: 7 }, 중기: { stem: "경", w: 7 }, 정기: { stem: "병", w: 16 } },
  오: { 초기: { stem: "병", w: 10 }, 중기: { stem: "기", w: 9 }, 정기: { stem: "정", w: 11 } },
  미: { 초기: { stem: "정", w: 9 }, 중기: { stem: "을", w: 3 }, 정기: { stem: "기", w: 18 } },
  신: { 초기: { stem: "무", w: 7 }, 중기: { stem: "임", w: 7 }, 정기: { stem: "경", w: 16 } },
  유: { 초기: { stem: "경", w: 10 }, 정기: { stem: "신", w: 20 } },
  술: { 초기: { stem: "신", w: 9 }, 중기: { stem: "정", w: 3 }, 정기: { stem: "무", w: 18 } },
  해: { 초기: { stem: "무", w: 7 }, 중기: { stem: "갑", w: 7 }, 정기: { stem: "임", w: 16 } },
};

export const DIST_MAP_HGC: Record<
  string,
  {
    초기?: { stem: string; w: number };
    중기?: { stem: string; w: number };
    정기: { stem: string; w: number };  
  }
  > = {
     자: { 정기: { stem: "계", w: 100 } }, 
      축: { 초기: { stem: "계", w: 20 }, 중기: { stem: "신", w: 30 }, 정기: { stem: "기", w: 50 } }, 
      인: { 중기: { stem: "병", w: 30 }, 정기: { stem: "갑", w: 70 } }, 
      묘: { 정기: { stem: "을", w: 100 } }, 
      진: { 초기: { stem: "을", w: 20 }, 중기: { stem: "계", w: 30 }, 정기: { stem: "무", w: 50 } }, 
      사: { 중기: { stem: "경", w: 30 }, 정기: { stem: "병", w: 70 } }, 
      오: { 정기: { stem: "정", w: 100 } }, 
      미: { 초기: { stem: "정", w: 20 }, 중기: { stem: "을", w: 30 }, 정기: { stem: "기", w: 50 } }, 
      신: { 중기: { stem: "임", w: 30 }, 정기: { stem: "경", w: 70 } }, 
      유: { 정기: { stem: "신", w: 100 } }, 
      술: { 초기: { stem: "신", w: 20 }, 중기: { stem: "정", w: 30 }, 정기: { stem: "무", w: 50 } }, 
      해: { 중기: { stem: "갑", w: 30 }, 정기: { stem: "임", w: 70 } }, 
};

export type StemW = { stem: string; w: number };

export type BranchDist = {
  초기?: StemW;
  중기?: StemW;
  정기: StemW;
};

export function isBranchKey(v: string): v is KoBranch {
  return (
    v === "자" || v === "축" || v === "인" || v === "묘" || v === "진" || v === "사" ||
    v === "오" || v === "미" || v === "신" || v === "유" || v === "술" || v === "해"
  );
}

export function coerceHiddenStemMode(v: unknown): HiddenStemMode {
  const s = typeof v === "string" ? v.trim().toLowerCase() : "";
  if (s === "hgc") return "hgc";
  return "classic";
}

export function getBranchDistMap(mode: HiddenStemMode): Record<KoBranch, BranchDist> {
  return mode === "hgc" ? DIST_MAP_HGC : DIST_MAP;
}


/* =========================
 * 절입 전후 12일
 * ========================= */
export function isWithin12DaysOfJie(
  date: Date,
  jie?: { date: string } | null
): boolean {
  if (!jie?.date) return false;
  const start = new Date(jie.date);
  const diffDays = Math.floor(
    (date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
  return diffDays <= 12;
}

/* =========================
 * 삼합
 * ========================= */
export const SAMHAP_SETS: Record<string, [string, string, string]> = {
  // 수국
  신: ["신", "자", "진"],
  자: ["신", "자", "진"],
  진: ["신", "자", "진"],

  // 목국
  해: ["해", "묘", "미"],
  묘: ["해", "묘", "미"],
  미: ["해", "묘", "미"],

  // 화국
  인: ["인", "오", "술"],
  오: ["인", "오", "술"],
  술: ["인", "오", "술"],

  // 금국
  사: ["사", "유", "축"],
  유: ["사", "유", "축"],
  축: ["사", "유", "축"],
};

/* =========================
 * 록 / 양인
 * ========================= */
export const LOK_BRANCH: Record<string, string> = {
  갑: "인", 을: "묘", 병: "사", 정: "오",
  무: "오", 기: "사", 경: "신", 신: "유",
  임: "해", 계: "자",
};

export const YANGIN_MAP: Record<string, string> = {
  갑: "묘", 병: "오", 무: "오", 경: "유", 임: "자",
};

export const WOLGEOP_MAP: Record<string, string> = {
  을: "인", 정: "사", 신: "신", 계: "해",
};

/* =========================
 * 간합
 * ========================= */
export const STEM_COMB_PAIRS: Array<{ a: string; b: string; to: Element }> = [
  { a: "갑", b: "기", to: "토" },
  { a: "을", b: "경", to: "금" },
  { a: "병", b: "신", to: "수" },
  { a: "정", b: "임", to: "목" },
  { a: "무", b: "계", to: "화" },
];

/* =========================
 * 건록 / 양인 판정용
 * ========================= */
export const GEONLOK_SET: Array<[string, string]> = [
  ["을", "묘"], ["병", "사"], ["정", "오"], ["경", "신"],
  ["임", "해"], ["계", "자"], ["무", "사"], ["기", "오"],
];

export const STEMS = ["갑","을","병","정","무","기","경","신","임","계"] as const;
export const BRANCHES = ["자","축","인","묘","진","사","오","미","신","유","술","해"] as const;

export const STEM_IS_YANG: Record<typeof STEMS[number], boolean> = {
  갑: true, 을: false, 병: true, 정: false, 무: true,
  기: false, 경: true, 신: false, 임: true, 계: false,
};

export function isYangStem(stem: string): boolean {
  return Boolean((STEM_IS_YANG as Record<string, boolean>)[stem]);
}

export function isGeonlok(dayStem: string, monthBranch: string): boolean {
  return GEONLOK_SET.some(([s, b]) => s === dayStem && b === monthBranch);
}

export function isYangin(dayStem: string, monthBranch: string): boolean {
  return isYangStem(dayStem) && YANGIN_MAP[dayStem] === monthBranch;
}

/* =========================
 * 정규식
 * ========================= */
export const STEMS_REGEX =
  /[갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸]/g;

/* =========================
 * 물상 키 유틸
 * ========================= */
export const pairKey = (a: StemKo, b: StemKo) => `${a}${b}`;
export const triKey  = (a: StemKo, b: StemKo, c: StemKo) => `${a}${b}${c}`;

/* =========================
 * 월지 → 절기 기준 매핑
 * =========================
 * 격국에서 월령/절입 판정용
 */
export const BRANCH_TO_TERM: Record<string, string[]> = {
  자: ["대설", "동지"],
  축: ["소한", "대한"],
  인: ["입춘", "우수"],
  묘: ["경칩", "춘분"],
  진: ["청명", "곡우"],
  사: ["입하", "소만"],
  오: ["망종", "하지"],
  미: ["소서", "대서"],
  신: ["입추", "처서"],
  유: ["백로", "추분"],
  술: ["한로", "상강"],
  해: ["입동", "소설"],
};

/* =========================
 * 물상 태그 (2간 / 3간)
 * ========================= */

export const MULSANG_PAIR_TAGS: Record<string, string[]> = {
  // 갑
  [pairKey("갑","갑")]: ["쌍목위림"],
  [pairKey("갑","을")]: ["등라계갑","등라반목"],
  [pairKey("갑","병")]: ["목화통명","청룡반수"],
  [pairKey("갑","정")]: ["유신유화"],
  [pairKey("갑","무")]: ["독산고목"],
  [pairKey("갑","기")]: ["양토육목"],
  [pairKey("갑","경")]: ["동량지목","흔목위재"],
  [pairKey("갑","신")]: ["목곤쇄편"],
  [pairKey("갑","임")]: ["횡당유영"],
  [pairKey("갑","계")]: ["수근로수"],

  // 을
  [pairKey("을","을")]: ["복음잡초"],
  [pairKey("을","병")]: ["염양려화"],
  [pairKey("을","정")]: ["화소초원"],
  [pairKey("을","무")]: ["선화명병"],
  [pairKey("을","기")]: ["양토배화"],
  [pairKey("을","경")]: ["백호창광"],
  [pairKey("을","신")]: ["이전최화"],
  [pairKey("을","임")]: ["출수부용"],
  [pairKey("을","계")]: ["청초조로"],

  // 병
  [pairKey("병","병")]: ["복음훙광"],
  [pairKey("병","정")]: ["삼기순수"],
  [pairKey("병","무")]: ["월기득사"],
  [pairKey("병","기")]: ["대지보조"],
  [pairKey("병","경")]: ["형옥입백"],
  [pairKey("병","신")]: ["일월상회"],
  [pairKey("병","임")]: ["강휘상영"],
  [pairKey("병","계")]: ["흑운차일"],

  // 정
  [pairKey("정","정")]: ["양화위염"],
  [pairKey("정","무")]: ["유화유로"],
  [pairKey("정","기")]: ["성타구진"],
  [pairKey("정","경")]: ["화련진금"],
  [pairKey("정","신")]: ["소훼주옥"],
  [pairKey("정","임")]: ["성기득사"],
  [pairKey("정","계")]: ["주작투강"],

  // 무
  [pairKey("무","무")]: ["복음준산"],
  [pairKey("무","기")]: ["물이유취"],
  [pairKey("무","경")]: ["조주위학"],
  [pairKey("무","신")]: ["반음설기"],
  [pairKey("무","임")]: ["산명수수"],
  [pairKey("무","계")]: ["암석침식"],

  // 기
  [pairKey("기","기")]: ["복음연약"],
  [pairKey("기","경")]: ["전도형격"],
  [pairKey("기","신")]: ["습니오옥"],
  [pairKey("기","임")]: ["기토탁임"],
  [pairKey("기","계")]: ["옥토위생"],

  // 경
  [pairKey("경","경")]: ["양금상살"],
  [pairKey("경","신")]: ["철추쇄옥"],
  [pairKey("경","임")]: ["금수쌍청","득수이청"],
  [pairKey("경","계")]: ["보도사로"],

  // 신
  [pairKey("신","신")]: ["복음상극"],
  [pairKey("신","임")]: ["도세주옥"],
  [pairKey("신","계")]: ["천뢰화개"],

  // 임
  [pairKey("임","임")]: ["왕양대해"],
  [pairKey("임","계")]: ["충천분지"],

  // 계
  [pairKey("계","계")]: ["복음천라"],
};

export const MULSANG_TRI_TAGS: Record<string, string[]> = {
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

  // 특수 삼간
  [triKey("경","갑","정")]: ["벽갑인정","벽갑인화"],
};

/* =========================
 * 월지 양인 위치 (일간 기준)
 * ========================= */
export const YANGIN_MONTH_BY_DAY_STEM: Record<
  string,
  string
> = {
  갑: "묘", // 甲刃在卯
  을: "인", // 乙刃在寅
  병: "오", // 丙刃在午
  정: "사", // 丁刃在巳
  무: "오", // 戊刃在午
  기: "사", // 己刃在巳
  경: "유", // 庚刃在酉
  신: "신", // 辛刃在申
  임: "자", // 壬刃在子
  계: "해", // 癸刃在亥
};
