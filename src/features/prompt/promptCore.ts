// features/AnalysisReport/promptCore.ts
import type { MyeongSik } from "@/shared/lib/storage";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import type { Element } from "@/features/AnalysisReport/utils/types";

const DEBUG = false;
export const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/* ===== 음력 → 양력 보정 ===== */
export function ensureSolarBirthDay(data: MyeongSik): MyeongSik {
  const any: Record<string, unknown> = data as unknown as Record<string, unknown>;
  const birthDay = typeof any.birthDay === "string" ? any.birthDay : "";
  const calType =
    typeof any.calendarType === "string" ? (any.calendarType as string) : "solar";
  if (birthDay.length < 8) return data;

  const y = Number(birthDay.slice(0, 4));
  const m = Number(birthDay.slice(4, 6));
  const d = Number(birthDay.slice(6, 8));

  if (calType === "lunar") {
    try {
      const solarDate = lunarToSolarStrict(y, m, d, 0, 0);
      const newBirthDay = `${solarDate.getFullYear()}${pad2(
        solarDate.getMonth() + 1,
      )}${pad2(solarDate.getDate())}`;
      const out: MyeongSik = {
        ...data,
        birthDay: newBirthDay,
        calendarType: "solar",
      } as MyeongSik;
      if (DEBUG)
        console.debug("[IlwoonCalendar] lunar→solar:", { y, m, d, newBirthDay });
      return out;
    } catch {
      return data;
    }
  }
  return data;
}

/* ===== 간지/오행 맵 ===== */

export const STEM_H2K: Record<string, string> = {
  甲: "갑",
  乙: "을",
  丙: "병",
  丁: "정",
  戊: "무",
  己: "기",
  庚: "경",
  辛: "신",
  壬: "임",
  癸: "계",
};

export const BRANCH_H2K: Record<string, string> = {
  子: "자",
  丑: "축",
  寅: "인",
  卯: "묘",
  辰: "진",
  巳: "사",
  午: "오",
  未: "미",
  申: "신",
  酉: "유",
  戌: "술",
  亥: "해",
};

