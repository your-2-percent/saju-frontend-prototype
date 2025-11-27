// features/AnalysisReport/buildPrompt.ts
import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4, RelationTags } from "@/features/AnalysisReport/logic/relations";
import { buildHarmonyTags, buildAllRelationTags, normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import { buildShinsalTags, type ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import { useSajuSettingsStore } from "@/shared/lib/hooks/useSajuSettingsStore";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import { getDaewoonList } from "../luck/daewoonList";
import { ShinCategory } from "@/features/AnalysisReport/logic/shinStrength";
import { computeDeukFlags10 } from "@/features/AnalysisReport/utils/strength";
import { type LuckChain, UnifiedPowerResult } from "@/features/AnalysisReport/utils/unifiedPower";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import type { Element } from "@/features/AnalysisReport/utils/types";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";

/* ===== 맵/상수 ===== */
//const POS_LABELS = ["연", "월", "일", "시"] as const;

const DEBUG = false;
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/* ===== 음력 → 양력 보정 ===== */
function ensureSolarBirthDay(data: MyeongSik): MyeongSik {
  const any: Record<string, unknown> = data as unknown as Record<string, unknown>;
  const birthDay = typeof any.birthDay === "string" ? any.birthDay : "";
  const calType = typeof any.calendarType === "string" ? (any.calendarType as string) : "solar";
  if (birthDay.length < 8) return data;

  const y = Number(birthDay.slice(0, 4));
  const m = Number(birthDay.slice(4, 6));
  const d = Number(birthDay.slice(6, 8));

  if (calType === "lunar") {
    try {
      const solarDate = lunarToSolarStrict(y, m, d, 0, 0);
      const newBirthDay = `${solarDate.getFullYear()}${pad2(solarDate.getMonth() + 1)}${pad2(solarDate.getDate())}`;
      const out: MyeongSik = { ...data, birthDay: newBirthDay, calendarType: "solar" } as MyeongSik;
      if (DEBUG) console.debug("[IlwoonCalendar] lunar→solar:", { y, m, d, newBirthDay });
      return out;
    } catch {
      return data;
    }
  }
  return data;
}

function getActivePosLabels(natal: Pillars4, ms: MyeongSik): string[] {
  if (natal[3] && natal[3] !== "") {
    const hourLabel =
      !ms.birthTime || ms.birthTime === "모름" ? "시(예측)" : "시";
    return ["연", "월", "일", hourLabel];
  }
  return ["연", "월", "일"];
}

const STEM_H2K: Record<string, string> = { 甲:"갑", 乙:"을", 丙:"병", 丁:"정", 戊:"무", 己:"기", 庚:"경", 辛:"신", 壬:"임", 癸:"계" };
const BRANCH_H2K: Record<string, string> = { 子:"자", 丑:"축", 寅:"인", 卯:"묘", 辰:"진", 巳:"사", 午:"오", 未:"미", 申:"신", 酉:"유", 戌:"술", 亥:"해" };
const STEM_TO_ELEMENT: Record<string, Element> = {
  갑:"목", 을:"목", 병:"화", 정:"화", 무:"토", 기:"토",
  경:"금", 신:"금", 임:"수", 계:"수",
};
const BRANCH_MAIN_STEM: Record<string, string> = {
  자:"계", 축:"기", 인:"갑", 묘:"을", 진:"무", 사:"병", 오:"정", 미:"기", 신:"경", 유:"신", 술:"무", 해:"임",
  子:"계", 丑:"기", 寅:"갑", 卯:"을", 辰:"무", 巳:"병", 午:"정", 未:"기", 申:"경", 酉:"신", 戌:"무", 亥:"임",
};
const YANG_STEMS = ["갑","병","무","경","임"] as const;
function isYang(stemKo: string) { return (YANG_STEMS as readonly string[]).includes(stemKo); }
const SHENG_NEXT: Record<Element, Element> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
const KE:         Record<Element, Element> = { 목:"토", 화:"금", 토:"수", 금:"목", 수:"화" };
const KE_REV:     Record<Element, Element> = { 토:"목", 금:"화", 수:"토", 목:"금", 화:"수" };
const SHENG_PREV: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };

function normalizeStemLike(token: string): string | null {
  if (!token) return null;
  const s = token.trim();
  if (["갑","을","병","정","무","기","경","신","임","계"].includes(s)) return s;
  if (STEM_H2K[s]) return STEM_H2K[s];
  if (["자","축","인","묘","진","사","오","미","신","유","술","해"].includes(s)) return BRANCH_MAIN_STEM[s] ?? null;
  if (BRANCH_H2K[s]) return BRANCH_MAIN_STEM[BRANCH_H2K[s]] ?? null;
  const first = s.charAt(0);
  if (STEM_H2K[first]) return STEM_H2K[first];
  if (["갑","을","병","정","무","기","경","신","임","계"].includes(first)) return first;
  if (BRANCH_H2K[first]) return BRANCH_MAIN_STEM[BRANCH_H2K[first]] ?? null;
  if (["자","축","인","묘","진","사","오","미","신","유","술","해"].includes(first)) return BRANCH_MAIN_STEM[first] ?? null;
  return null;
}

/* ===== 십신 소분류 ===== */
type TenGodSubtype =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

function mapStemToTenGodSub(dayStemKo: string, targetStemKo: string): TenGodSubtype {
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
    case "비견": return same ? "비견" : "겁재";
    case "식신": return same ? "식신" : "상관";
    case "편재": return same ? "편재" : "정재";
    case "편관": return same ? "편관" : "정관";
    case "편인": return same ? "편인" : "정인";
  }
}

/* ===== 정규화 ===== */
function normalizeTo100(obj: Record<string, number>): Record<string, number> {
  const entries = Object.entries(obj) as [string, number][];
  const sum = entries.reduce((a, [,v]) => a + (v > 0 ? v : 0), 0);
  if (sum <= 0) return Object.fromEntries(entries.map(([k]) => [k, 0])) as Record<string, number>;
  const raw = entries.map(([k, v]) => [k, (v > 0 ? v : 0) * 100 / sum] as const);
  const floored = raw.map(([k, x]) => [k, Math.floor(x)] as const);
  let used = floored.reduce((a, [,x]) => a + x, 0);
  const rema = raw.map(([k, x]) => [k, x - Math.floor(x)] as const).sort((a, b) => b[1] - a[1]);
  const out: Record<string, number> = Object.fromEntries(floored.map(([k, x]) => [k, x])) as Record<string, number>;
  let i = 0;
  while (used < 100 && i < rema.length) { out[rema[i][0]] += 1; used += 1; i += 1; }
  return out;
}

/* ===== bare/merge 유틸 (컴포넌트와 동일) ===== */
//const STEMS_BARE = ["갑","을","병","정","무","기","경","신","임","계"] as const;

function toBareStemMap(input: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (v <= 0) continue;
    const stemKo = normalizeStemLike(k);
    if (!stemKo) continue;
    out[stemKo] = (out[stemKo] ?? 0) + v;
  }
  return out;
}

function stemsFromGZ(gz: string): string[] {
  if (!gz) return [];
  const s = normalizeStemLike(gz.charAt(0)); // 천간
  const b = normalizeStemLike(gz.charAt(1)); // 지지→본기천간
  return [s, b].filter(Boolean) as string[];
}

function toBareFromGZ(gz: string): Record<string, number> {
  const stems = stemsFromGZ(gz);
  const out: Record<string, number> = {};
  for (const s of stems) out[s] = (out[s] ?? 0) + 1;
  return out;
}

/* 가중치 */
const LUCK_RATIO = { natal:50, dae:30, se:20, wol:7, il:3 } as const;

function mergeWithRatio(
  parts: { kind: keyof typeof LUCK_RATIO; bare: Record<string, number> }[]
): Record<string, number> {
  const acc: Record<string, number> = {};

  for (const { kind, bare } of parts) {
    const ratio = LUCK_RATIO[kind] ?? 0;
    if (ratio <= 0) continue;

    const norm = normalizeTo100(bare); // ✅ 소스 자체 합100 맞춰줌
    for (const [stem, val] of Object.entries(norm)) {
      acc[stem] = (acc[stem] ?? 0) + val * ratio;
    }
  }

  // ✅ 최종 합100으로 normalize
  const sum = Object.values(acc).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const k of Object.keys(acc)) {
      acc[k] = (acc[k] / sum) * 100;
    }
  }
  return acc;
}

// ✅ 새 유틸: 이미 정수 100으로 정규화된 per-stem 분포를 받아 단순 합산만 한다.
function elementsFromNormalized(perStemInt: Record<string, number>, stemToElement: Record<string, "목"|"화"|"토"|"금"|"수">) {
  const acc: Record<"목"|"화"|"토"|"금"|"수", number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  for (const [stem, v] of Object.entries(perStemInt)) {
    const el = stemToElement[stem];
    if (el) acc[el] += v;
  }
  return acc; // 추가 normalize/반올림 없음
}

function tenSubFromNormalized(perStemInt: Record<string, number>, dayStem: string) {
  const acc: Record<
    "비견"|"겁재"|"식신"|"상관"|"정재"|"편재"|"정관"|"편관"|"정인"|"편인",
    number
  > = { 비견:0, 겁재:0, 식신:0, 상관:0, 정재:0, 편재:0, 정관:0, 편관:0, 정인:0, 편인:0 };

  for (const [stemKo, v] of Object.entries(perStemInt)) {
    if (v <= 0) continue;
    const sub = mapStemToTenGodSub(dayStem, stemKo); // 기존 함수
    acc[sub] += v;
  }
  return acc; // 추가 normalize/반올림 없음
}

function tenMainFromSub(sub: Record<"비견"|"겁재"|"식신"|"상관"|"정재"|"편재"|"정관"|"편관"|"정인"|"편인", number>) {
  return {
    비겁: sub.비견 + sub.겁재,
    식상: sub.식신 + sub.상관,
    재성: sub.정재 + sub.편재,
    관성: sub.정관 + sub.편관,
    인성: sub.정인 + sub.편인,
  } as const; // 합 100 보장
}


