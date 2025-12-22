import type { Element } from "../utils/types";
import { normalizeGZ } from "../logic/relations";
import { STEM_H2K, BRANCH_H2K } from "@/shared/domain/간지/const";

const STEM_TO_ELEMENT: Record<string, Element> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토",
  경: "금", 신: "금", 임: "수", 계: "수",
};
const BRANCH_MAIN_ELEMENT: Record<string, Element> = {
  자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
  오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};
/** 지지 → 본기 천간(한글) */
const BRANCH_MAIN_STEM: Record<string, string> = {
  자: "계", 축: "기", 인: "갑", 묘: "을", 진: "무", 사: "병",
  오: "정", 미: "기", 신: "경", 유: "신", 술: "무", 해: "임",
  子: "계", 丑: "기", 寅: "갑", 卯: "을", 辰: "무", 巳: "병",
  午: "정", 未: "기", 申: "경", 酉: "신", 戌: "무", 亥: "임",
};
const YANG_STEMS = ["갑","병","무","경","임"] as const;
function isYang(stemKo: string) { return (YANG_STEMS as readonly string[]).includes(stemKo); }
const SHENG_NEXT: Record<Element, Element> = { 목:"화", 화:"토", 토:"금", 금:"수", 수:"목" };
const KE:         Record<Element, Element> = { 목:"토", 화:"금", 토:"수", 금:"목", 수:"화" };
const KE_REV:     Record<Element, Element> = { 토:"목", 금:"화", 수:"토", 목:"금", 화:"수" };
const SHENG_PREV: Record<Element, Element> = { 화:"목", 토:"화", 금:"토", 수:"금", 목:"수" };

type TenGodSubtype =
  | "비견" | "겁재"
  | "식신" | "상관"
  | "정재" | "편재"
  | "정관" | "편관"
  | "정인" | "편인";

export type TenGodMain = "비겁" | "식상" | "재성" | "관성" | "인성";

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
function subToMain(sub: TenGodSubtype): TenGodMain {
  switch (sub) {
    case "비견":
    case "겁재": return "비겁";
    case "식신":
    case "상관": return "식상";
    case "정재":
    case "편재": return "재성";
    case "정관":
    case "편관": return "관성";
    case "정인":
    case "편인": return "인성";
  }
}
export function normalizeTo100(obj: Record<string, number>): Record<string, number> {
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

/** 증강된 천간스케일 → 오행퍼센트(합 100 정수) */
export function stemsScaledToElementPercent100(
  perStemScaled: Record<string, number>
): Record<Element, number> {
  const acc: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  for (const [k, v] of Object.entries(perStemScaled ?? {})) {
    const el = STEM_TO_ELEMENT[normalizeStemLike(k) as keyof typeof STEM_TO_ELEMENT];
    if (el && v > 0) acc[el] += v;
  }
  return normalizeTo100(acc) as Record<Element, number>;
}

/** 소분류(10) 계산 ? 합 100 정수 */
export function stemsScaledToSubTotals(
  perStemScaled: Record<string, number>,
  dayStem: string
): Record<TenGodSubtype, number> {

  const acc: Record<TenGodSubtype, number> = {
    비견:0, 겁재:0, 식신:0, 상관:0, 정재:0, 편재:0, 정관:0, 편관:0, 정인:0, 편인:0
  };
  for (const [k, v] of Object.entries(perStemScaled ?? {})) {
    if (v <= 0) continue;
    const stemKo = normalizeStemLike(k);
    if (!stemKo) continue;
    const sub = mapStemToTenGodSub(dayStem, stemKo);
    acc[sub] += v;
  }
  return acc as Record<TenGodSubtype, number>;
}

/** 대분류(5) 계산 ? 소분류 합계 그대로 */
export function subTotalsToMainTotals(
  subTotals: Record<TenGodSubtype, number>
): Record<TenGodMain, number> {
  const acc: Record<TenGodMain, number> = { 비겁:0, 식상:0, 재성:0, 관성:0, 인성:0 };
  for (const [sub, v] of Object.entries(subTotals)) {
    const main = subToMain(sub as TenGodSubtype);
    acc[main] += v;
  }
  return normalizeTo100(acc);
}

/* =========================
 * 간지 정규화 유틸
 * ========================= */
export function normalizePillars(input?: string[] | null): string[] {
  const arr = Array.isArray(input) ? input.slice(0, 4) : [];
  while (arr.length < 4) arr.push("");
  return arr.map((raw, idx) => {
    const norm = normalizeGZ(raw ?? "");
    if (norm) return norm;
    return idx <= 2 ? "--" : "";
  });
}

export function elementPresenceFromPillars(
  p: [string, string, string, string],
  opts?: { includeBranches?: boolean }
): Record<Element, boolean> {
  const includeBranches = !!opts?.includeBranches;
  const present: Record<Element, boolean> = { 목: false, 화: false, 토: false, 금: false, 수: false };
  for (const gz of p) {
    if (!gz) continue;
    const se = STEM_TO_ELEMENT[gz.charAt(0)];
    if (se) present[se] = true;
    if (includeBranches) {
      const be = BRANCH_MAIN_ELEMENT[gz.charAt(1)];
      if (be) present[be] = true;
    }
  }
  return present;
}
export function lightElementScoreFromPillars(
  p: [string, string, string, string]
): Record<Element, number> {
  const acc: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const gz of p) {
    if (!gz) continue;
    const se = STEM_TO_ELEMENT[gz.charAt(0)];
    const be = BRANCH_MAIN_ELEMENT[gz.charAt(1)];
    if (se) acc[se] += 10;
    if (be) acc[be] += 6;
  }
  return acc;
}
export function hasValidYmd(p: [string, string, string, string]): boolean {
  return p[0]?.length === 2 && p[1]?.length === 2 && p[2]?.length === 2;
}