export const STEM_TO_ELEMENT: Record<string, Element> = {
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

export const BRANCH_MAIN_STEM: Record<string, string> = {
  자: "계",
  축: "기",
  인: "갑",
  묘: "을",
  진: "무",
  사: "병",
  오: "정",
  미: "기",
  신: "경",
  유: "신",
  술: "무",
  해: "임",
  子: "계",
  丑: "기",
  寅: "갑",
  卯: "을",
  辰: "무",
  巳: "병",
  午: "정",
  未: "기",
  申: "경",
  酉: "신",
  戌: "무",
  亥: "임",
};

export const YANG_STEMS = ["갑", "병", "무", "경", "임"] as const;

export function isYang(stemKo: string): boolean {
  return (YANG_STEMS as readonly string[]).includes(stemKo);
}

export const SHENG_NEXT: Record<Element, Element> = {
  목: "화",
  화: "토",
  토: "금",
  금: "수",
  수: "목",
};

export const KE: Record<Element, Element> = {
  목: "토",
  화: "금",
  토: "수",
  금: "목",
  수: "화",
};

export const KE_REV: Record<Element, Element> = {
  토: "목",
  금: "화",
  수: "토",
  목: "금",
  화: "수",
};

export const SHENG_PREV: Record<Element, Element> = {
  화: "목",
  토: "화",
  금: "토",
  수: "금",
  목: "수",
};

/** 간지/천간/지지 비슷한 토큰을 천간 한글(갑~계)로 정규화 */
export function normalizeStemLike(token: string): string | null {
  if (!token) return null;
  const s = token.trim();

  // 이미 한글 천간
  if (["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"].includes(s)) {
    return s;
  }

  // 한자 천간 → 한글
  if (STEM_H2K[s]) return STEM_H2K[s];

  // 한글 지지 → 본기 천간
  if (["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"].includes(s)) {
    return BRANCH_MAIN_STEM[s] ?? null;
  }

  // 한자 지지 → 본기 천간
  if (BRANCH_H2K[s]) return BRANCH_MAIN_STEM[BRANCH_H2K[s]] ?? null;

  // 첫 글자만 간주
  const first = s.charAt(0);

  if (STEM_H2K[first]) return STEM_H2K[first];
  if (["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"].includes(first)) {
    return first;
  }
  if (BRANCH_H2K[first]) return BRANCH_MAIN_STEM[BRANCH_H2K[first]] ?? null;
  if (["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해"].includes(first)) {
    return BRANCH_MAIN_STEM[first] ?? null;
  }
  return null;
}

/* ===== 십신 소분류 매핑 ===== */

export type TenGodSubtype =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "정재"
  | "편재"
  | "정관"
  | "편관"
  | "정인"
  | "편인";

export function mapStemToTenGodSub(
  dayStemKo: string,
  targetStemKo: string,
): TenGodSubtype {
  const dayEl = STEM_TO_ELEMENT[dayStemKo as keyof typeof STEM_TO_ELEMENT];
  const targetEl = STEM_TO_ELEMENT[targetStemKo as keyof typeof STEM_TO_ELEMENT];
  if (!dayEl || !targetEl) return "비견";

  let main: TenGodSubtype;
  if (targetEl === dayEl) main = "비견";
  else if (targetEl === SHENG_NEXT[dayEl]) main = "식신";
  else if (targetEl === KE[dayEl]) main = "편재";
  else if (targetEl === KE_REV[dayEl]) main = "편관";
  else if (targetEl === SHENG_PREV[dayEl]) main = "편인";
  else main = "비견";

  const same = isYang(dayStemKo) === isYang(targetStemKo);
  switch (main) {
    case "비견":
      return same ? "비견" : "겁재";
    case "식신":
      return same ? "식신" : "상관";
    case "편재":
      return same ? "편재" : "정재";
    case "편관":
      return same ? "편관" : "정관";
    case "편인":
      return same ? "편인" : "정인";
  }
}

/* ===== 정규화 유틸 ===== */

export function normalizeTo100(
  obj: Record<string, number>,
): Record<string, number> {
  const entries = Object.entries(obj) as [string, number][];
  const sum = entries.reduce((a, [, v]) => a + (v > 0 ? v : 0), 0);
  if (sum <= 0)
    return Object.fromEntries(entries.map(([k]) => [k, 0])) as Record<
      string,
      number
    >;

  const raw = entries.map(([k, v]) => [k, (v > 0 ? v : 0) * 100 / sum] as const);
  const floored = raw.map(([k, x]) => [k, Math.floor(x)] as const);
  let used = floored.reduce((a, [, x]) => a + x, 0);

  const rema = raw
    .map(([k, x]) => [k, x - Math.floor(x)] as const)
    .sort((a, b) => b[1] - a[1]);

  const out: Record<string, number> = Object.fromEntries(
    floored.map(([k, x]) => [k, x]),
  ) as Record<string, number>;

  let i = 0;
  while (used < 100 && i < rema.length) {
    out[rema[i][0]] += 1;
    used += 1;
    i += 1;
  }

  return out;
}

/** per-stem 분포를 천간 bare맵으로 변환 */
export function toBareStemMap(
  input: Record<string, number> | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (v <= 0) continue;
    const stemKo = normalizeStemLike(k);
    if (!stemKo) continue;
    out[stemKo] = (out[stemKo] ?? 0) + v;
  }
  return out;
}

/** "갑자" 같은 간지 문자열에서 [천간, 지지→본기천간] */
export function stemsFromGZ(gz: string): string[] {
  if (!gz) return [];
  const s = normalizeStemLike(gz.charAt(0)); // 천간
  const b = normalizeStemLike(gz.charAt(1)); // 지지→본기천간
  return [s, b].filter(Boolean) as string[];
}

/** 간지 하나를 bare 천간맵으로 */
export function toBareFromGZ(gz: string): Record<string, number> {
  const stems = stemsFromGZ(gz);
  const out: Record<string, number> = {};
  for (const s of stems) out[s] = (out[s] ?? 0) + 1;
  return out;
}

/** 오행 대분류로 변환 (추가 normalize 없음) */
export function elementToTenGod(dayEl: Element, targetEl: Element): string {
  if (targetEl === dayEl) return "비겁";
  if (targetEl === SHENG_NEXT[dayEl]) return "식상";
  if (targetEl === KE[dayEl]) return "재성";
  if (targetEl === KE_REV[dayEl]) return "관성";
  if (targetEl === SHENG_PREV[dayEl]) return "인성";
  return "";
}