/* ===== 프롬프트 전용 overlay (AnalysisReport와 동일 계산) ===== */
function makeOverlayByLuck(unified: UnifiedPowerResult, tab: BlendTab, chain?: LuckChain) {
  // 1) 원국 스템 bare
  const natalBare = toBareStemMap(unified.perStemElementScaled);

  // 2) 운 스템 bare (탭 조건 동일 적용)
  const daeBare = (tab !== "원국" && chain?.dae) ? toBareFromGZ(chain.dae) : {};
  const seBare  = ((tab === "세운" || tab === "월운" || tab === "일운") && chain?.se) ? toBareFromGZ(chain.se) : {};
  const wolBare = ((tab === "월운" || tab === "일운") && chain?.wol) ? toBareFromGZ(chain.wol) : {};
  const ilBare  = (tab === "일운" && chain?.il) ? toBareFromGZ(chain.il) : {};

  // 3) 가중합산 → normalize 100
  const merged = mergeWithRatio([
    { kind:"natal", bare:natalBare },
    { kind:"dae",   bare:daeBare  },
    { kind:"se",    bare:seBare   },
    { kind:"wol",   bare:wolBare  },
    { kind:"il",    bare:ilBare   },
  ]);

  // ✅ 4) "정수 100"으로 딱 한 번 정규화 — 이 벡터만 사용!
  const mergedInt100 = normalizeTo100(merged);

  // ✅ 5) 여기서부터는 "추가 normalize 금지" — 단순 합산만
  const elementPercentInt = elementsFromNormalized(mergedInt100, STEM_TO_ELEMENT);
  const totalsSubInt      = tenSubFromNormalized(mergedInt100, unified.dayStem);
  const totalsMainInt     = tenMainFromSub(totalsSubInt);

  return {
    perStemAugBare: mergedInt100,          // 기반 벡터(정수100)
    elementPercent: elementPercentInt,     // 오행(정수) — 화 == 식신+상관 보장
    totalsSub: totalsSubInt,               // 소분류(정수)
    totalsMain: totalsMainInt,             // 대분류(정수)
  };
}

function elementToTenGod(dayEl: Element, targetEl: Element): string {
  const SHENG_NEXT: Record<Element, Element> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
  const KE:         Record<Element, Element> = { 목:"토", 화:"금", 토:"수", 금:"목", 수:"화" };
  const KE_REV:     Record<Element, Element> = { 토:"목", 금:"화", 수:"토", 목:"금", 화:"수" };
  const SHENG_PREV: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };

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
type NabeumInfo = { name: string; element: Element; brief: string; keywords: string };
const NAEUM_MAP: Record<string, NabeumInfo> = {
  // 1
  "갑자": { name:"해중금", element:"금", brief:"바다 속의 금속", keywords:"잠재·매몰·드러나기 어려움" },
  "을축": { name:"해중금", element:"금", brief:"바다 속의 금속", keywords:"잠재·매몰·드러나기 어려움" },
  "병인": { name:"노중화", element:"화", brief:"화로 속 불", keywords:"제련·내열·지속적 연소" },
  "정묘": { name:"노중화", element:"화", brief:"화로 속 불", keywords:"제련·내열·지속적 연소" },
  "무진": { name:"대림목", element:"목", brief:"큰 숲의 나무", keywords:"울창·성장력·보호림" },
  "기사": { name:"대림목", element:"목", brief:"큰 숲의 나무", keywords:"울창·성장력·보호림" },
  "경오": { name:"노방토", element:"토", brief:"길가의 흙", keywords:"노출·부서짐·실용/교통" },
  "신미": { name:"노방토", element:"토", brief:"길가의 흙", keywords:"노출·부서짐·실용/교통" },
  "임신": { name:"검봉금", element:"금", brief:"칼끝의 금", keywords:"예리함·강경·절단력" },
  "계유": { name:"검봉금", element:"금", brief:"칼끝의 금", keywords:"예리함·강경·절단력" },

  // 2
  "갑술": { name:"산두화", element:"화", brief:"산머리의 불(석양빛)", keywords:"높이·표면·불광" },
  "을해": { name:"산두화", element:"화", brief:"산머리의 불(석양빛)", keywords:"높이·표면·불광" },
  "병자": { name:"간하수", element:"수", brief:"골짜기 아래 물", keywords:"계류·낙수·유연한 흐름" },
  "정축": { name:"간하수", element:"수", brief:"골짜기 아래 물", keywords:"계류·낙수·유연한 흐름" },
  "무인": { name:"성두토", element:"토", brief:"성곽의 흙", keywords:"다져짐·성벽·방어/지지" },
  "기묘": { name:"성두토", element:"토", brief:"성곽의 흙", keywords:"다져짐·성벽·방어/지지" },
  "경진": { name:"백납금", element:"금", brief:"흰 밀랍 같은 금", keywords:"미완·연성·가공 전 금속" },
  "신사": { name:"백납금", element:"금", brief:"흰 밀랍 같은 금", keywords:"미완·연성·가공 전 금속" },
  "임오": { name:"양류목", element:"목", brief:"버드나무", keywords:"유연·수분·여름쇠약" },
  "계미": { name:"양류목", element:"목", brief:"버드나무", keywords:"유연·수분·여름쇠약" },

  // 3
  "갑신": { name:"천중수", element:"수", brief:"샘/우물의 물", keywords:"정수·원천·지하수" },
  "을유": { name:"천중수", element:"수", brief:"샘/우물의 물", keywords:"정수·원천·지하수" },
  "병술": { name:"옥상토", element:"토", brief:"지붕 위의 흙", keywords:"높이 올린 토·마감/기단" },
  "정해": { name:"옥상토", element:"토", brief:"지붕 위의 흙", keywords:"높이 올린 토·마감/기단" },
  "무자": { name:"벽력화", element:"화", brief:"번개불", keywords:"돌발·폭발·전기/천뢰" },
  "기축": { name:"벽력화", element:"화", brief:"번개불", keywords:"돌발·폭발·전기/천뢰" },
  "경인": { name:"송백목", element:"목", brief:"소나무·측백", keywords:"상록·한서견딤·절개" },
  "신묘": { name:"송백목", element:"목", brief:"소나무·측백", keywords:"상록·한서견딤·절개" },
  "임진": { name:"장류수", element:"수", brief:"길게 흐르는 물", keywords:"강줄기·연속성·지속흐름" },
  "계사": { name:"장류수", element:"수", brief:"길게 흐르는 물", keywords:"강줄기·연속성·지속흐름" },

  // 4
  "갑오": { name:"사중금", element:"금", brief:"모랫속의 금", keywords:"사금·선별/세척·정련 필요" },
  "을미": { name:"사중금", element:"금", brief:"모랫속의 금", keywords:"사금·선별/세척·정련 필요" },
  "병신": { name:"산하화", element:"화", brief:"산 아래의 불", keywords:"그늘·야영불·잔불/은화" },
  "정유": { name:"산하화", element:"화", brief:"산 아래의 불", keywords:"그늘·야영불·잔불/은화" },
  "무술": { name:"평지목", element:"목", brief:"평야의 나무", keywords:"뿌리깊음·안정적 성장" },
  "기해": { name:"평지목", element:"목", brief:"평야의 나무", keywords:"뿌리깊음·안정적 성장" },
  "경자": { name:"벽상토", element:"토", brief:"벽 위의 흙(회벽)", keywords:"미장·표면·가림/보호" },
  "신축": { name:"벽상토", element:"토", brief:"벽 위의 흙(회벽)", keywords:"미장·표면·가림/보호" },
  "임인": { name:"금박금", element:"금", brief:"금박(금박잎)", keywords:"얇음·장식·겉보기 화려" },
  "계묘": { name:"금박금", element:"금", brief:"금박(금박잎)", keywords:"얇음·장식·겉보기 화려" },

  // 5
  "갑진": { name:"복등화", element:"화", brief:"등불(덮인 등화)", keywords:"실내등·온화·지속 조명" },
  "을사": { name:"복등화", element:"화", brief:"등불(덮인 등화)", keywords:"실내등·온화·지속 조명" },
  "병오": { name:"천하수", element:"수", brief:"하늘의 강(은하수)", keywords:"높은 곳의 물·냉청" },
  "정미": { name:"천하수", element:"수", brief:"하늘의 강(은하수)", keywords:"높은 곳의 물·냉청" },
  "무신": { name:"대역토", element:"토", brief:"역참/도로의 토", keywords:"평탄·교통망·넓고 두터움" },
  "기유": { name:"대역토", element:"토", brief:"역참/도로의 토", keywords:"평탄·교통망·넓고 두터움" },
  "경술": { name:"채천금", element:"금", brief:"비녀·팔찌 금", keywords:"장식용·정교·연약/귀금" },
  "신해": { name:"채천금", element:"금", brief:"비녀·팔찌 금", keywords:"장식용·정교·연약/귀금" },
  "임자": { name:"상자목", element:"목", brief:"뽕·柘나무", keywords:"생활·양잠·실용·완만성장" },
  "계축": { name:"상자목", element:"목", brief:"뽕·柘나무", keywords:"생활·양잠·실용·완만성장" },

  // 6
  "갑인": { name:"대계수", element:"수", brief:"큰 시내의 물", keywords:"골짜기·여울·산간 급류" },
  "을묘": { name:"대계수", element:"수", brief:"큰 시내의 물", keywords:"골짜기·여울·산간 급류" },
  "병진": { name:"사중토", element:"토", brief:"모래흙", keywords:"느슨·성형 필요·사토" },
  "정사": { name:"사중토", element:"토", brief:"모래흙", keywords:"느슨·성형 필요·사토" },
  "무오": { name:"천상화", element:"화", brief:"하늘의 불(태양광)", keywords:"직사광·정오·극양열" },
  "기미": { name:"천상화", element:"화", brief:"하늘의 불(태양광)", keywords:"직사광·정오·극양열" },
  "경신": { name:"석류목", element:"목", brief:"석류나무", keywords:"화과병개·화려" },
  "신유": { name:"석류목", element:"목", brief:"석류나무", keywords:"화과병개·화려" },
  "임술": { name:"대해수", element:"수", brief:"큰 바다의 물", keywords:"광활·심연·포섭/변동" },
  "계해": { name:"대해수", element:"수", brief:"큰 바다의 물", keywords:"광활·심연·포섭/변동" },
};

