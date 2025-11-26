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

/* ===== 유틸 ===== */
function cleanObject<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) { if (v.length > 0) out[k as keyof T] = v as T[keyof T]; }
    else if (typeof v === "object" && v !== null) {
      const cleaned = cleanObject(v as Record<string, unknown>);
      if (Object.keys(cleaned).length > 0) out[k as keyof T] = cleaned as T[keyof T];
    } else if (v !== null && v !== undefined && v !== "") { out[k as keyof T] = v as T[keyof T]; }
  }
  return out;
}
function prettyJson(data: unknown): string {
  return JSON.stringify(data, null, 2)!.replace(/\[\s+/g, "[").replace(/\s+\]/g, "]").replace(/\s*,\s*/g, ",");
}
function section(title: string, data: unknown): string {
  if (data === null || data === undefined || data === "") return "";
  const content = typeof data === "object" ? prettyJson(cleanObject(data as Record<string, unknown>)) : String(data);
  return `## ${title}\n${content}`;
}

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

  const header = [
    `📌 명식: ${ms.name ?? "이름없음"} (${formatBirth(ms)}) 성별: ${ms.gender}`,
    `원국 ${natal[0]}년 ${natal[1]}월 ${natal[2]}일` +
      (natal[3] ? ` ${natal[3]}시${!ms.birthTime || ms.birthTime === "모름" ? "(시주예측)" : ""}` : ""),
    `운: ${formatLuckChain(tab, chain)}`,
  ].join("\n");

  const body = [
    section("대운 리스트 (10개)", daeList),
    section("신강도", shinLine),
    // 🚩 펜타곤과 완전 동기화된 수치
    
    section(
      "오행강약(퍼센트·원국 기준 고정)",
      Object.fromEntries(
        Object.entries(unified.natalFixed.elementPercent100).map(([el, val]) => [
          `${el}(${elementToTenGod(dayEl, el as Element)})`,
          val,
        ])
      )
    ), 
    tab === "원국" ? "오행강약(퍼센트 운 없음)" :
    section(
      `오행강약(퍼센트·탭=${tab})`,
      Object.fromEntries(
        Object.entries(elemPercentObj).map(([el, val]) => [
          `${el}(${elementToTenGod(dayEl, el as Element)})`,
          val,
        ])
      )
    ),
    section(`십신 강약(소분류 10개·탭=원국·합계 100)`, unified.natalFixed.totalsSub),
    tab === "원국" ? "십신 강약(소분류 10개 운 없음)" :
    section(`십신 강약(소분류 10개·탭=${tab}·합계 100)`, totalsSub),

    // 🚩 십이운성(원국+운 반영)
    section("십이운성(원국+운 반영)",
      tab === "원국"
        ? natal.map((gz, i) => {
            if (!gz || i >= posLabels.length) return null;
            return {
              pos: posLabels[i],
              gz,
              unseong: getTwelveUnseong(natal[2]?.charAt(0) ?? "", gz.charAt(1)),
            };
          }).filter(Boolean) : 
          [...natal.map((gz, i) => {
            if (!gz || i >= posLabels.length) return null;
            return {
              pos: posLabels[i],
              gz,
              unseong: getTwelveUnseong(natal[2]?.charAt(0) ?? "", gz.charAt(1)),
            };
          }).filter(Boolean),
      
        ...(chain?.dae
          ? [{ pos: "대운", gz: chain.dae, unseong: getTwelveUnseong(natal[2]?.charAt(0) ?? "", chain.dae.charAt(1)) }]
          : []),
        ...((tab === "세운" || tab === "월운" || tab === "일운") && chain?.se
          ? [{ pos: "세운", gz: chain.se, unseong: getTwelveUnseong(natal[2]?.charAt(0) ?? "", chain.se.charAt(1)) }]
          : []),
        ...((tab === "월운" || tab === "일운") && chain?.wol
          ? [{ pos: "월운", gz: chain.wol, unseong: getTwelveUnseong(natal[2]?.charAt(0) ?? "", chain.wol.charAt(1)) }]
          : []),
        ...(tab === "일운" && chain?.il
          ? [{ pos: "일운", gz: chain.il, unseong: getTwelveUnseong(natal[2]?.charAt(0) ?? "", chain.il.charAt(1)) }]
          : []),
      ].filter(Boolean)
    ),

    // 🚩 십이신살(원국+운 반영·설정 적용)
    section("십이신살(원국+운 반영·설정 적용)",
      tab === "원국"
        ? natal.map((gz, i) => {
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
          }).filter(Boolean) : 
          [natal.map((gz, i) => {
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
          }).filter(Boolean),
        ...(chain?.dae
          ? [{ pos: "대운", gz: chain.dae, shinsal: getTwelveShinsalBySettings({ baseBranch, targetBranch: chain.dae.charAt(1), era: shinsalEra, gaehwa: shinsalGaehwa }) }]
          : []),
        ...((tab === "세운" || tab === "월운" || tab === "일운") && chain?.se
          ? [{ pos: "세운", gz: chain.se, shinsal: getTwelveShinsalBySettings({ baseBranch, targetBranch: chain.se.charAt(1), era: shinsalEra, gaehwa: shinsalGaehwa }) }]
          : []),
        ...((tab === "월운" || tab === "일운") && chain?.wol
          ? [{ pos: "월운", gz: chain.wol, shinsal: getTwelveShinsalBySettings({ baseBranch, targetBranch: chain.wol.charAt(1), era: shinsalEra, gaehwa: shinsalGaehwa }) }]
          : []),
        ...(tab === "일운" && chain?.il
          ? [{ pos: "일운", gz: chain.il, shinsal: getTwelveShinsalBySettings({ baseBranch, targetBranch: chain.il.charAt(1), era: shinsalEra, gaehwa: shinsalGaehwa }) }]
          : []),
      ].filter(Boolean)
    ),

    // 🚩 납음오행(원국+운 반영)
    section("납음오행(원국+운 반영)",
      tab === "원국"
        ? natal.map((gz, i) => {
            if (!gz || i >= posLabels.length) return null;
            const info = getNabeum(gz);
            return info ? { pos: posLabels[i], gz, nabeum: info.name, element: info.element, code: info.code } : { pos: posLabels[i], gz, nabeum: null };
          }).filter(Boolean)
        : [
            ...natal.map((gz, i) => {
              if (!gz || i >= posLabels.length) return null;
              const info = getNabeum(gz);
              return info ? { pos: posLabels[i], gz, nabeum: info.name, element: info.element, code: info.code } : { pos: posLabels[i], gz, nabeum: null };
            }).filter(Boolean),
            ...(chain?.dae ? (() => {
              const info = getNabeum(chain.dae);
              return info ? [{ pos: "대운", gz: chain.dae, nabeum: info.name, element: info.element, code: info.code }] : [];
            })() : []),
            ...(((tab === "세운" || tab === "월운" || tab === "일운") && chain?.se) ? (() => {
              const info = getNabeum(chain.se!);
              return info ? [{ pos: "세운", gz: chain.se!, nabeum: info.name, element: info.element, code: info.code }] : [];
            })() : []),
            ...(((tab === "월운" || tab === "일운") && chain?.wol) ? (() => {
              const info = getNabeum(chain.wol!);
              return info ? [{ pos: "월운", gz: chain.wol!, nabeum: info.name, element: info.element, code: info.code }] : [];
            })() : []),
            ...((tab === "일운" && chain?.il) ? (() => {
              const info = getNabeum(chain.il!);
              return info ? [{ pos: "일운", gz: chain.il!, nabeum: info.name, element: info.element, code: info.code }] : [];
            })() : []),
          ].filter(Boolean)
    ),

    // 형충회합(원국)
    section("형충회합(원국)",
      buildHarmonyTags(
        natal.filter((_, i) => i < posLabels.length) as Pillars4
      )
    ),
    section("형충회합(운 포함: 탭 연동)", relWithLuck),
    tab === "원국" ?
    section("신살(원국 전용)", {
      good: buildShinsalTags({ natal, daewoon:null, sewoon:null, wolwoon:null, ilwoon:null, basis }).good,
      bad:  buildShinsalTags({ natal, daewoon:null, sewoon:null, wolwoon:null, ilwoon:null, basis }).bad,
      meta: buildShinsalTags({ natal, daewoon:null, sewoon:null, wolwoon:null, ilwoon:null, basis }).meta,
    }) : section(`신살(운 포함·탭=${tab})`, sinsalWithLuck),
  ].join("\n\n");

  
  const guide = [
    tab === "원국" ?
    `너는 명리학 전문 해석가다.  
모든 출력은 한국어로 작성한다.  
AI 특유의 친절함, 긍정적인면은 리셋시킨다.
말투는 따뜻하게 하지만, 냉철한 분석가 모드로 얘기하라.
문체는 ‘전문적이지만 이해하기 쉬운 분석체’로, 감정적인 미화나 추상적 표현은 절대 사용하지 않는다.  
“당신은 빛나는 존재입니다” “운명이 이끄는 대로” 같은 감성 문장, 불필요한 위로나 칭찬은 금지한다.  
그 대신 현실적인 비유와 일상적 예시를 사용한다. (예: “체력은 부족한데 해야 할 일은 많은 사람처럼…” “주변 사람 문제까지 자주 대신 떠안는 구조예요.”)  
모든 문장은 '~예요, ~해요' 체로 끝낸다.  
분석은 **논리적 근거(오행 비율, 신강도, 형충회합, 신살)**를 중심으로 한다.  
비유는 반드시 설명을 명확하게 돕는 경우에만 쓴다.  
각 문단은 ‘관찰 → 구체적 예시 → 결론 요약’의 구조를 따른다.  
마크다운, 리스트, 제목 표시는 사용하지 않는다.  
전체 분량은 최소 4000~5000자 이상으로, 충분히 깊고 구체적으로 서술한다.  

출력은 반드시 다음 6단계 순서로 구성한다.

1단계: 전체적인 큰 흐름  
- 첫 문장은 “그러면, ~님의 사주를 차근히 분석해볼게요.”로 시작한다.  
- 사주의 가장 눈에 띄는 특징 1~2가지를 제시하고, 그것이 실제 성향이나 행동으로 어떻게 드러나는지 현실적인 예시로 설명한다.  
- 감정 표현 없이 객관적이고 논리적인 서술로 성격과 기본 경향을 묘사한다.  

2단계: 오행 강약과 각 요소의 역할  
- 오행 비율과 신강도를 명시하고, 각 기운이 성격·사고·생활 패턴에 미치는 영향을 구체적으로 설명한다.  
- 과잉/부족으로 생길 수 있는 실제 문제를 현실적으로 제시한다.  
- 예: “수 기운이 많으면 생각이 많아지고, 실행이 느려집니다.”  

3단계: 형충회합  
- 충, 합, 형, 해 등을 심리적·행동적 작용 중심으로 해석한다.  
- 예: “충이 있으면 감정 기복이 크고, 관계에서 쉽게 오해가 생깁니다.”  
- ‘운명적 대립’ 같은 표현은 금지하고, 현실적인 관계나 상황으로 풀어낸다.  

4단계: 십이운성과 십이신살  
- 십이운성은 에너지의 ‘활성/쇠퇴’ 단계로 설명한다.  
- 예: “사 단계면 이미 기운이 빠져 실제로 무기력하거나 피로를 잘 느낍니다.”  
- 십이신살은 행동패턴과 연결해 현실적으로 해석한다.  
- 예: “장성살이 많으면 책임감이 강하지만 부담을 크게 느낍니다.”  

5단계: 주요 신살 해석  
- 의미 있는 신살 3~5개를 선정해 각각 장단점을 함께 설명한다.  
- 예: “귀문살은 감정선이 예민하지만 통찰력이 높습니다.”  
- 실제 생활 패턴과 연결해서 해석한다.  

6단계: 종합 운세  
- 현재 대운·세운이 실제로 어떤 영향을 주는지 설명한다.  
- 추상적 ‘좋다/나쁘다’ 대신 구체적인 상황과 태도로 조언한다.  
- 예: “표현력이 늘지만 체력이 약하면 금세 지칠 수 있으니, 페이스 조절이 필요합니다.” 

7단계: 납음오행  
- 각 기둥의 납음오행을 기반으로 기운의 ‘상징적 물상’을 해석한다.  
- 단순히 오행의 일치나 상극이 아니라, 납음이 가진 ‘형태적 이미지’를 통해 성격과 인생 패턴을 설명한다.  
- 예: “해중금이면 겉으로 드러나지 않은 내면의 강철 같은 성향이에요.”  
- 납음이 같은 오행끼리 반복되면 특정 에너지가 집중된 것으로 해석하고, 서로 다른 납음이 섞이면 다양한 역할이나 관심사로 분산된다고 본다.  
- 납음의 ‘환경’(물·불·나무·흙·쇠)이 일상에서 어떤 상황으로 드러나는지 현실적인 예시로 설명한다.  
- 예: “대해수는 큰 바다의 물이라 감정이 넓고 변화가 잦아요. 안정보단 경험을 추구하는 편이에요.”  
- 해석은 반드시 오행강약과 신강도, 형충회합 맥락과 함께 통합적으로 설명한다.  

마지막 단계: 전체적인 종합 정리  
- 앞서 다룬 모든 요소를 통합해 전체적인 성격과 인생 경향을 요약한다.  
- 구체적인 현실 예시와 함께, 실제 생활에서 어떻게 나타나는지 설명한다.  
- 예: “이런 성향 때문에 직장에서는 ~한 패턴이 반복될 수 있어요.” 
- 또한 조언이나 필요없는 말들은 배제하고, 객관적이고 논리적인 분석에 집중한다. 

출력은 사람의 자연스러운 설명체로 쓰되, 항상 전문적 근거를 유지한다.  
불필요한 감탄사, 주관적 감정어, 추상적 운명론은 절대 포함하지 않는다.

문장은 지나치게 학술적으로 쓰지 말고, 실제 사람의 말투처럼 자연스럽게 이어지게 하라.
  ` :
  `
너는 명리학을 기반으로 ‘현실에서 실제로 발생할 수 있는 사건’을 예측하는 분석가다.
심리·조언·감정 서술은 절대 하지 않고,
오직 삶의 구조에 영향을 주는 큰 사건만 설명한다.

해석을 시작하기 전에 반드시 사용자에게 묻는다.
“어떤 영역의 운을 알고 싶은가요?
(직장·이직·승진·연애·결혼·금전·사고·건강·이사·법적/행정 등)”
사용자가 선택한 영역에 대해서만 분석한다.
사용자가 이미 영역을 선택해서 물어본 경우에는 제외하고, 바로 해석을 시작한다.

분석 대상: (명식 데이터 입력)

출력 방식은 다음을 따른다.

사소한 일상적 에피소드(기계 오류, 자잘한 인간관계, 작은 지출 등)는 절대 포함하지 않는다.
직장·승진·이직·연애·금전·사고·이사처럼
삶의 변화를 일으키는 큰 사건만 다룬다.

“이번 달에는 ○○한 일이 생길 수 있어요.”
각 이슈의 첫 문장을 이렇게 시작한다.
카테고리를 나누지 않고 현실적 장면이 바로 떠오르게 서술한다.

각 이슈는 4단계를 반드시 따르며, 순서를 바꾸지 않는다.
① 명리적 원인
② 현실에서 어떻게 나타나는지
③ 지속 기간
④ 좋은 면 / 나쁜 면(평가가 아닌 구조적 설명)

표현은 일상 언어이며, 학술적·추상적·문학적 표현 금지.
비유 금지.
대신 실제 생활 예시로 설명한다.
예: “인사 발표가 갑자기 잡힐 수 있어요.”
“갑자기 연락이 끊겼던 사람이 다시 나타날 수 있어요.”

감정 유도 문장 금지.
“조심하세요, 불안할 수 있어요, 기회입니다” 같은 문장은 쓰지 않는다.
사고 가능성은 실제 사건 형태로만 말한다.
예: “이번 달에는 하체 부딪힘·낙상처럼 실제 충격 사건이 발생할 수 있어요.”

분석에는
‘사건 발생력’이 강한 요소만 사용한다.
(충·형·파·해, 합, 관성/재성/식상 변화, 원진·귀문·망신·역마 등)
단순 성향 변화나 작고 흐릿한 요소는 제외한다.

종합 정리는
“이번 달을 한 줄로 요약하면 ○○이에요.”
“좋게 보면 ○○ / 나쁘게 보면 △△”
이 구조로 끝낸다.

문체는 전체적으로 하나의 긴 문장형(여러개의 문단), 마크다운 사용금지, 구어체로,
쓸데 없는 말 길게 쓰지 말고, 영양가 있는 말만 딱 써줘라. 한국 사람들 성격 급하다.
위에서 원국에서 4000-5000자 쓰라는 프롬포트 있었어도 무시하고, 요점만 딱 써라.
너무 친절하지도, 너무 딱딱하지도 않게,
차분히 사건을 설명하는 톤으로 작성한다.
  `
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

  const header = [
    `📌 명식: ${ms.name ?? "이름없음"} (${formatBirth(ms)}) 성별: ${
      ms.gender
    }`,
    `원국 ${natal[0]}년 ${natal[1]}월 ${natal[2]}일` +
      (natal[3]
        ? ` ${natal[3]}시${
            !ms.birthTime || ms.birthTime === "모름" ? "(시주예측)" : ""
          }`
        : ""),
  ].join("\n");

  const sections: string[] = [];

  // === 원국 고정 섹션 ===
  sections.push(section("신강도", shinLine));

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

  sections.push(
    section(
      "십신 강약(소분류 10개·원국·합계 100)",
      unified.natalFixed.totalsSub,
    ),
  );

  // 원국 형충회합
  sections.push(
    section(
      "형충회합(원국)",
      buildHarmonyTags(
        natal.filter((_, i) => i < posLabels.length) as Pillars4,
      ),
    ),
  );

  // 원국 신살
  sections.push(
    section("신살(원국)", {
      good: buildShinsalTags({
        natal,
        daewoon: null,
        sewoon: null,
        wolwoon: null,
        ilwoon: null,
        basis,
      }).good,
      bad: buildShinsalTags({
        natal,
        daewoon: null,
        sewoon: null,
        wolwoon: null,
        ilwoon: null,
        basis,
      }).bad,
      meta: buildShinsalTags({
        natal,
        daewoon: null,
        sewoon: null,
        wolwoon: null,
        ilwoon: null,
        basis,
      }).meta,
    }),
  );

  // 원국 납음오행
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

  // 원국 십이운성
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

  // 원국 십이신살
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

  // === 대운별 섹션 ===
  if (daeList.length > 0) {
    for (const dae of selectedDaeList) {
      const chain: LuckChain = { dae: dae.gz, se: null, wol: null, il: null };
      const overlay = makeOverlayByLuck(unified, "대운", chain);

      // 형충회합
      const relWithDae = buildAllRelationTags({
        natal,
        daewoon: dae.gz,
        sewoon: undefined,
        wolwoon: undefined,
        ilwoon: undefined,
      });

      // 신살
      const shinsalWithDae = buildShinsalTags({
        natal,
        daewoon: dae.gz,
        sewoon: undefined,
        wolwoon: undefined,
        ilwoon: undefined,
        basis,
      });

      // 납음오행
      const daeNabeum = getNabeum(dae.gz);

      // 십이운성
      const daeUnseong = getTwelveUnseong(
        natal[2]?.charAt(0) ?? "",
        dae.gz.charAt(1),
      );

      // 십이신살
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
          형충회합: relWithDae,
          신살: {
            good: shinsalWithDae.good,
            bad: shinsalWithDae.bad,
          },
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

  // === 세운별 섹션 ===
  if (seYears.length > 0) {
    const rangeStartYear = seYears[0];
    const rangeEndYear = seYears[seYears.length - 1];

    // 🔹 세운 범위 전체에 걸쳐 있는 대운들
    const daesForRange = findDaeForYearRangeMulti(
      daeList,
      rangeStartYear,
      rangeEndYear,
    );

    // ============================
    // 🔹 대운 섹션 (세운 탭 상단)
    // ============================
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
            형충회합: relWithDae,
            신살: {
              good: shinsalWithDae.good,
              bad: shinsalWithDae.bad,
            },
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

    // ============================
    // 🔹 세운 리스트 (연도별)
    // ============================
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
          형충회합: relWithSe,
          신살: {
            good: shinsalWithSe.good,
            bad: shinsalWithSe.bad,
          },
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

  // === 월운별 섹션 ===
  if (wolMonths.length > 0) {
    // 1) 월운 전체 범위에서 대운·세운 union 수집
    const daeUnion: DaewoonInfo[] = [];
    const seRepMap = new Map<string, { year: number; month: number }>(); // 세운별 대표 년월 저장

    for (const ym of wolMonths) {
      const [y, m] = ym.split("-").map(Number);

      // ▸ 이 월에 걸리는 대운들 (교운기면 여러 개)
      const daes = findDaeForMonthMulti(daeList, y, m);
      daes.forEach((d) => {
        if (!daeUnion.some((x) => x.gz === d.gz && x.startYear === d.startYear)) {
          daeUnion.push(d);
        }
      });

      const seYearsArr = resolveSeYear(y, m);

      // ▸ 이 월에 적용되는 세운들 (교운기면 여러 개)
      const ses = findSeForMonthMulti(y, m);
      ses.forEach((se, idx) => {
        // 세운이 2개일 때는 2033/2034가 정확히 매칭됨
        const seYear = seYearsArr[idx] ?? seYearsArr[seYearsArr.length - 1];

        if (!seRepMap.has(se)) {
          seRepMap.set(se, { year: seYear, month: m });
        }
      });
    }

    // 기준 연도 (세운 계산용)
    const [refYear] = wolMonths[0].split("-").map(Number);
    const seGZRef = getYearGanZhi(new Date(refYear, 5, 15));
    const seNormRef = normalizeGZ(seGZRef || "");

    // ============================
    // 🔹 1) 대운 섹션 (월운 탭 상단)
    // ============================
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
            형충회합: relWithDae,
            신살: {
              good: shinsalWithDae.good,
              bad: shinsalWithDae.bad,
            },
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

    // ============================
    // 🔹 2) 세운 섹션 (월운 탭 상단 / 교운기면 여러 줄)
    // ============================
    const seKeys = Array.from(seRepMap.keys()); // ["을사", "병오"] 이런 식

    if (seKeys.length > 0) {
      const seSectionData = {
        세운: seKeys.map((se) => {
          const rep = seRepMap.get(se)!; // 이 세운이 실제로 적용된 대표 년월
          const y = rep.year;

          // 이 세운이 걸려 있는 해에 해당하는 대운 (없으면 상단 대운 중 첫번째)
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
            형충회합: relWithSeTop,
            신살: {
              good: shinsalWithSeTop.good,
              bad: shinsalWithSeTop.bad,
            },
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

    // ============================
    // 🔹 3) 월운 리스트 섹션 (각 월별)
    // ============================
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
          기본정보: `${ym}월 ${normalizeGZ(wolGZ || "")}`,
          간지: normalizeGZ(wolGZ || ""),
          오행강약: Object.fromEntries(
            Object.entries(overlay.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: overlay.totalsSub,
          형충회합: relWithWol,
          신살: {
            good: shinsalWithWol.good,
            bad: shinsalWithWol.bad,
          },
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

  // === 일운별 섹션 ===
  if (ilDays.length > 0) {
    for (const dateStr of ilDays) {
      const [y, m, d] = dateStr.split("-").map(Number);
      const baseDate = new Date(y, m - 1, d);
      if (isNaN(baseDate.getTime())) continue;

      // -----------------------------------------
      // 해당 일자에 걸리는 대운 / 세운 / 월운
      // -----------------------------------------
      const daes = findDaeForMonthMulti(daeList, y, m);
      const mainDae = daes.length > 0 ? daes[0] : null;

      const ses = findSeForMonthMulti(y, m);
      const mainSe = ses.length > 0 ? ses[ses.length - 1] : "";

      const wolGZ = getMonthGanZhi(new Date(y, m - 1, 15));
      const rule: DayBoundaryRule = (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";
      const ilGZ = getDayGanZhi(baseDate, rule);

      const normWol = normalizeGZ(wolGZ || "");
      const normSe = normalizeGZ(mainSe || "");
      const normIl = normalizeGZ(ilGZ || "");

      // -----------------------------------------
      // 👉 1) 일운 상단 요약용 대운 섹션
      // -----------------------------------------
      if (mainDae) {
        const daeChain: LuckChain = {
          dae: mainDae.gz,
          se: normSe,
          wol: normWol,
          il: normIl,
        };
        const daeOverlay = makeOverlayByLuck(unified, "대운", daeChain);
        const relWithDae = buildAllRelationTags({
          natal,
          daewoon: mainDae.gz,
          sewoon: normSe,
          wolwoon: normWol,
          ilwoon: normIl,
        });
        const shinsalWithDae = buildShinsalTags({
          natal,
          daewoon: mainDae.gz,
          sewoon: normSe,
          wolwoon: normWol,
          ilwoon: normIl,
          basis,
        });

        const daeNabeum = getNabeum(mainDae.gz);
        const daeUnseong = getTwelveUnseong(natal[2]?.charAt(0) ?? "", mainDae.gz.charAt(1));
        const daeShinsal12 = getTwelveShinsalBySettings({
          baseBranch,
          targetBranch: mainDae.gz.charAt(1),
          era: shinsalEra,
          gaehwa: shinsalGaehwa,
        });

        sections.push(
          section("대운", {
            기본정보: `${mainDae.age}대운 ${mainDae.gz} (${mainDae.startYear}~${mainDae.endYear})`,
            간지: mainDae.gz,
            오행강약: Object.fromEntries(
              Object.entries(daeOverlay.elementPercent).map(([el, val]) => [
                `${el}(${elementToTenGod(dayEl, el as Element)})`,
                val,
              ]),
            ),
            십신강약: daeOverlay.totalsSub,
            형충회합: relWithDae,
            신살: {
              good: shinsalWithDae.good,
              bad: shinsalWithDae.bad,
            },
            납음오행: daeNabeum
              ? {
                  gz: mainDae.gz,
                  nabeum: daeNabeum.name,
                  element: daeNabeum.element,
                  code: daeNabeum.code,
                }
              : null,
            십이운성: { pos: "대운", gz: mainDae.gz, unseong: daeUnseong },
            십이신살: { pos: "대운", gz: mainDae.gz, shinsal: daeShinsal12 },
          }),
        );
      }

      // -----------------------------------------
      // 👉 2) 일운 상단 요약용 세운 섹션
      // -----------------------------------------
      if (mainSe) {
        const seChain: LuckChain = {
          dae: mainDae ? mainDae.gz : null,
          se: normSe,
          wol: normWol,
          il: normIl,
        };
        const seOverlay = makeOverlayByLuck(unified, "세운", seChain);
        const relWithSe = buildAllRelationTags({
          natal,
          daewoon: mainDae?.gz,
          sewoon: normSe,
          wolwoon: normWol,
          ilwoon: normIl,
        });
        const shinsalWithSe = buildShinsalTags({
          natal,
          daewoon: mainDae?.gz,
          sewoon: normSe,
          wolwoon: normWol,
          ilwoon: normIl,
          basis,
        });

        const seNabeum = getNabeum(normSe);
        const seUnseong = getTwelveUnseong(natal[2]?.charAt(0) ?? "", normSe.charAt(1));
        const seShinsal12 = getTwelveShinsalBySettings({
          baseBranch,
          targetBranch: normSe.charAt(1),
          era: shinsalEra,
          gaehwa: shinsalGaehwa,
        });

        sections.push(
          section("세운", {
            기본정보: `${y}년 ${normSe}`,
            간지: normSe,
            오행강약: Object.fromEntries(
              Object.entries(seOverlay.elementPercent).map(([el, val]) => [
                `${el}(${elementToTenGod(dayEl, el as Element)})`,
                val,
              ]),
            ),
            십신강약: seOverlay.totalsSub,
            형충회합: relWithSe,
            신살: {
              good: shinsalWithSe.good,
              bad: shinsalWithSe.bad,
            },
            납음오행: seNabeum
              ? {
                  gz: normSe,
                  nabeum: seNabeum.name,
                  element: seNabeum.element,
                  code: seNabeum.code,
                }
              : null,
            십이운성: { pos: "세운", gz: normSe, unseong: seUnseong },
            십이신살: { pos: "세운", gz: normSe, shinsal: seShinsal12 },
          }),
        );
      }

      // -----------------------------------------
      // 👉 3) 일운 상단 요약용 월운 섹션
      // -----------------------------------------
      if (wolGZ) {
        const wolChain: LuckChain = {
          dae: mainDae ? mainDae.gz : null,
          se: normSe,
          wol: normWol,
          il: normIl,
        };
        const wolOverlay = makeOverlayByLuck(unified, "월운", wolChain);
        const relWithWol = buildAllRelationTags({
          natal,
          daewoon: mainDae?.gz,
          sewoon: normSe,
          wolwoon: normWol,
          ilwoon: normIl,
        });
        const shinsalWithWol = buildShinsalTags({
          natal,
          daewoon: mainDae?.gz,
          sewoon: normSe,
          wolwoon: normWol,
          ilwoon: normIl,
          basis,
        });

        const wolNabeum = getNabeum(normWol);
        const wolUnseong = getTwelveUnseong(
          natal[2]?.charAt(0) ?? "",
          normWol.charAt(1),
        );
        const wolShinsal12 = getTwelveShinsalBySettings({
          baseBranch,
          targetBranch: normWol.charAt(1),
          era: shinsalEra,
          gaehwa: shinsalGaehwa,
        });

        sections.push(
          section("월운", {
            기본정보: `${y}-${String(m).padStart(2, "0")} ${normWol}`,
            간지: normWol,
            오행강약: Object.fromEntries(
              Object.entries(wolOverlay.elementPercent).map(([el, val]) => [
                `${el}(${elementToTenGod(dayEl, el as Element)})`,
                val,
              ]),
            ),
            십신강약: wolOverlay.totalsSub,
            형충회합: relWithWol,
            신살: {
              good: shinsalWithWol.good,
              bad: shinsalWithWol.bad,
            },
            납음오행: wolNabeum
              ? {
                  gz: normWol,
                  nabeum: wolNabeum.name,
                  element: wolNabeum.element,
                  code: wolNabeum.code,
                }
              : null,
            십이운성: { pos: "월운", gz: normWol, unseong: wolUnseong },
            십이신살: { pos: "월운", gz: normWol, shinsal: wolShinsal12 },
          }),
        );
      }

      // -----------------------------------------
      // 👉 4) 기존 일운 상세 섹션 (그대로 유지)
      // -----------------------------------------
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
        (ilGZ || "").charAt(1),
      );
      const ilShinsal12 = getTwelveShinsalBySettings({
        baseBranch,
        targetBranch: (ilGZ || "").charAt(1),
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
          형충회합: relWithIl,
          신살: {
            good: shinsalWithIl.good,
            bad: shinsalWithIl.bad,
          },
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


  const body = sections.join("\n\n");

  const guide = `
너는 명리학을 기반으로 ‘현실에서 실제로 발생할 수 있는 사건’을 예측하는 분석가다.
심리·조언·감정 서술은 절대 하지 않고,
오직 삶의 구조에 영향을 주는 큰 사건만 설명한다.

해석을 시작하기 전에 반드시 사용자에게 묻는다.
“어떤 영역의 운을 알고 싶은가요?
(직장·이직·승진·연애·결혼·금전·사고·건강·이사·법적/행정 등)”
사용자가 선택한 영역에 대해서만 분석한다.
사용자가 이미 영역을 선택해서 물어본 경우에는 제외하고, 바로 해석을 시작한다.

분석 대상: (명식 데이터 입력)

출력 방식은 다음을 따른다.

사소한 일상적 에피소드(기계 오류, 자잘한 인간관계, 작은 지출 등)는 절대 포함하지 않는다.
직장·승진·이직·연애·금전·사고·이사처럼
삶의 변화를 일으키는 큰 사건만 다룬다.

“이번 달에는 ○○한 일이 생길 수 있어요.”
각 이슈의 첫 문장을 이렇게 시작한다.
카테고리를 나누지 않고 현실적 장면이 바로 떠오르게 서술한다.

각 이슈는 4단계를 반드시 따르며, 순서를 바꾸지 않는다.
① 명리적 원인
② 현실에서 어떻게 나타나는지
③ 지속 기간
④ 좋은 면 / 나쁜 면(평가가 아닌 구조적 설명)

표현은 일상 언어이며, 학술적·추상적·문학적 표현 금지.
비유 금지.
대신 실제 생활 예시로 설명한다.
예: “인사 발표가 갑자기 잡힐 수 있어요.”
“갑자기 연락이 끊겼던 사람이 다시 나타날 수 있어요.”

감정 유도 문장 금지.
“조심하세요, 불안할 수 있어요, 기회입니다” 같은 문장은 쓰지 않는다.
사고 가능성은 실제 사건 형태로만 말한다.
예: “이번 달에는 하체 부딪힘·낙상처럼 실제 충격 사건이 발생할 수 있어요.”

분석에는
‘사건 발생력’이 강한 요소만 사용한다.
(충·형·파·해, 합, 관성/재성/식상 변화, 원진·귀문·망신·역마 등)
단순 성향 변화나 작고 흐릿한 요소는 제외한다.

종합 정리는
“이번 달을 한 줄로 요약하면 ○○이에요.”
“좋게 보면 ○○ / 나쁘게 보면 △△”
이 구조로 끝낸다.

문체는 전체적으로 하나의 긴 문장형(여러개의 문단), 마크다운 사용금지, 구어체로,
쓸데 없는 말 길게 쓰지 말고, 영양가 있는 말만 딱 써줘라. 한국 사람들 성격 급하다.
위에서 원국에서 4000-5000자 쓰라는 프롬포트 있었어도 무시하고, 요점만 딱 써라.
너무 친절하지도, 너무 딱딱하지도 않게,
차분히 사건을 설명하는 톤으로 작성한다.
`;

  return [header, body, guide].join("\n\n");
}