/* ─────────────────────────────────────────────
 * 납음오행 매핑 (60갑자)
 * ──────────────────────────────────────────── */

export type NabeumInfo = {
  name: string;
  element: Element;
  brief: string;
  keywords: string;
};

export const NAEUM_MAP: Record<string, NabeumInfo> = {
  // 1
  갑자: { name: "해중금", element: "금", brief: "바다 속의 금속", keywords: "잠재·매몰·드러나기 어려움" },
  을축: { name: "해중금", element: "금", brief: "바다 속의 금속", keywords: "잠재·매몰·드러나기 어려움" },
  병인: { name: "노중화", element: "화", brief: "화로 속 불", keywords: "제련·내열·지속적 연소" },
  정묘: { name: "노중화", element: "화", brief: "화로 속 불", keywords: "제련·내열·지속적 연소" },
  무진: { name: "대림목", element: "목", brief: "큰 숲의 나무", keywords: "울창·성장력·보호림" },
  기사: { name: "대림목", element: "목", brief: "큰 숲의 나무", keywords: "울창·성장력·보호림" },
  경오: { name: "노방토", element: "토", brief: "길가의 흙", keywords: "노출·부서짐·실용/교통" },
  신미: { name: "노방토", element: "토", brief: "길가의 흙", keywords: "노출·부서짐·실용/교통" },
  임신: { name: "검봉금", element: "금", brief: "칼끝의 금", keywords: "예리함·강경·절단력" },
  계유: { name: "검봉금", element: "금", brief: "칼끝의 금", keywords: "예리함·강경·절단력" },

  // 2
  갑술: { name: "산두화", element: "화", brief: "산머리의 불(석양빛)", keywords: "높이·표면·불광" },
  을해: { name: "산두화", element: "화", brief: "산머리의 불(석양빛)", keywords: "높이·표면·불광" },
  병자: { name: "간하수", element: "수", brief: "골짜기 아래 물", keywords: "계류·낙수·유연한 흐름" },
  정축: { name: "간하수", element: "수", brief: "골짜기 아래 물", keywords: "계류·낙수·유연한 흐름" },
  무인: { name: "성두토", element: "토", brief: "성곽의 흙", keywords: "다져짐·성벽·방어/지지" },
  기묘: { name: "성두토", element: "토", brief: "성곽의 흙", keywords: "다져짐·성벽·방어/지지" },
  경진: { name: "백납금", element: "금", brief: "흰 밀랍 같은 금", keywords: "미완·연성·가공 전 금속" },
  신사: { name: "백납금", element: "금", brief: "흰 밀랍 같은 금", keywords: "미완·연성·가공 전 금속" },
  임오: { name: "양류목", element: "목", brief: "버드나무", keywords: "유연·수분·여름쇠약" },
  계미: { name: "양류목", element: "목", brief: "버드나무", keywords: "유연·수분·여름쇠약" },

  // 3
  갑신: { name: "천중수", element: "수", brief: "샘/우물의 물", keywords: "정수·원천·지하수" },
  을유: { name: "천중수", element: "수", brief: "샘/우물의 물", keywords: "정수·원천·지하수" },
  병술: { name: "옥상토", element: "토", brief: "지붕 위의 흙", keywords: "높이 올린 토·마감/기단" },
  정해: { name: "옥상토", element: "토", brief: "지붕 위의 흙", keywords: "높이 올린 토·마감/기단" },
  무자: { name: "벽력화", element: "화", brief: "번개불", keywords: "돌발·폭발·전기/천뢰" },
  기축: { name: "벽력화", element: "화", brief: "번개불", keywords: "돌발·폭발·전기/천뢰" },
  경인: { name: "송백목", element: "목", brief: "소나무·측백", keywords: "상록·한서견딤·절개" },
  신묘: { name: "송백목", element: "목", brief: "소나무·측백", keywords: "상록·한서견딤·절개" },
  임진: { name: "장류수", element: "수", brief: "길게 흐르는 물", keywords: "강줄기·연속성·지속흐름" },
  계사: { name: "장류수", element: "수", brief: "길게 흐르는 물", keywords: "강줄기·연속성·지속흐름" },

  // 4
  갑오: { name: "사중금", element: "금", brief: "모랫속의 금", keywords: "사금·선별/세척·정련 필요" },
  을미: { name: "사중금", element: "금", brief: "모랫속의 금", keywords: "사금·선별/세척·정련 필요" },
  병신: { name: "산하화", element: "화", brief: "산 아래의 불", keywords: "그늘·야영불·잔불/은화" },
  정유: { name: "산하화", element: "화", brief: "산 아래의 불", keywords: "그늘·야영불·잔불/은화" },
  무술: { name: "평지목", element: "목", brief: "평야의 나무", keywords: "뿌리깊음·안정적 성장" },
  기해: { name: "평지목", element: "목", brief: "평야의 나무", keywords: "뿌리깊음·안정적 성장" },
  경자: { name: "벽상토", element: "토", brief: "벽 위의 흙(회벽)", keywords: "미장·표면·가림/보호" },
  신축: { name: "벽상토", element: "토", brief: "벽 위의 흙(회벽)", keywords: "미장·표면·가림/보호" },
  임인: { name: "금박금", element: "금", brief: "금박(금박잎)", keywords: "얇음·장식·겉보기 화려" },
  계묘: { name: "금박금", element: "금", brief: "금박(금박잎)", keywords: "얇음·장식·겉보기 화려" },

  // 5
  갑진: { name: "복등화", element: "화", brief: "등불(덮인 등화)", keywords: "실내등·온화·지속 조명" },
  을사: { name: "복등화", element: "화", brief: "등불(덮인 등화)", keywords: "실내등·온화·지속 조명" },
  병오: { name: "천하수", element: "수", brief: "하늘의 강(은하수)", keywords: "높은 곳의 물·냉청" },
  정미: { name: "천하수", element: "수", brief: "하늘의 강(은하수)", keywords: "높은 곳의 물·냉청" },
  무신: { name: "대역토", element: "토", brief: "역참/도로의 토", keywords: "평탄·교통망·넓고 두터움" },
  기유: { name: "대역토", element: "토", brief: "역참/도로의 토", keywords: "평탄·교통망·넓고 두터움" },
  경술: { name: "채천금", element: "금", brief: "비녀·팔찌 금", keywords: "장식용·정교·연약/귀금" },
  신해: { name: "채천금", element: "금", brief: "비녀·팔찌 금", keywords: "장식용·정교·연약/귀금" },
  임자: { name: "상자목", element: "목", brief: "뽕·柘나무", keywords: "생활·양잠·실용·완만성장" },
  계축: { name: "상자목", element: "목", brief: "뽕·柘나무", keywords: "생활·양잠·실용·완만성장" },

  // 6
  갑인: { name: "대계수", element: "수", brief: "큰 시내의 물", keywords: "골짜기·여울·산간 급류" },
  을묘: { name: "대계수", element: "수", brief: "큰 시내의 물", keywords: "골짜기·여울·산간 급류" },
  병진: { name: "사중토", element: "토", brief: "모래흙", keywords: "느슨·성형 필요·사토" },
  정사: { name: "사중토", element: "토", brief: "모래흙", keywords: "느슨·성형 필요·사토" },
  무오: { name: "천상화", element: "화", brief: "하늘의 불(태양광)", keywords: "직사광·정오·극양열" },
  기미: { name: "천상화", element: "화", brief: "하늘의 불(태양광)", keywords: "직사광·정오·극양열" },
  경신: { name: "석류목", element: "목", brief: "석류나무", keywords: "화과병개·화려" },
  신유: { name: "석류목", element: "목", brief: "석류나무", keywords: "화과병개·화려" },
  임술: { name: "대해수", element: "수", brief: "큰 바다의 물", keywords: "광활·심연·포섭/변동" },
  계해: { name: "대해수", element: "수", brief: "큰 바다의 물", keywords: "광활·심연·포섭/변동" },
};

/** GZ를 한글 ‘갑자’처럼 정규화 */
export function toKoGZ(gz: string): string {
  if (!gz || gz.length < 2) return gz;
  const sRaw = gz.charAt(0);
  const bRaw = gz.charAt(1);
  const s = STEM_H2K[sRaw] ?? sRaw;
  const b = BRANCH_H2K[bRaw] ?? bRaw;
  return `${s}${b}`;
}

export function getNabeum(
  gz: string,
): (NabeumInfo & { code: string }) | null {
  const ko = toKoGZ(gz);
  const info = NAEUM_MAP[ko];
  return info ? { ...info, code: ko } : null;
}