/** GZ를 한글 ‘갑자’처럼 정규화 */
function toKoGZ(gz: string): string {
  if (!gz || gz.length < 2) return gz;
  const sRaw = gz.charAt(0);
  const bRaw = gz.charAt(1);
  const s = STEM_H2K[sRaw] ?? sRaw;
  const b = BRANCH_H2K[bRaw] ?? bRaw;
  return `${s}${b}`;
}
function getNabeum(gz: string): (NabeumInfo & { code: string }) | null {
  const ko = toKoGZ(gz);
  const info = NAEUM_MAP[ko];
  return info ? { ...info, code: ko } : null;
}

type DaewoonInfo = {
  gz: string;
  age: number;
  startYear: number;
  startMonth: number;
  startDay: number;
  endYear: number;
};

// 대운 시작/끝 날짜 계산
function getDaeStartDate(d: DaewoonInfo): Date {
  return new Date(d.startYear, (d.startMonth ?? 1) - 1, d.startDay ?? 1);
}

function getDaeEndDate(list: DaewoonInfo[], idx: number): Date {
  const cur = list[idx];
  const next = list[idx + 1];

  // 다음 대운 시작 시점까지 현재 대운 유효
  if (next) {
    return getDaeStartDate(next);
  }

  // 마지막 대운: endYear 끝까지라고 보고 +1년 지점까지
  return new Date(cur.endYear + 1, 0, 1);
}

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart; // 반열린 구간
}

/**
 * 주어진 "연도 구간"과 겹치는 모든 대운 반환
 * 예: 2019~2026을 넣으면, 이 구간에 걸친 대운이 2개면 2개 다 나옴
 */
function findDaeForYearRangeMulti(
  daeList: DaewoonInfo[],
  startYear: number,
  endYear: number,
): DaewoonInfo[] {
  const rangeStart = new Date(startYear, 0, 1);
  const rangeEnd = new Date(endYear + 1, 0, 1); // endYear까지 포함

  const results: DaewoonInfo[] = [];

  for (let i = 0; i < daeList.length; i++) {
    const d = daeList[i];
    const ds = getDaeStartDate(d);
    const de = getDaeEndDate(daeList, i);

    if (overlaps(ds, de, rangeStart, rangeEnd)) {
      // 중복 제거
      if (!results.some(r => r.gz === d.gz && r.startYear === d.startYear)) {
        results.push(d);
      }
    }
  }

  return results;
}

/**
 * "특정 연도 하나"에 걸치는 대운들 (연단위 세운용)
 */
function findDaeForYearMulti(daeList: DaewoonInfo[], year: number): DaewoonInfo[] {
  return findDaeForYearRangeMulti(daeList, year, year);
}

function findDaeForMonthMulti(
  daeList: DaewoonInfo[],
  year: number,
  month: number,
): DaewoonInfo[] {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1); // 다음달 1일

  const results: DaewoonInfo[] = [];

  for (let i = 0; i < daeList.length; i++) {
    const d = daeList[i];
    const ds = getDaeStartDate(d);
    const de = getDaeEndDate(daeList, i);

    if (overlaps(ds, de, monthStart, monthEnd)) {
      if (!results.some(r => r.gz === d.gz && r.startYear === d.startYear)) {
        results.push(d);
      }
    }
  }

  return results;
}

/**
 * 입춘 날짜 (간단 절기 계산, 정확한 절기 함수 있으면 그걸로 대체해도 됨)
 */
function getIpchunDate(year: number): Date {
  const solarYearMs = 31556925974.7; // 평균 태양년 ms
  const base = Date.UTC(1900, 1, 4, 7, 15, 0); // 1900-02-04 07:15(UTC) 기준
  const termIndex = 3; // 입춘

  const ms =
    base +
    (year - 1900) * solarYearMs +
    (termIndex * solarYearMs) / 24;

  const utc = new Date(ms);
  return new Date(utc.getTime() + 9 * 60 * 60 * 1000); // KST(+9)
}

/**
 * 월운용 세운 찾기 - 입춘/12월 교운기까지 포함
 * ms 파라미터는 타입 맞추기용, 지금은 안 써도 됨
 */
function findSeForMonthMulti(year: number, month: number): string[] {
  const results: string[] = [];

  const monthStart = new Date(year, month - 1, 15, 0, 0, 0); // 해당 월 1일
  const monthEnd   = new Date(year, month, 1, 15, 0, 0);     // 다음 달 1일

  const ipchun = getIpchunDate(year); // 입춘 (KST 기준)

  const prevGZ = getYearGanZhi(new Date(year - 1, 5, 15));
  const curGZ  = getYearGanZhi(new Date(year, 5, 15));
  const nextGZ = getYearGanZhi(new Date(year + 1, 5, 15));

  // 1) 입춘 기준 세운
  if (monthEnd <= ipchun) {
    // 월 전체가 입춘 이전 (보통 1월)
    if (prevGZ) {
      results.push(normalizeGZ(prevGZ));
    }
  } else if (monthStart >= ipchun) {
    // 월 전체가 입춘 이후 (3~11월, 입춘 지난 2월 일부 포함)
    if (curGZ) {
      results.push(normalizeGZ(curGZ));
    }
  } else {
    // 이 월 안에 입춘이 끼어 있음 (보통 2월)
    if (prevGZ) {
      results.push(normalizeGZ(prevGZ));
    }
    if (curGZ) {
      const norm = normalizeGZ(curGZ);
      if (!results.includes(norm)) {
        results.push(norm);
      }
    }
  }

  // 2) 12월 → 다음 해 세운까지 미리 포함
  if (month === 12 && nextGZ) {
    const norm = normalizeGZ(nextGZ);
    if (!results.includes(norm)) {
      results.push(norm);
    }
  }

  return results;
}

function resolveSeYear(year: number, month: number): number[] {
  const ipchun = getIpchunDate(year);  
  const monthStart = new Date(year, month - 1, 1);

  const years: number[] = [];

  // 1) 입춘 이전 → 전년도 세운
  if (monthStart < ipchun) {
    years.push(year - 1);
  }

  // 2) 입춘 이후 → 당해년도 세운
  if (monthStart >= ipchun) {
    years.push(year);
  }

  // 3) 12월은 다음년도 세운 포함
  if (month === 12) {
    years.push(year + 1);
  }

  return years;
}

// ─────────────────────────────────────────────
// 메인 프롬프트 빌더
// ─────────────────────────────────────────────
export function buildChatPrompt(params: {
  ms: MyeongSik;
  natal: Pillars4;
  chain?: LuckChain;
  basis?: ShinsalBasis;
  tab: BlendTab;
  includeTenGod?: boolean;
  unified: UnifiedPowerResult;
  percent: number;
  category: ShinCategory;
}): string {
  const { ms, natal: natalRaw, chain, basis, tab, unified, percent, category } = params;

  const natal: Pillars4 = [
    normalizeGZ(natalRaw[0] ?? ""),
    normalizeGZ(natalRaw[1] ?? ""),
    normalizeGZ(natalRaw[2] ?? ""),
    normalizeGZ(natalRaw[3] ?? ""),
  ];

  const daeList = getDaewoonList(ms).slice(0, 10);

  // 형충회합(원국/운)
  //const relNatal: RelationTags = buildHarmonyTags(natal);
  const relWithLuck: RelationTags = buildAllRelationTags({
    natal,
    daewoon: tab !== "원국" ? chain?.dae ?? undefined : undefined,
    sewoon:  (tab === "세운" || tab === "월운" || tab === "일운") ? chain?.se ?? undefined : undefined,
    wolwoon: (tab === "월운" || tab === "일운") ? chain?.wol ?? undefined : undefined,
    ilwoon:  (tab === "일운") ? chain?.il ?? undefined : undefined,
  });

  const sinsalWithLuck = buildShinsalTags({
    natal,
    daewoon: tab !== "원국" ? chain?.dae ?? undefined : undefined,
    sewoon:  (tab === "세운" || tab === "월운" || tab === "일운") ? chain?.se ?? undefined : undefined,
    wolwoon: (tab === "월운" || tab === "일운") ? chain?.wol ?? undefined : undefined,
    ilwoon:  (tab === "일운") ? chain?.il ?? undefined : undefined,
  });

  // 십이신살(설정 반영)
  const { shinsalEra, shinsalGaehwa, shinsalBase } = useSajuSettingsStore.getState();
  const baseBranch = shinsalBase === "연지" ? (natal[0]?.charAt(1) ?? "") : (natal[2]?.charAt(1) ?? "");
  // const shinsalResult = natal.map((gz, i) => ({
  //   pos: POS_LABELS[i], gz,
  //   shinsal: getTwelveShinsalBySettings({ baseBranch, targetBranch: gz.charAt(1), era: shinsalEra, gaehwa: shinsalGaehwa }),
  // }));

  // 🚩 AnalysisReport와 동일 계산으로 overlay 구성
  const overlay = makeOverlayByLuck(unified, tab, chain);
  const elemPercentObj = overlay.elementPercent;
  const totalsSub = overlay.totalsSub;
  // 신강도/득령·득지·득세
  //const shinPct = natalShinPercent(natal, { criteriaMode: "modern", useHarmonyOverlay: true });
  
  const { flags: deukFlags0 } = computeDeukFlags10(natal, unified.elementScoreRaw);
  const shinLine = `${category} (${percent.toFixed(1)}%) · ${[
    `득령 ${deukFlags0.비견.령 || deukFlags0.겁재.령 || deukFlags0.편인.령 || deukFlags0.정인.령 ? "인정" : "불인정"}`,
    `득지 ${deukFlags0.비견.지 || deukFlags0.겁재.지 || deukFlags0.편인.지 || deukFlags0.정인.지 ? "인정" : "불인정"}`,
    `득세 ${deukFlags0.비견.세 || deukFlags0.겁재.세 ? "인정" : "불인정"}`,
  ].join(", ")}`;

  const isUnknownTime = !ms.birthTime || ms.birthTime === "모름";

  function formatBirth(ms: MyeongSik): string {
    const ensured = ensureSolarBirthDay(ms);
    const rawDay = ensured.birthDay ?? "";
    const year = rawDay.slice(0, 4), month = rawDay.slice(4, 6), day = rawDay.slice(6, 8);
    let correctedTime = "";
    if (ms.corrected instanceof Date && !isNaN(ms.corrected.getTime())) {
      const hh = String(ms.corrected.getHours()).padStart(2, "0");
      const mm = String(ms.corrected.getMinutes()).padStart(2, "0");
      correctedTime = isUnknownTime ? "모름" : `${hh}:${mm}`;
    }
    return `${year}년 ${month}월 ${day}일 보정시 ${correctedTime}`;
  }
  function formatLuckChain(tab: BlendTab, chain?: LuckChain): string {
    if (!chain) return "(없음)";
    const parts: string[] = [];
    if (tab === "대운" || tab === "세운" || tab === "월운" || tab === "일운") { if (chain.dae) parts.push(`대운:${normalizeGZ(chain.dae)}`); }
    if (tab === "세운" || tab === "월운" || tab === "일운") { if (chain.se) parts.push(`세운:${normalizeGZ(chain.se)}`); }
    if (tab === "월운" || tab === "일운") { if (chain.wol) parts.push(`월운:${normalizeGZ(chain.wol)}`); }
    if (tab === "일운") { if (chain.il) parts.push(`일운:${normalizeGZ(chain.il)}`); }
    return parts.length > 0 ? parts.join(" / ") : "(없음)";
  }

  const posLabels = getActivePosLabels(natal, ms);
  const dayStem = unified.dayStem;  // ex) "정"
  const dayEl = STEM_TO_ELEMENT[dayStem as keyof typeof STEM_TO_ELEMENT];

  // ===========================
// 공통 헬퍼
// ===========================
const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const pruneEmpty = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const arr = value
      .map(pruneEmpty)
      .filter((v) => {
        if (v === undefined || v === null) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        if (isPlainObject(v) && Object.keys(v).length === 0) return false;
        return true;
      });

    return arr.length > 0 ? arr : undefined;
  }

  if (isPlainObject(value)) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const pruned = pruneEmpty(v);
      if (pruned === undefined) continue;
      if (Array.isArray(pruned) && pruned.length === 0) continue;
      if (isPlainObject(pruned) && Object.keys(pruned).length === 0) continue;
      obj[k] = pruned;
    }
    return Object.keys(obj).length > 0 ? obj : undefined;
  }

  if (value === undefined || value === null) return undefined;
  return value;
};