const STEMS_BARE = ["갑","을","병","정","무","기","경","신","임","계"] as const;

/** perStemElementScaled(키가 '갑목/신금' 또는 '갑/신' 섞여있어도) → '갑','을',… 단일천간 맵으로 통일 */
export function toBareStemMap(input: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (v <= 0) continue;
    const stemKo = normalizeStemLike(k);
    if (!stemKo) continue;
    out[stemKo] = (out[stemKo] ?? 0) + v;
  }
  return out;
}

/** '갑','을',… 단일천간 맵 → 펜타곤이 기대하는 "갑목/신금…" 풀라벨 맵으로 변환 */
export function bareToFullStemMap(
  bare: Record<string, number>
): Record<
  "갑목"|"을목"|"병화"|"정화"|"무토"|"기토"|"경금"|"신금"|"임수"|"계수",
  number
> {
  const zero: Record<
    "갑목"|"을목"|"병화"|"정화"|"무토"|"기토"|"경금"|"신금"|"임수"|"계수",
    number
  > = {
    갑목:0, 을목:0, 병화:0, 정화:0, 무토:0, 기토:0, 경금:0, 신금:0, 임수:0, 계수:0
  };

  const out: Record<
    "갑목"|"을목"|"병화"|"정화"|"무토"|"기토"|"경금"|"신금"|"임수"|"계수",
    number
  > = { ...zero };

  for (const s of STEMS_BARE) {
    const el = STEM_TO_ELEMENT[s];
    const label = `${s}${el}` as keyof typeof out;
    out[label] = Math.max(0, Math.round(bare[s] ?? 0));
  }
  return out;
}

const LUCK_RATIO = {
  natal: 50,
  dae: 30,
  se: 20,
  wol: 7,
  il: 3,
} as const;

// 여러 소스를 비율로 합산
export function mergeWithRatio(
  parts: { kind: keyof typeof LUCK_RATIO; bare: Record<string, number> }[]
): Record<string, number> {
  const acc: Record<string, number> = {};

  for (const { kind, bare } of parts) {
    const ratio = LUCK_RATIO[kind] ?? 0;
    if (ratio <= 0) continue;

    const norm = normalizeTo100(bare);
    for (const [stem, val] of Object.entries(norm)) {
      acc[stem] = (acc[stem] ?? 0) + val * ratio;
    }
  }

  const sum = Object.values(acc).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const k of Object.keys(acc)) {
      acc[k] = (acc[k] / sum) * 100;
    }
  }
  return acc;
}

/** GZ → bare stems (천간 + 지지본기천간) */
function stemsFromGZ(gz: string): string[] {
  if (!gz) return [];
  const s = normalizeStemLike(gz.charAt(0));
  const b = normalizeStemLike(gz.charAt(1));
  return [s, b].filter(Boolean) as string[];
}

export function toBareFromGZ(gz: string): Record<string, number> {
  const stems = stemsFromGZ(gz);
  const out: Record<string, number> = {};
  for (const s of stems) out[s] = (out[s] ?? 0) + 1;
  return out;
}
