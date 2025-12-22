import type { Element } from "@/features/AnalysisReport/utils/types";
import { BRANCH_H2K, STEM_H2K } from "@/features/prompt/calc/ganjiMaps";

type NabeumInfo = {
  name: string;
  element: Element;
  brief: string;
  keywords: string;
};

export type { NabeumInfo };

export const NAEUM_MAP: Record<string, NabeumInfo> = {
  // 1
  갑자: { name: "해중금", element: "금", brief: "바다 속의 금속", keywords: "재물·매몰·숨겨진 금속" },
  을축: { name: "해중금", element: "금", brief: "바다 속의 금속", keywords: "재물·매몰·숨겨진 금속" },
  병인: { name: "노중화", element: "화", brief: "화로 속의 불", keywords: "훈련·단련·지속적 연소" },
  정묘: { name: "노중화", element: "화", brief: "화로 속의 불", keywords: "훈련·단련·지속적 연소" },
  무진: { name: "대림목", element: "목", brief: "큰 숲의 나무", keywords: "성장·확장성·보호림" },
  기사: { name: "대림목", element: "목", brief: "큰 숲의 나무", keywords: "성장·확장성·보호림" },
  경오: { name: "노방토", element: "토", brief: "길가의 흙", keywords: "노출·부식·교통" },
  신미: { name: "노방토", element: "토", brief: "길가의 흙", keywords: "노출·부식·교통" },
  임신: { name: "검봉금", element: "금", brief: "칼끝의 금", keywords: "절단력·강경·예리함" },
  계유: { name: "검봉금", element: "금", brief: "칼끝의 금", keywords: "절단력·강경·예리함" },

  // 2
  갑술: { name: "산두화", element: "화", brief: "산머리의 불빛", keywords: "길잡이·조명·봉화" },
  을해: { name: "산두화", element: "화", brief: "산머리의 불빛", keywords: "길잡이·조명·봉화" },
  병자: { name: "간하수", element: "수", brief: "골짜기를 흐르는 물", keywords: "계류·청수·선명함" },
  정축: { name: "간하수", element: "수", brief: "골짜기를 흐르는 물", keywords: "계류·청수·선명함" },
  무인: { name: "성두토", element: "토", brief: "성벽 위의 흙", keywords: "견고함·보호·방어" },
  기묘: { name: "성두토", element: "토", brief: "성벽 위의 흙", keywords: "견고함·보호·방어" },
  경진: { name: "백납금", element: "금", brief: "쇳물 같은 금", keywords: "미완·유연성·가공용 금속" },
  신사: { name: "백납금", element: "금", brief: "쇳물 같은 금", keywords: "미완·유연성·가공용 금속" },
  임오: { name: "양류목", element: "목", brief: "버드나무", keywords: "인연·유연·감성" },
  계미: { name: "양류목", element: "목", brief: "버드나무", keywords: "인연·유연·감성" },

  // 3
  갑신: { name: "천중수", element: "수", brief: "하늘물(빗물)", keywords: "청수·은혜·지혜" },
  을유: { name: "천중수", element: "수", brief: "하늘물(빗물)", keywords: "청수·은혜·지혜" },
  병술: { name: "옥상토", element: "토", brief: "지붕의 흙", keywords: "기반·안정·지탱" },
  정해: { name: "옥상토", element: "토", brief: "지붕의 흙", keywords: "기반·안정·지탱" },
  무자: { name: "벽력화", element: "화", brief: "번개불", keywords: "폭발·전광·전기/천둥" },
  기축: { name: "벽력화", element: "화", brief: "번개불", keywords: "폭발·전광·전기/천둥" },
  경인: { name: "송백목", element: "목", brief: "큰 나무·침상", keywords: "장수·정직·강한 의지" },
  신묘: { name: "송백목", element: "목", brief: "큰 나무·침상", keywords: "장수·정직·강한 의지" },
  임진: { name: "장류수", element: "수", brief: "길게 흐르는 물", keywords: "강줄기·연속성·지속적 흐름" },
  계사: { name: "장류수", element: "수", brief: "길게 흐르는 물", keywords: "강줄기·연속성·지속적 흐름" },

  // 4
  갑오: { name: "사중금", element: "금", brief: "모래속의 금", keywords: "재금·보석/귀금·잔량" },
  을미: { name: "사중금", element: "금", brief: "모래속의 금", keywords: "재금·보석/귀금·잔량" },
  병신: { name: "산하수", element: "수", brief: "골짜기물", keywords: "그늘·암흑·숨어있음" },
  정유: { name: "산하수", element: "수", brief: "골짜기물", keywords: "그늘·암흑·숨어있음" },
  무술: { name: "평지목", element: "목", brief: "평야의 나무", keywords: "근성·정직·발전" },
  기해: { name: "평지목", element: "목", brief: "평야의 나무", keywords: "근성·정직·발전" },
  경자: { name: "벽상토", element: "토", brief: "벽흙(벽돌)", keywords: "미장·보호·외벽" },
  신축: { name: "벽상토", element: "토", brief: "벽흙(벽돌)", keywords: "미장·보호·외벽" },
  임인: { name: "금박금", element: "금", brief: "금박(금박지)", keywords: "장식·미식·화려함" },
  계묘: { name: "금박금", element: "금", brief: "금박(금박지)", keywords: "장식·미식·화려함" },

  // 5
  갑진: { name: "복등화", element: "화", brief: "광야(하늘 위 불빛)", keywords: "환한빛·온기·일상조명" },
  을사: { name: "복등화", element: "화", brief: "광야(하늘 위 불빛)", keywords: "환한빛·온기·일상조명" },
  병오: { name: "천하수", element: "수", brief: "하늘물(은하수)", keywords: "하늘의 물·냉정" },
  정미: { name: "천하수", element: "수", brief: "하늘물(은하수)", keywords: "하늘의 물·냉정" },
  무신: { name: "대역토", element: "토", brief: "큰 도로의 흙", keywords: "포탄·교통망·넓은 길" },
  기유: { name: "대역토", element: "토", brief: "큰 도로의 흙", keywords: "포탄·교통망·넓은 길" },
  경술: { name: "차천금", element: "금", brief: "비늘·닦인 금", keywords: "장식성·정교·연마된 금속" },
  신해: { name: "차천금", element: "금", brief: "비늘·닦인 금", keywords: "장식성·정교·연마된 금속" },
  임자: { name: "상자목", element: "목", brief: "땅·나무", keywords: "활동·성장·학문" },
  계축: { name: "상자목", element: "목", brief: "땅·나무", keywords: "활동·성장·학문" },

  // 6
  갑인: { name: "대계수", element: "수", brief: "큰 산 내리는 물", keywords: "골짜기·여울·산골 계곡" },
  을묘: { name: "대계수", element: "수", brief: "큰 산 내리는 물", keywords: "골짜기·여울·산골 계곡" },
  병진: { name: "사중토", element: "토", brief: "모래흙", keywords: "소멸·응고·토질" },
  정사: { name: "사중토", element: "토", brief: "모래흙", keywords: "소멸·응고·토질" },
  무오: { name: "천상화", element: "화", brief: "하늘에 비친 햇빛", keywords: "직사광·정열·극열" },
  기미: { name: "천상화", element: "화", brief: "하늘에 비친 햇빛", keywords: "직사광·정열·극열" },
  경신: { name: "석류목", element: "목", brief: "석류나무", keywords: "열매·풍요·노력" },
  신유: { name: "석류목", element: "목", brief: "석류나무", keywords: "열매·풍요·노력" },
  임술: { name: "대해수", element: "수", brief: "큰 바다의 물", keywords: "광활·무한·변화" },
  계해: { name: "대해수", element: "수", brief: "큰 바다의 물", keywords: "광활·무한·변화" },
};

export const toKoGZ = (gz: string): string => {
  if (!gz || gz.length < 2) return gz;
  const sRaw = gz.charAt(0);
  const bRaw = gz.charAt(1);
  const s = STEM_H2K[sRaw] ?? sRaw;
  const b = BRANCH_H2K[bRaw] ?? bRaw;
  return `${s}${b}`;
};

export const getNabeum = (gz: string): (NabeumInfo & { code: string }) | null => {
  const ko = toKoGZ(gz);
  const info = NAEUM_MAP[ko];
  return info ? { ...info, code: ko } : null;
};