const formatJsonForPrompt = (raw: unknown): string => {
  const cleaned = pruneEmpty(raw);
  if (cleaned === undefined) return "";

  if (
    typeof cleaned === "string" ||
    typeof cleaned === "number" ||
    typeof cleaned === "boolean"
  ) {
    return String(cleaned);
  }

  return ["```json", JSON.stringify(cleaned, null, 2), "```"].join("\n");
};

const section = (title: string, raw: unknown): string => {
  const formatted = formatJsonForPrompt(raw);
  if (!formatted) return "";
  return `## ${title}\n${formatted}`;
};

// ===========================
// 프롬프트 본문 (1번 버전)
// ===========================
const header = [
  `📌 명식: ${ms.name ?? "이름없음"} (${formatBirth(ms)}) 성별: ${ms.gender}`,
  `원국 ${natal[0]}년 ${natal[1]}월 ${natal[2]}일` +
    (natal[3]
      ? ` ${natal[3]}시${
          !ms.birthTime || ms.birthTime === "모름" ? "(시주예측)" : ""
        }`
      : ""),
  `운: ${formatLuckChain(tab, chain)}`,
].join("\n");

const bodyParts: string[] = [];

// 대운 리스트
bodyParts.push(section("대운 리스트 (10개)", daeList));

// 신강도
bodyParts.push(section("신강도", shinLine));

// 오행강약(원국 고정)
bodyParts.push(
  section(
    "오행강약(퍼센트·원국 기준 고정)",
    Object.fromEntries(
      Object.entries(unified.natalFixed.elementPercent100).map(
        ([el, val]) => [
          `${el}(${elementToTenGod(dayEl, el as Element)})`,
          val,
        ],
      ),
    ),
  ),
);

// 오행강약(현재 탭 기준) — 원국 탭이 아니면만 출력
if (tab !== "원국") {
  bodyParts.push(
    section(
      `오행강약(퍼센트·탭=${tab})`,
      Object.fromEntries(
        Object.entries(elemPercentObj).map(([el, val]) => [
          `${el}(${elementToTenGod(dayEl, el as Element)})`,
          val,
        ]),
      ),
    ),
  );
}

// 십신 강약(원국 고정)
bodyParts.push(
  section(
    "십신 강약(소분류 10개·원국·합계 100)",
    unified.natalFixed.totalsSub,
  ),
);

// 십신 강약(현재 탭 기준) — 원국 탭이 아니면만 출력
if (tab !== "원국") {
  bodyParts.push(
    section(
      `십신 강약(소분류 10개·탭=${tab}·합계 100)`,
      totalsSub,
    ),
  );
}

// 🚩 십이운성(원국+운 반영)
bodyParts.push(
  section(
    "십이운성(원국+운 반영)",
    tab === "원국"
      ? natal
          .map((gz, i) => {
            if (!gz || i >= posLabels.length) return null;
            return {
              pos: posLabels[i],
              gz,
              unseong: getTwelveUnseong(
                natal[2]?.charAt(0) ?? "",
                gz.charAt(1),
              ),
            };
          })
          .filter(Boolean)
      : [
          ...natal
            .map((gz, i) => {
              if (!gz || i >= posLabels.length) return null;
              return {
                pos: posLabels[i],
                gz,
                unseong: getTwelveUnseong(
                  natal[2]?.charAt(0) ?? "",
                  gz.charAt(1),
                ),
              };
            })
            .filter(Boolean),
          ...(chain?.dae
            ? [
                {
                  pos: "대운",
                  gz: chain.dae,
                  unseong: getTwelveUnseong(
                    natal[2]?.charAt(0) ?? "",
                    chain.dae.charAt(1),
                  ),
                },
              ]
            : []),
          ...((tab === "세운" || tab === "월운" || tab === "일운") &&
          chain?.se
            ? [
                {
                  pos: "세운",
                  gz: chain.se,
                  unseong: getTwelveUnseong(
                    natal[2]?.charAt(0) ?? "",
                    chain.se.charAt(1),
                  ),
                },
              ]
            : []),
          ...((tab === "월운" || tab === "일운") && chain?.wol
            ? [
                {
                  pos: "월운",
                  gz: chain.wol,
                  unseong: getTwelveUnseong(
                    natal[2]?.charAt(0) ?? "",
                    chain.wol.charAt(1),
                  ),
                },
              ]
            : []),
          ...(tab === "일운" && chain?.il
            ? [
                {
                  pos: "일운",
                  gz: chain.il,
                  unseong: getTwelveUnseong(
                    natal[2]?.charAt(0) ?? "",
                    chain.il.charAt(1),
                  ),
                },
              ]
            : []),
        ].filter(Boolean),
  ),
);

// 🚩 십이신살(원국+운 반영·설정 적용)
bodyParts.push(
  section(
    "십이신살(원국+운 반영·설정 적용)",
    tab === "원국"
      ? natal
          .map((gz, i) => {
            if (!gz || i >= posLabels.length) return null;
            return {
              pos: posLabels[i],
              gz,
              shinsal: getTwelveShinsalBySettings({
                baseBranch,
                targetBranch: gz.charAt(1),
                era: shinsalEra,
                gaehwa: shinsalGaehwa,
              }),
            };
          })
          .filter(Boolean)
      : [
          ...natal
            .map((gz, i) => {
              if (!gz || i >= posLabels.length) return null;
              return {
                pos: posLabels[i],
                gz,
                shinsal: getTwelveShinsalBySettings({
                  baseBranch,
                  targetBranch: gz.charAt(1),
                  era: shinsalEra,
                  gaehwa: shinsalGaehwa,
                }),
              };
            })
            .filter(Boolean),
          ...(chain?.dae
            ? [
                {
                  pos: "대운",
                  gz: chain.dae,
                  shinsal: getTwelveShinsalBySettings({
                    baseBranch,
                    targetBranch: chain.dae.charAt(1),
                    era: shinsalEra,
                    gaehwa: shinsalGaehwa,
                  }),
                },
              ]
            : []),
          ...((tab === "세운" || tab === "월운" || tab === "일운") &&
          chain?.se
            ? [
                {
                  pos: "세운",
                  gz: chain.se,
                  shinsal: getTwelveShinsalBySettings({
                    baseBranch,
                    targetBranch: chain.se.charAt(1),
                    era: shinsalEra,
                    gaehwa: shinsalGaehwa,
                  }),
                },
              ]
            : []),
          ...((tab === "월운" || tab === "일운") && chain?.wol
            ? [
                {
                  pos: "월운",
                  gz: chain.wol,
                  shinsal: getTwelveShinsalBySettings({
                    baseBranch,
                    targetBranch: chain.wol.charAt(1),
                    era: shinsalEra,
                    gaehwa: shinsalGaehwa,
                  }),
                },
              ]
            : []),
          ...(tab === "일운" && chain?.il
            ? [
                {
                  pos: "일운",
                  gz: chain.il,
                  shinsal: getTwelveShinsalBySettings({
                    baseBranch,
                    targetBranch: chain.il.charAt(1),
                    era: shinsalEra,
                    gaehwa: shinsalGaehwa,
                  }),
                },
              ]
            : []),
        ].filter(Boolean),
  ),
);

