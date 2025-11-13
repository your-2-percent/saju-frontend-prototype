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
너는 명리학을 기반으로 현실 사건을 분석하는 전문가다.
이번 운세는 ‘새롭게 발생하거나 방향이 바뀌는 사건’을 중심으로 분석하라.
분석 범위는 현실의 모든 가능성을 포함한다.
일, 인간관계, 돈, 가족, 건강, 사회적 노출, 공간, 계약, 사고, 기계, 제도, 타인 사건 등
현실에서 실제로 일어날 수 있는 모든 종류의 일을 다루어라.
단, 뻔한 일반론은 배제하고, 예상하지 못한 이슈 위주로 구성하라.

모든 설명은 **논리적 근거(오행 흐름, 형충회합, 신살, 납음 작용 등)**에 기반해야 하며,
감정·조언·심리 서술은 절대 금지한다.
비유나 상징(예: 불의 달, 끓는 물, 파도처럼 밀려온다 등)도 금지하고,
현실에서 일어나는 사건의 형태로만 말하라.

분석 구조는 다음과 같다:

이번 달 전체 구조 요약
오행 중심축 변화와 그로 인한 생활 흐름의 전환 설명
(예: “이번 달엔 수가 줄고 화가 늘면서, 일 중심에서 사람 중심으로 구조가 바뀌어요.”)

이슈별 구체 분석 (개수 자유)

개수는 제한하지 않는다 (1~6개 내외, 많으면 모두 포함)

이슈 주제는 카테고리화하지 않는다.
대신 “이번 달에는 ○○한 일이 생길 수 있어요.” 형식으로 시작하라.
(예: “이번 달에는 예상치 못한 수입이 생길 수 있어요.”
“이번 달에는 사고수가 있으니, 주의해야합니다. 특히 다리쪽이 다치는 사고수를 조심해야해요 (낙상 등)”)

각 이슈는 반드시
① 왜 생기는가(명리적 원인) → ② 어떤 형태로 나타나는가(현상) → ③ 지속성 → ④ 긍정·부정 양면
이 순서로 설명한다.

종합 정리

이번 달 전체 구조가 어떤 의미의 ‘전환기’인지 설명

“좋게 보면 ○○, 나쁘게 보면 △△” 식의 이중 구조로 마무리

금지:
“조심해야 합니다”, “긴장될 수 있어요” 등 감정 유도 문장
“몸이 피곤할 수 있어요”처럼 누구에게나 적용되는 일반적 문장
“기회입니다, 긍정적으로 생각하세요” 같은 위로문
상징적 비유, 문학적 표현

문장 스타일 예시:
“이번 달에는 갑자기 행정 일정이 빨라지거나, 그동안 미뤄졌던 서류가 한꺼번에 처리될 수 있어요.
이건 월운의 화 기운이 강해지면서 관성 작용이 활성화된 결과예요.
좋게 보면 일이 명확해지고, 나쁘게 보면 예상치 못한 일정 변경으로 혼선이 생길 수 있어요.”

출력은 구어체 설명체로,
마크다운 없이 긴 문단 형식으로 서술하라.
  `
  ].join("\n");
  

  return [header, body, guide].join("\n\n");
}