// 🚩 납음오행(원국+운 반영)
bodyParts.push(
  section(
    "납음오행(원국+운 반영)",
    tab === "원국"
      ? natal
          .map((gz, i) => {
            if (!gz || i >= posLabels.length) return null;
            const info = getNabeum(gz);
            return info
              ? {
                  pos: posLabels[i],
                  gz,
                  nabeum: info.name,
                  element: info.element,
                  code: info.code,
                }
              : { pos: posLabels[i], gz, nabeum: null };
          })
          .filter(Boolean)
      : [
          ...natal
            .map((gz, i) => {
              if (!gz || i >= posLabels.length) return null;
              const info = getNabeum(gz);
              return info
                ? {
                    pos: posLabels[i],
                    gz,
                    nabeum: info.name,
                    element: info.element,
                    code: info.code,
                  }
                : { pos: posLabels[i], gz, nabeum: null };
            })
            .filter(Boolean),
          ...(chain?.dae
            ? (() => {
                const info = getNabeum(chain.dae);
                return info
                  ? [
                      {
                        pos: "대운",
                        gz: chain.dae,
                        nabeum: info.name,
                        element: info.element,
                        code: info.code,
                      },
                    ]
                  : [];
              })()
            : []),
          ...(((tab === "세운" || tab === "월운" || tab === "일운") &&
          chain?.se)
            ? (() => {
                const info = getNabeum(chain.se!);
                return info
                  ? [
                      {
                        pos: "세운",
                        gz: chain.se!,
                        nabeum: info.name,
                        element: info.element,
                        code: info.code,
                      },
                    ]
                  : [];
              })()
            : []),
          ...(((tab === "월운" || tab === "일운") && chain?.wol)
            ? (() => {
                const info = getNabeum(chain.wol!);
                return info
                  ? [
                      {
                        pos: "월운",
                        gz: chain.wol!,
                        nabeum: info.name,
                        element: info.element,
                        code: info.code,
                      },
                    ]
                  : [];
              })()
            : []),
          ...((tab === "일운" && chain?.il)
            ? (() => {
                const info = getNabeum(chain.il!);
                return info
                  ? [
                      {
                        pos: "일운",
                        gz: chain.il!,
                        nabeum: info.name,
                        element: info.element,
                        code: info.code,
                      },
                    ]
                  : [];
              })()
            : []),
        ].filter(Boolean),
  ),
);

// 형충회합(원국)
bodyParts.push(
  section(
    "형충회합(원국)",
    buildHarmonyTags(
      natal.filter((_, i) => i < posLabels.length) as Pillars4,
    ),
  ),
);

// 형충회합(운 포함: 탭 연동)
bodyParts.push(section("형충회합(운 포함: 탭 연동)", relWithLuck));

// 신살(원국 / 운 포함)
if (tab === "원국") {
  const baseShinsal = buildShinsalTags({
    natal,
    daewoon: null,
    sewoon: null,
    wolwoon: null,
    ilwoon: null,
    basis,
  });

  bodyParts.push(
    section("신살(원국 전용)", {
      good: baseShinsal.good,
      bad: baseShinsal.bad,
      meta: baseShinsal.meta,
    }),
  );
} else {
  bodyParts.push(section(`신살(운 포함·탭=${tab})`, sinsalWithLuck));
}

// 빈 섹션 제거 후 조인
const body = bodyParts
  .filter((s) => s && s.trim().length > 0)
  .join("\n\n");

// 해석 가이드 (간단 버전이면 비워두거나 나중에 채워도 됨)
const guide = [
  "-----",
  "🧭 해석 가이드",
  "",
  "1. 위 데이터는 사주 원국과 현재 선택된 탭(원국/대운/세운/월운/일운)의 수치·태그 정보다.",
  "2. 해석 시, 원국 → 선택 탭 순서로 변화 포인트를 요약한다.",
].join("\n");

return [header, body, guide].join("\n\n");
}

export function buildMultiLuckPrompt(params: {
  ms: MyeongSik;
  natal: Pillars4;
  basis?: ShinsalBasis;
  includeTenGod?: boolean;
  unified: UnifiedPowerResult;
  percent: number;
  category: ShinCategory;
  selectedDaeList: DaewoonInfo[];
  daeList: DaewoonInfo[];
  seYears: number[];
  wolMonths: string[];
  ilDays: string[];   // ✅ 일운용 날짜 리스트
}): string {
  const {
    ms,
    natal: natalRaw,
    basis,
    unified,
    percent,
    category,
    selectedDaeList,
    daeList,
    seYears,
    wolMonths,
    ilDays,
  } = params;

  const natal: Pillars4 = [
    normalizeGZ(natalRaw[0] ?? ""),
    normalizeGZ(natalRaw[1] ?? ""),
    normalizeGZ(natalRaw[2] ?? ""),
    normalizeGZ(natalRaw[3] ?? ""),
  ];

  const isUnknownTime = !ms.birthTime || ms.birthTime === "모름";
  const posLabels = getActivePosLabels(natal, ms);
  const dayStem = unified.dayStem;
  const dayEl = STEM_TO_ELEMENT[dayStem as keyof typeof STEM_TO_ELEMENT];

  const { shinsalEra, shinsalGaehwa, shinsalBase } = useSajuSettingsStore.getState();
  const baseBranch =
    shinsalBase === "연지"
      ? natal[0]?.charAt(1) ?? ""
      : natal[2]?.charAt(1) ?? "";

  // 신강도
  const { flags: deukFlags0 } = computeDeukFlags10(
    natal,
    unified.elementScoreRaw,
  );
  const shinLine = `${category} (${percent.toFixed(1)}%) · ${[
    `득령 ${
      deukFlags0.비견.령 ||
      deukFlags0.겁재.령 ||
      deukFlags0.편인.령 ||
      deukFlags0.정인.령
        ? "인정"
        : "불인정"
    }`,
    `득지 ${
      deukFlags0.비견.지 ||
      deukFlags0.겁재.지 ||
      deukFlags0.편인.지 ||
      deukFlags0.정인.지
        ? "인정"
        : "불인정"
    }`,
    `득세 ${deukFlags0.비견.세 || deukFlags0.겁재.세 ? "인정" : "불인정"}`,
  ].join(", ")}`;

  function formatBirth(ms: MyeongSik): string {
    const ensured = ensureSolarBirthDay(ms);
    const rawDay = ensured.birthDay ?? "";
    const year = rawDay.slice(0, 4),
      month = rawDay.slice(4, 6),
      day = rawDay.slice(6, 8);
    let correctedTime = "";
    if (ms.corrected instanceof Date && !isNaN(ms.corrected.getTime())) {
      const hh = String(ms.corrected.getHours()).padStart(2, "0");
      const mm = String(ms.corrected.getMinutes()).padStart(2, "0");
      correctedTime = isUnknownTime ? "모름" : `${hh}:${mm}`;
    }
    return `${year}년 ${month}월 ${day}일 보정시 ${correctedTime}`;
  }

// =========================
// 🔹 공통 헬퍼
// =========================

type ShinsalResult = ReturnType<typeof buildShinsalTags>;
type ShinsalScope = "대운" | "세운" | "월운" | "일운";

type ShinsalGoodBad = {
  good?: ShinsalResult["good"];
  bad?: ShinsalResult["bad"];
};

const filterShinsalByScope = (
  raw: ShinsalResult | null | undefined,
  scope: ShinsalScope,
): ShinsalGoodBad => {
  if (!raw) return {};

  const targetWord = scope; // "대운" / "세운" / "월운" / "일운"

  const filterGroup = (
    group: ShinsalResult["good"] | undefined,
  ): ShinsalResult["good"] | undefined => {
    if (!group) return undefined;

    // 부분 객체로 만들고, 마지막에 캐스팅
    const filtered: Partial<ShinsalResult["good"]> = {};

    for (const [key, arr] of Object.entries(group) as [
      keyof ShinsalResult["good"],
      string[],
    ][]) {
      if (!Array.isArray(arr)) continue;

      const next = arr.filter(
        (tag) => typeof tag === "string" && tag.includes(targetWord),
      );

      if (next.length > 0) {
        filtered[key] = next;
      }
    }

    // 한 개도 안 남으면 undefined
    if (Object.keys(filtered).length === 0) return undefined;

    // as any 말고, 정확한 타입으로 캐스팅
    return filtered as ShinsalResult["good"];
  };

  const good = filterGroup(raw.good);
  const bad = filterGroup(raw.bad);

  const result: ShinsalGoodBad = {};
  if (good) result.good = good;
  if (bad) result.bad = bad;

  return result;
};

const isPlainObject = (val: unknown): val is Record<string, unknown> => {
  if (val === null || typeof val !== "object") return false;
  const proto = Object.getPrototypeOf(val);
  return proto === Object.prototype || proto === null;
};

function pruneEmpty<T>(value: T): T | undefined {
  if (value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    const next = value
      .map((v) => pruneEmpty(v))
      .filter((v) => v !== undefined) as unknown[];

    return (next.length > 0 ? (next as T) : undefined) as T | undefined;
  }

  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(value)) {
      const cleaned = pruneEmpty(v);
      if (cleaned !== undefined) {
        next[k] = cleaned;
      }
    }

    return (Object.keys(next).length > 0 ? (next as T) : undefined) as
      | T
      | undefined;
  }

  return value;
}

const formatJsonForPrompt = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const section = (title: string, raw: unknown): string => {
  const cleaned = pruneEmpty(raw);
  if (cleaned === undefined) return "";

  const body = formatJsonForPrompt(cleaned);
  if (!body.trim()) return "";

  return `## ${title}\n${body}`;
};

// =========================
// 🔹 형충회합 필터 (레벨별)
//   - "대운" 섹션 → "대운" 들어간 태그만
//   - "세운" 섹션 → "세운" 들어간 태그만
//   - "월운" 섹션 → "월운" 들어간 태그만
//   - "일운" 섹션 → "일운" 들어간 태그만
//   - 원국 전용 섹션은 그대로 buildHarmonyTags 사용
// =========================

const filterHarmonyTagsByScope = (
  rel: unknown,
  scope: "대운" | "세운" | "월운" | "일운",
) => {
  const result: Record<string, string[]> = {};

  if (!rel || typeof rel !== "object") return result;

  for (const [key, value] of Object.entries(rel)) {
    if (!Array.isArray(value)) continue;

    const filtered = Array.from(
      new Set(
        value.filter(
          (tag) => typeof tag === "string" && tag.includes(scope),
        ),
      ),
    );

    if (filtered.length > 0) {
      result[key] = filtered;
    }
  }

  return result;
};

// =========================
// 🔹 프롬프트 본문 (2번 버전)
// =========================

const header = [
  `📌 명식: ${ms.name ?? "이름없음"} (${formatBirth(ms)}) 성별: ${ms.gender}`,
  `원국 ${natal[0]}년 ${natal[1]}월 ${natal[2]}일` +
    (natal[3]
      ? ` ${natal[3]}시${
          !ms.birthTime || ms.birthTime === "모름" ? "(시주예측)" : ""
        }`
      : ""),
].join("\n");

const sections: string[] = [];

// ============================
// 1) 원국 고정 섹션
// ============================

// 신강도
sections.push(section("신강도", shinLine));

// 오행강약(원국·퍼센트)
sections.push(
  section(
    "오행강약(원국)",
    Object.fromEntries(
      Object.entries(unified.natalFixed.elementPercent100).map(
        ([el, val]) => [
          `${el}(${elementToTenGod(dayEl, el as Element)})`,
          val,
        ],
      ),
    ),
  ),
);

// 십신 강약(원국)
sections.push(
  section(
    "십신 강약(소분류 10개·원국·합계 100)",
    unified.natalFixed.totalsSub,
  ),
);

// 형충회합(원국 전용)
sections.push(
  section(
    "형충회합(원국)",
    buildHarmonyTags(
      natal.filter((_, i) => i < posLabels.length) as Pillars4,
    ),
  ),
);

// 신살(원국 전용)
const shinsalNatal = buildShinsalTags({
  natal,
  daewoon: null,
  sewoon: null,
  wolwoon: null,
  ilwoon: null,
  basis,
});

sections.push(
  section("신살(원국)", {
    good: shinsalNatal.good,
    bad: shinsalNatal.bad,
    meta: shinsalNatal.meta,
  }),
);

// 납음오행(원국)
sections.push(
  section(
    "납음오행(원국)",
    natal
      .map((gz, i) => {
        if (!gz || i >= posLabels.length) return null;
        const info = getNabeum(gz);
        return info
          ? {
              pos: posLabels[i],
              gz,
              nabeum: info.name,
              element: info.element,
              code: info.code,
            }
          : { pos: posLabels[i], gz, nabeum: null };
      })
      .filter(Boolean),
  ),
);

// 십이운성(원국)
sections.push(
  section(
    "십이운성(원국)",
    natal
      .map((gz, i) => {
        if (!gz || i >= posLabels.length) return null;
        return {
          pos: posLabels[i],
          gz,
          unseong: getTwelveUnseong(
            natal[2]?.charAt(0) ?? "",
            gz.charAt(1),
          ),
        };
      })
      .filter(Boolean),
  ),
);

// 십이신살(원국)
sections.push(
  section(
    "십이신살(원국)",
    natal
      .map((gz, i) => {
        if (!gz || i >= posLabels.length) return null;
        return {
          pos: posLabels[i],
          gz,
          shinsal: getTwelveShinsalBySettings({
            baseBranch,
            targetBranch: gz.charAt(1),
            era: shinsalEra,
            gaehwa: shinsalGaehwa,
          }),
        };
      })
      .filter(Boolean),
  ),
);

// ============================
// 2) 대운 개별 섹션 (선택된 리스트)
// ============================

if (daeList.length > 0) {
  for (const dae of selectedDaeList) {
    const chain: LuckChain = { dae: dae.gz, se: null, wol: null, il: null };
    const overlay = makeOverlayByLuck(unified, "대운", chain);

    const relWithDae = buildAllRelationTags({
      natal,
      daewoon: dae.gz,
      sewoon: undefined,
      wolwoon: undefined,
      ilwoon: undefined,
    });

    const shinsalWithDae = buildShinsalTags({
      natal,
      daewoon: dae.gz,
      sewoon: undefined,
      wolwoon: undefined,
      ilwoon: undefined,
      basis,
    });

    const daeNabeum = getNabeum(dae.gz);
    const daeUnseong = getTwelveUnseong(
      natal[2]?.charAt(0) ?? "",
      dae.gz.charAt(1),
    );
    const daeShinsal = getTwelveShinsalBySettings({
      baseBranch,
      targetBranch: dae.gz.charAt(1),
      era: shinsalEra,
      gaehwa: shinsalGaehwa,
    });

    sections.push(
      section(`${dae.age}대운 ${dae.gz} (${dae.startYear}~${dae.endYear})`, {
        오행강약: Object.fromEntries(
          Object.entries(overlay.elementPercent).map(([el, val]) => [
            `${el}(${elementToTenGod(dayEl, el as Element)})`,
            val,
          ]),
        ),
        십신강약: overlay.totalsSub,
        형충회합: relWithDae, // 여기엔 대운만 들어가 있으므로 별도 필터 불필요
        신살: filterShinsalByScope(shinsalWithDae, "대운"),
        납음오행: daeNabeum
          ? {
              gz: dae.gz,
              nabeum: daeNabeum.name,
              element: daeNabeum.element,
              code: daeNabeum.code,
            }
          : null,
        십이운성: { pos: "대운", gz: dae.gz, unseong: daeUnseong },
        십이신살: { pos: "대운", gz: dae.gz, shinsal: daeShinsal },
      }),
    );
  }
}

// ============================
// 3) 세운 탭 섹션
// ============================

if (seYears.length > 0) {
  const rangeStartYear = seYears[0];
  const rangeEndYear = seYears[seYears.length - 1];

  // 세운 범위 전체에 걸쳐 있는 대운들
  const daesForRange = findDaeForYearRangeMulti(
    daeList,
    rangeStartYear,
    rangeEndYear,
  );

  // ---- (3-1) 세운 탭 상단: 대운 요약 ----
  if (daesForRange.length > 0) {
    const refYear = rangeStartYear;
    const seGZRef = getYearGanZhi(new Date(refYear, 5, 15));
    const seNormRef = normalizeGZ(seGZRef || "");

    const daeSectionData = {
      대운: daesForRange.map((daa) => {
        const daeChain: LuckChain = {
          dae: daa.gz,
          se: seNormRef || null,
          wol: null,
          il: null,
        };

        const daeOverlay = makeOverlayByLuck(unified, "대운", daeChain);
        const relWithDae = buildAllRelationTags({
          natal,
          daewoon: daa.gz,
          sewoon: seNormRef || undefined,
          wolwoon: undefined,
          ilwoon: undefined,
        });
        const shinsalWithDae = buildShinsalTags({
          natal,
          daewoon: daa.gz,
          sewoon: seNormRef || undefined,
          wolwoon: undefined,
          ilwoon: undefined,
          basis,
        });

        const daeNabeum = getNabeum(daa.gz);
        const daeUnseong = getTwelveUnseong(
          natal[2]?.charAt(0) ?? "",
          daa.gz.charAt(1),
        );
        const daeShinsal12 = getTwelveShinsalBySettings({
          baseBranch,
          targetBranch: daa.gz.charAt(1),
          era: shinsalEra,
          gaehwa: shinsalGaehwa,
        });

        return {
          기본정보: `${daa.age}대운 ${daa.gz} (${daa.startYear}~${daa.endYear})`,
          간지: daa.gz,
          오행강약: Object.fromEntries(
            Object.entries(daeOverlay.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: daeOverlay.totalsSub,
          형충회합: filterHarmonyTagsByScope(relWithDae, "대운"),
          신살: filterShinsalByScope(shinsalWithDae, "대운"),
          납음오행: daeNabeum
            ? {
                gz: daa.gz,
                nabeum: daeNabeum.name,
                element: daeNabeum.element,
                code: daeNabeum.code,
              }
            : null,
          십이운성: { pos: "대운", gz: daa.gz, unseong: daeUnseong },
          십이신살: {
            pos: "대운",
            gz: daa.gz,
            shinsal: daeShinsal12,
          },
        };
      }),
    };

    sections.push(section("대운", daeSectionData));
  }

  // ---- (3-2) 세운 연도별 리스트 ----
  for (const year of seYears) {
    const seGZ = getYearGanZhi(new Date(year, 5, 15));
    const daesAtYear = findDaeForYearMulti(daeList, year);
    const mainDaeForYear = daesAtYear.length > 0 ? daesAtYear[0] : null;

    const chain: LuckChain = {
      dae: mainDaeForYear ? mainDaeForYear.gz : null,
      se: normalizeGZ(seGZ || ""),
      wol: null,
      il: null,
    };

    const overlay = makeOverlayByLuck(unified, "세운", chain);
    const relWithSe = buildAllRelationTags({
      natal,
      daewoon: mainDaeForYear?.gz,
      sewoon: normalizeGZ(seGZ || ""),
      wolwoon: undefined,
      ilwoon: undefined,
    });
    const shinsalWithSe = buildShinsalTags({
      natal,
      daewoon: mainDaeForYear?.gz,
      sewoon: normalizeGZ(seGZ || ""),
      wolwoon: undefined,
      ilwoon: undefined,
      basis,
    });

    const seNabeum = getNabeum(normalizeGZ(seGZ || ""));
    const seUnseong = getTwelveUnseong(
      natal[2]?.charAt(0) ?? "",
      (seGZ || "").charAt(1),
    );
    const seShinsal = getTwelveShinsalBySettings({
      baseBranch,
      targetBranch: (seGZ || "").charAt(1),
      era: shinsalEra,
      gaehwa: shinsalGaehwa,
    });

    const sectionData: Record<string, unknown> = {
      세운: {
        기본정보: `${year}년 ${normalizeGZ(seGZ || "")}`,
        간지: normalizeGZ(seGZ || ""),
        오행강약: Object.fromEntries(
          Object.entries(overlay.elementPercent).map(([el, val]) => [
            `${el}(${elementToTenGod(dayEl, el as Element)})`,
            val,
          ]),
        ),
        십신강약: overlay.totalsSub,
        형충회합: filterHarmonyTagsByScope(relWithSe, "세운"),
        신살: filterShinsalByScope(shinsalWithSe, "세운"),
        납음오행: seNabeum
          ? {
              gz: normalizeGZ(seGZ || ""),
              nabeum: seNabeum.name,
              element: seNabeum.element,
              code: seNabeum.code,
            }
          : null,
        십이운성: {
          pos: "세운",
          gz: normalizeGZ(seGZ || ""),
          unseong: seUnseong,
        },
        십이신살: {
          pos: "세운",
          gz: normalizeGZ(seGZ || ""),
          shinsal: seShinsal,
        },
      },
    };

    sections.push(section(`세운 ${year}`, sectionData));
  }
}

// ============================
// 4) 월운 탭 섹션
// ============================

if (wolMonths.length > 0) {
  const daeUnion: DaewoonInfo[] = [];
  const seRepMap = new Map<string, { year: number; month: number }>();

  for (const ym of wolMonths) {
    const [y, m] = ym.split("-").map(Number);

    const daes = findDaeForMonthMulti(daeList, y, m);
    daes.forEach((d) => {
      if (!daeUnion.some((x) => x.gz === d.gz && x.startYear === d.startYear)) {
        daeUnion.push(d);
      }
    });

    const seYearsArr = resolveSeYear(y, m);
    const ses = findSeForMonthMulti(y, m);

    ses.forEach((se, idx) => {
      const seYear = seYearsArr[idx] ?? seYearsArr[seYearsArr.length - 1];
      if (!seRepMap.has(se)) {
        seRepMap.set(se, { year: seYear, month: m });
      }
    });
  }

  const [refYear] = wolMonths[0].split("-").map(Number);
  const seGZRef = getYearGanZhi(new Date(refYear, 5, 15));
  const seNormRef = normalizeGZ(seGZRef || "");

  // ---- (4-1) 월운 탭 상단: 대운 요약 ----
  if (daeUnion.length > 0) {
    const daeSectionData = {
      대운: daeUnion.map((daa) => {
        const daeChain: LuckChain = {
          dae: daa.gz,
          se: seNormRef || null,
          wol: null,
          il: null,
        };

        const daeOverlay = makeOverlayByLuck(unified, "대운", daeChain);
        const relWithDae = buildAllRelationTags({
          natal,
          daewoon: daa.gz,
          sewoon: seNormRef || undefined,
          wolwoon: undefined,
          ilwoon: undefined,
        });
        const shinsalWithDae = buildShinsalTags({
          natal,
          daewoon: daa.gz,
          sewoon: seNormRef || undefined,
          wolwoon: undefined,
          ilwoon: undefined,
          basis,
        });

        const daeNabeum = getNabeum(daa.gz);
        const daeUnseong = getTwelveUnseong(
          natal[2]?.charAt(0) ?? "",
          daa.gz.charAt(1),
        );
        const daeShinsal12 = getTwelveShinsalBySettings({
          baseBranch,
          targetBranch: daa.gz.charAt(1),
          era: shinsalEra,
          gaehwa: shinsalGaehwa,
        });

        return {
          기본정보: `${daa.age}대운 ${daa.gz} (${daa.startYear}~${daa.endYear})`,
          간지: daa.gz,
          오행강약: Object.fromEntries(
            Object.entries(daeOverlay.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: daeOverlay.totalsSub,
          형충회합: filterHarmonyTagsByScope(relWithDae, "대운"),
          신살: filterShinsalByScope(shinsalWithDae, "대운"),
          납음오행: daeNabeum
            ? {
                gz: daa.gz,
                nabeum: daeNabeum.name,
                element: daeNabeum.element,
                code: daeNabeum.code,
              }
            : null,
          십이운성: {
            pos: "대운",
            gz: daa.gz,
            unseong: daeUnseong,
          },
          십이신살: {
            pos: "대운",
            gz: daa.gz,
            shinsal: daeShinsal12,
          },
        };
      }),
    };

    sections.push(section("대운", daeSectionData));
  }

  // ---- (4-2) 월운 탭 상단: 세운 요약 ----
  const seKeys = Array.from(seRepMap.keys());

  if (seKeys.length > 0) {
    const seSectionData = {
      세운: seKeys.map((se) => {
        const rep = seRepMap.get(se)!;
        const y = rep.year;

        const daesForSeYear = findDaeForYearMulti(daeList, y);
        const mainDaeForSe = daesForSeYear[0] ?? daeUnion[0] ?? null;

        const seChain: LuckChain = {
          dae: mainDaeForSe ? mainDaeForSe.gz : null,
          se,
          wol: null,
          il: null,
        };

        const seOverlay = makeOverlayByLuck(unified, "세운", seChain);
        const relWithSeTop = buildAllRelationTags({
          natal,
          daewoon: mainDaeForSe?.gz,
          sewoon: se,
          wolwoon: undefined,
          ilwoon: undefined,
        });
        const shinsalWithSeTop = buildShinsalTags({
          natal,
          daewoon: mainDaeForSe?.gz,
          sewoon: se,
          wolwoon: undefined,
          ilwoon: undefined,
          basis,
        });

        const seNabeum = getNabeum(se);
        const seUnseong = getTwelveUnseong(
          natal[2]?.charAt(0) ?? "",
          se.charAt(1),
        );
        const seShinsal12 = getTwelveShinsalBySettings({
          baseBranch,
          targetBranch: se.charAt(1),
          era: shinsalEra,
          gaehwa: shinsalGaehwa,
        });

        return {
          기본정보: `${y}년 ${se}`,
          간지: se,
          오행강약: Object.fromEntries(
            Object.entries(seOverlay.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: seOverlay.totalsSub,
          형충회합: filterHarmonyTagsByScope(relWithSeTop, "세운"),
          신살: filterShinsalByScope(shinsalWithSeTop, "세운"),
          납음오행: seNabeum
            ? {
                gz: se,
                nabeum: seNabeum.name,
                element: seNabeum.element,
                code: seNabeum.code,
              }
            : null,
          십이운성: {
            pos: "세운",
            gz: se,
            unseong: seUnseong,
          },
          십이신살: {
            pos: "세운",
            gz: se,
            shinsal: seShinsal12,
          },
        };
      }),
    };

    sections.push(section("세운", seSectionData));
  }

  // ---- (4-3) 월운 리스트 (각 월별) ----
  for (const ym of wolMonths) {
    const [y, m] = ym.split("-").map(Number);
    const date = new Date(y, m - 1, 15);
    const wolGZ = getMonthGanZhi(date);

    const daes = findDaeForMonthMulti(daeList, y, m);
    const mainDae = daes.length > 0 ? daes[0] : null;

    const ses = findSeForMonthMulti(y, m);
    const mainSe = ses.length > 0 ? ses[ses.length - 1] : "";

    const chain: LuckChain = {
      dae: mainDae ? mainDae.gz : null,
      se: mainSe || null,
      wol: normalizeGZ(wolGZ || ""),
      il: null,
    };

    const overlay = makeOverlayByLuck(unified, "월운", chain);
    const relWithWol = buildAllRelationTags({
      natal,
      daewoon: mainDae?.gz,
      sewoon: mainSe || undefined,
      wolwoon: normalizeGZ(wolGZ || ""),
      ilwoon: undefined,
    });
    const shinsalWithWol = buildShinsalTags({
      natal,
      daewoon: mainDae?.gz,
      sewoon: mainSe || undefined,
      wolwoon: normalizeGZ(wolGZ || ""),
      ilwoon: undefined,
      basis,
    });

    const wolNabeum = getNabeum(normalizeGZ(wolGZ || ""));
    const wolUnseong = getTwelveUnseong(
      natal[2]?.charAt(0) ?? "",
      (wolGZ || "").charAt(1),
    );
    const wolShinsal = getTwelveShinsalBySettings({
      baseBranch,
      targetBranch: (wolGZ || "").charAt(1),
      era: shinsalEra,
      gaehwa: shinsalGaehwa,
    });

    const sectionData: Record<string, unknown> = {
      월운: {
        기본정보: `${ym} ${normalizeGZ(wolGZ || "")}`,
        간지: normalizeGZ(wolGZ || ""),
        오행강약: Object.fromEntries(
          Object.entries(overlay.elementPercent).map(([el, val]) => [
            `${el}(${elementToTenGod(dayEl, el as Element)})`,
            val,
          ]),
        ),
        십신강약: overlay.totalsSub,
        형충회합: filterHarmonyTagsByScope(relWithWol, "월운"),
        신살: filterShinsalByScope(shinsalWithWol, "월운"),
        납음오행: wolNabeum
          ? {
              gz: normalizeGZ(wolGZ || ""),
              nabeum: wolNabeum.name,
              element: wolNabeum.element,
              code: wolNabeum.code,
            }
          : null,
        십이운성: {
          pos: "월운",
          gz: normalizeGZ(wolGZ || ""),
          unseong: wolUnseong,
        },
        십이신살: {
          pos: "월운",
          gz: normalizeGZ(wolGZ || ""),
          shinsal: wolShinsal,
        },
      },
    };

    sections.push(section(`월운 ${ym}`, sectionData));
  }
}

// ============================
// 5) 일운 탭 섹션
// ============================

if (ilDays.length > 0) {
  const rule: DayBoundaryRule =
    (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  // ---- (5-1) 기준일(첫날)에서 상단 대운/세운/월운 요약 ----
  const [y0, m0, d0] = ilDays[0].split("-").map(Number);
  const baseDate0 = new Date(y0, m0 - 1, d0, 4, 0);

  if (!isNaN(baseDate0.getTime())) {
    const daes0 = findDaeForMonthMulti(daeList, y0, m0);
    const mainDae0 = daes0.length > 0 ? daes0[0] : null;

    const ses0 = findSeForMonthMulti(y0, m0);
    const mainSe0 = ses0.length > 0 ? ses0[ses0.length - 1] : "";

    const wolGZ0 = getMonthGanZhi(new Date(y0, m0 - 1, 15));
    const ilGZ0 = getDayGanZhi(baseDate0, rule);

    const normWol0 = normalizeGZ(wolGZ0 || "");
    const normSe0 = normalizeGZ(mainSe0 || "");
    const normIl0 = normalizeGZ(ilGZ0 || "");

    // (5-1-a) 상단 대운
    if (mainDae0) {
      const daeChain0: LuckChain = {
        dae: mainDae0.gz,
        se: normSe0,
        wol: normWol0,
        il: normIl0,
      };
      const daeOverlay0 = makeOverlayByLuck(unified, "대운", daeChain0);
      const relWithDae0 = buildAllRelationTags({
        natal,
        daewoon: mainDae0.gz,
        sewoon: normSe0,
        wolwoon: normWol0,
        ilwoon: normIl0,
      });
      const shinsalWithDae0 = buildShinsalTags({
        natal,
        daewoon: mainDae0.gz,
        sewoon: normSe0,
        wolwoon: normWol0,
        ilwoon: normIl0,
        basis,
      });

      const daeNabeum0 = getNabeum(mainDae0.gz);
      const daeUnseong0 = getTwelveUnseong(
        natal[2]?.charAt(0) ?? "",
        mainDae0.gz.charAt(1),
      );
      const daeShinsal12_0 = getTwelveShinsalBySettings({
        baseBranch,
        targetBranch: mainDae0.gz.charAt(1),
        era: shinsalEra,
        gaehwa: shinsalGaehwa,
      });

      sections.push(
        section("대운", {
          기본정보: `${mainDae0.age}대운 ${mainDae0.gz} (${mainDae0.startYear}~${mainDae0.endYear})`,
          간지: mainDae0.gz,
          오행강약: Object.fromEntries(
            Object.entries(daeOverlay0.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: daeOverlay0.totalsSub,
          형충회합: filterHarmonyTagsByScope(relWithDae0, "대운"),
          신살: filterShinsalByScope(shinsalWithDae0, "대운"),
          납음오행: daeNabeum0
            ? {
                gz: mainDae0.gz,
                nabeum: daeNabeum0.name,
                element: daeNabeum0.element,
                code: daeNabeum0.code,
              }
            : null,
          십이운성: { pos: "대운", gz: mainDae0.gz, unseong: daeUnseong0 },
          십이신살: {
            pos: "대운",
            gz: mainDae0.gz,
            shinsal: daeShinsal12_0,
          },
        }),
      );
    }

    // (5-1-b) 상단 세운
    if (normSe0) {
      const seChain0: LuckChain = {
        dae: mainDae0 ? mainDae0.gz : null,
        se: normSe0,
        wol: normWol0,
        il: normIl0,
      };
      const seOverlay0 = makeOverlayByLuck(unified, "세운", seChain0);
      const relWithSe0 = buildAllRelationTags({
        natal,
        daewoon: mainDae0?.gz,
        sewoon: normSe0,
        wolwoon: normWol0,
        ilwoon: normIl0,
      });
      const shinsalWithSe0 = buildShinsalTags({
        natal,
        daewoon: mainDae0?.gz,
        sewoon: normSe0,
        wolwoon: normWol0,
        ilwoon: normIl0,
        basis,
      });

      const seNabeum0 = getNabeum(normSe0);
      const seUnseong0 = getTwelveUnseong(
        natal[2]?.charAt(0) ?? "",
        normSe0.charAt(1),
      );
      const seShinsal12_0 = getTwelveShinsalBySettings({
        baseBranch,
        targetBranch: normSe0.charAt(1),
        era: shinsalEra,
        gaehwa: shinsalGaehwa,
      });

      sections.push(
        section("세운", {
          기본정보: `${y0}년 ${normSe0}`,
          간지: normSe0,
          오행강약: Object.fromEntries(
            Object.entries(seOverlay0.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: seOverlay0.totalsSub,
          형충회합: filterHarmonyTagsByScope(relWithSe0, "세운"),
          신살: filterShinsalByScope(shinsalWithSe0, "세운"),
          납음오행: seNabeum0
            ? {
                gz: normSe0,
                nabeum: seNabeum0.name,
                element: seNabeum0.element,
                code: seNabeum0.code,
              }
            : null,
          십이운성: { pos: "세운", gz: normSe0, unseong: seUnseong0 },
          십이신살: { pos: "세운", gz: normSe0, shinsal: seShinsal12_0 },
        }),
      );
    }

    // (5-1-c) 상단 월운
    if (normWol0) {
      const wolChain0: LuckChain = {
        dae: mainDae0 ? mainDae0.gz : null,
        se: normSe0,
        wol: normWol0,
        il: normIl0,
      };
      const wolOverlay0 = makeOverlayByLuck(unified, "월운", wolChain0);
      const relWithWol0 = buildAllRelationTags({
        natal,
        daewoon: mainDae0?.gz,
        sewoon: normSe0,
        wolwoon: normWol0,
        ilwoon: normIl0,
      });
      const shinsalWithWol0 = buildShinsalTags({
        natal,
        daewoon: mainDae0?.gz,
        sewoon: normSe0,
        wolwoon: normWol0,
        ilwoon: normIl0,
        basis,
      });

      const wolNabeum0 = getNabeum(normWol0);
      const wolUnseong0 = getTwelveUnseong(
        natal[2]?.charAt(0) ?? "",
        normWol0.charAt(1),
      );
      const wolShinsal12_0 = getTwelveShinsalBySettings({
        baseBranch,
        targetBranch: normWol0.charAt(1),
        era: shinsalEra,
        gaehwa: shinsalGaehwa,
      });

      sections.push(
        section("월운", {
          기본정보: `${y0}-${String(m0).padStart(2, "0")} ${normWol0}`,
          간지: normWol0,
          오행강약: Object.fromEntries(
            Object.entries(wolOverlay0.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: wolOverlay0.totalsSub,
          형충회합: filterHarmonyTagsByScope(relWithWol0, "월운"),
          신살: filterShinsalByScope(shinsalWithWol0, "월운"),
          납음오행: wolNabeum0
            ? {
                gz: normWol0,
                nabeum: wolNabeum0.name,
                element: wolNabeum0.element,
                code: wolNabeum0.code,
              }
            : null,
          십이운성: { pos: "월운", gz: normWol0, unseong: wolUnseong0 },
          십이신살: { pos: "월운", gz: normWol0, shinsal: wolShinsal12_0 },
        }),
      );
    }
  }

  // ---- (5-2) 날짜별 일운 상세섹션 ----
  for (const dateStr of ilDays) {
    const [y, m, d] = dateStr.split("-").map(Number);
    const baseDate = new Date(y, m - 1, d, 4, 0);
    if (isNaN(baseDate.getTime())) continue;

    const daes = findDaeForMonthMulti(daeList, y, m);
    const mainDae = daes.length > 0 ? daes[0] : null;

    const ses = findSeForMonthMulti(y, m);
    const mainSe = ses.length > 0 ? ses[ses.length - 1] : "";

    const wolGZ = getMonthGanZhi(new Date(y, m - 1, 15));
    const ilGZ = getDayGanZhi(baseDate, rule);

    const normWol = normalizeGZ(wolGZ || "");
    const normSe = normalizeGZ(mainSe || "");
    const normIl = normalizeGZ(ilGZ || "");

    const chain: LuckChain = {
      dae: mainDae ? mainDae.gz : null,
      se: normSe || null,
      wol: normWol,
      il: normIl,
    };

    const overlay = makeOverlayByLuck(unified, "일운", chain);
    const relWithIl = buildAllRelationTags({
      natal,
      daewoon: mainDae?.gz,
      sewoon: normSe || undefined,
      wolwoon: normWol || undefined,
      ilwoon: normIl || undefined,
    });
    const shinsalWithIl = buildShinsalTags({
      natal,
      daewoon: mainDae?.gz,
      sewoon: normSe || undefined,
      wolwoon: normWol || undefined,
      ilwoon: normIl || undefined,
      basis,
    });

    const ilNabeum = getNabeum(normIl);
    const ilUnseong = getTwelveUnseong(
      natal[2]?.charAt(0) ?? "",
      normIl.charAt(1),
    );
    const ilShinsal12 = getTwelveShinsalBySettings({
      baseBranch,
      targetBranch: normIl.charAt(1),
      era: shinsalEra,
      gaehwa: shinsalGaehwa,
    });

    const sectionData: Record<string, unknown> = {
      일운: {
        기본정보: `${dateStr} ${normIl}`,
        간지: normIl,
        오행강약: Object.fromEntries(
          Object.entries(overlay.elementPercent).map(([el, val]) => [
            `${el}(${elementToTenGod(dayEl, el as Element)})`,
            val,
          ]),
        ),
        십신강약: overlay.totalsSub,
        형충회합: filterHarmonyTagsByScope(relWithIl, "일운"),
        신살: filterShinsalByScope(shinsalWithIl, "일운"),
        납음오행: ilNabeum
          ? {
              gz: normIl,
              nabeum: ilNabeum.name,
              element: ilNabeum.element,
              code: ilNabeum.code,
            }
          : null,
        십이운성: {
          pos: "일운",
          gz: normIl,
          unseong: ilUnseong,
        },
        십이신살: {
          pos: "일운",
          gz: normIl,
          shinsal: ilShinsal12,
        },
      },
    };

    sections.push(section(`일운 ${dateStr}`, sectionData));
  }
}

// ============================
// 최종 프롬프트
// ============================

const body = sections.filter((s) => s.trim().length > 0).join("\n\n");
const guide = ``;

return [header, body, guide].join("\n\n");

}
