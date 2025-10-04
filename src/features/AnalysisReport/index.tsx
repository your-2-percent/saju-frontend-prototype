// features/AnalysisReport/AnalysisReport.tsx
import { useMemo, useState } from "react";
import PentagonChart from "./PentagonChart";
import StrengthBar from "./StrengthBar";
import HarmonyTagPanel from "./HarmonyTagPanel";
import { getTenGodColors } from "./utils/colors";
import type { Element, TenGod } from "./utils/types";
import computeYongshin from "./utils/yongshin";
import { normalizeGZ } from "./logic/relations";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import type { MyeongSik } from "@/shared/lib/storage";
import { type BlendTab, BLEND_TABS } from "./logic/blend";
import ShinsalTagPanel from "./ShinsalTagPanel";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import ClimateBars from "./ClimateBars";
import { useHourPredictionStore } from "./../../shared/lib/hooks/useHourPredictionStore";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";
import { natalShinPercent } from "@/features/AnalysisReport/logic/powerPercent";
import { computeUnifiedPower } from "./utils/unifiedPower";

/* =========================
 * 상수/맵 (컴포넌트 밖)
 * ========================= */
const STEM_H2K: Record<string, string> = {
  甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
  己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
const BRANCH_H2K: Record<string, string> = {
  子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
  午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};
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

type TenGodMain = "비겁" | "식상" | "재성" | "관성" | "인성";

/* =========================
 * 유틸
 * ========================= */
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
function normalizeTo100(obj: Record<string, number>): Record<string, number> {
  const entries = Object.entries(obj) as [string, number][];
  const sum = entries.reduce((a, [,v]) => a + (v > 0 ? v : 0), 0);
  if (sum <= 0) return Object.fromEntries(entries.map(([k]) => [k, 0])) as Record<string, number>;
  const raw = entries.map(([k, v]) => [k, (v > 0 ? v : 0) * 100 / sum] as const);
  const floored = raw.map(([k, x]) => [k, Math.round(x)] as const);
  let used = floored.reduce((a, [,x]) => a + x, 0);
  const rema = raw.map(([k, x]) => [k, x - Math.round(x)] as const).sort((a, b) => b[1] - a[1]);
  const out: Record<string, number> = Object.fromEntries(floored.map(([k, x]) => [k, x])) as Record<string, number>;
  let i = 0;
  while (used < 100 && i < rema.length) { out[rema[i][0]] += 1; used += 1; i += 1; }
  return out;
}

/** 증강된 천간스케일 → 오행퍼센트(합 100 정수) */
function stemsScaledToElementPercent100(
  perStemScaled: Record<string, number>
): Record<Element, number> {
  const acc: Record<Element, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 };
  for (const [k, v] of Object.entries(perStemScaled ?? {})) {
    const el = STEM_TO_ELEMENT[normalizeStemLike(k) as keyof typeof STEM_TO_ELEMENT];
    if (el && v > 0) acc[el] += v;
  }
  return normalizeTo100(acc) as Record<Element, number>;
}

/** 소분류(10) 계산 — 합 100 정수 */
function stemsScaledToSubTotals(
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
  // ✅ 여기서만 normalize
  return acc as Record<TenGodSubtype, number>;
}

/** 대분류(5) 계산 — 소분류 합계 그대로 */
function subTotalsToMainTotals(
  subTotals: Record<TenGodSubtype, number>
): Record<TenGodMain, number> {
  const acc: Record<TenGodMain, number> = { 비겁:0, 식상:0, 재성:0, 관성:0, 인성:0 };
  for (const [sub, v] of Object.entries(subTotals)) {
    const main = subToMain(sub as TenGodSubtype);
    acc[main] += v;
  }
  // ❌ normalize 하지 않음. 소분류 이미 100 맞췄으니 여기 합도 항상 100
  return normalizeTo100(acc);
}

/* =========================
 * 기존 정규화/보조 유틸
 * ========================= */
function normalizeGZLocal(raw: string): string {
  if (!raw) return "";
  const s = raw.replace(/[()[\]{}]/g, "").replace(/\s+/g, "").replace(/[년월일시年月日時干支柱:\-_.]/g, "");
  const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
  if (mKo) return `${mKo[1]}${mKo[2]}`;
  const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
  if (mHa) return `${STEM_H2K[mHa[1] as keyof typeof STEM_H2K]}${BRANCH_H2K[mHa[2] as keyof typeof BRANCH_H2K]}`;
  return "";
}
function normalizePillars(input?: string[] | null): string[] {
  const arr = Array.isArray(input) ? input.slice(0, 4) : [];
  while (arr.length < 4) arr.push("");
  return arr.map((raw, idx) => {
    if (!raw) return "";
    const s = raw.replace(/[()[\]{}]/g, "").replace(/\s+/g, "").replace(/[년월일시年月日時干支柱:\-_.]/g, "");
    const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
    if (mKo) return `${mKo[1]}${mKo[2]}`;
    const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
    if (mHa) return `${STEM_H2K[mHa[1] as keyof typeof STEM_H2K]}${BRANCH_H2K[mHa[2] as keyof typeof BRANCH_H2K]}`;
    return idx <= 2 ? "--" : "";
  });
}
function elementPresenceFromPillars(
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
function lightElementScoreFromPillars(
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
function hasValidYmd(p: [string, string, string, string]): boolean {
  return p[0]?.length === 2 && p[1]?.length === 2 && p[2]?.length === 2;
}

const STEMS_BARE = ["갑","을","병","정","무","기","경","신","임","계"] as const;

/** perStemElementScaled(키가 '갑목/신금' 또는 '갑/신' 섞여있어도) → '갑','을',… 단일천간 맵으로 통일 */
function toBareStemMap(input: Record<string, number> | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(input ?? {})) {
    if (v <= 0) continue;
    // "갑목" → "갑", "辛" → "신", "酉" → "신"(본기), 등등을 모두 단일 천간으로 정규화
    const stemKo = normalizeStemLike(k);
    if (!stemKo) continue;
    out[stemKo] = (out[stemKo] ?? 0) + v;
  }
  return out;
}

/** '갑','을',… 단일천간 맵 → 펜타곤이 기대하는 "갑목/신금…" 풀라벨 맵으로 변환 */
function bareToFullStemMap(
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

  // 여기서 타입 명시
  const out: Record<
    "갑목"|"을목"|"병화"|"정화"|"무토"|"기토"|"경금"|"신금"|"임수"|"계수",
    number
  > = { ...zero };

  for (const s of STEMS_BARE) {
    const el = STEM_TO_ELEMENT[s];          // 예: '신' → '금'
    const label = `${s}${el}` as keyof typeof out; // keyof로 안전하게
    out[label] = Math.max(0, Math.round(bare[s] ?? 0));
  }
  return out;
}

// 가중치 상수
const LUCK_RATIO = {
  natal: 50,
  dae: 30,
  se: 20,
  wol: 7,
  il: 3,
} as const;

// 각 소스 normalize
// function normalizeBareTo100(bare: Record<string, number>): Record<string, number> {
//   const sum = Object.values(bare).reduce((a, b) => a + b, 0);
//   if (sum <= 0) return {};
//   const out: Record<string, number> = {};
//   for (const [k, v] of Object.entries(bare)) {
//     out[k] = (v / sum) * 100; // 합 100으로 스케일링
//   }
//   return out;
// }

// 여러 소스를 비율로 합산
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

/** GZ → bare stems (천간 + 지지본기천간) */
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

/* =========================
 * 컴포넌트
 * ========================= */
type YongshinItem = { element: string; elNorm: Element | null; score: number; reasons: string[] };
type YongshinResult = { ordered: Array<{ element: string; score?: number; reasons?: string[] }> } | null;

export default function AnalysisReport({
  data,
  pillars,
  lunarPillars,
  daewoonGz: daewoonGzProp,
}: {
  data: MyeongSik;
  pillars: string[];
  lunarPillars?: string[] | null;
  daewoonGz?: string | null;
}) {
  const [bigTab, setBigTab] = useState<"일간 · 오행 강약" | "형충회합" | "신살">("일간 · 오행 강약");
  const [blendTab, setBlendTab] = useState<BlendTab>("원국");
  const [demoteAbsent, setDemoteAbsent] = useState(true);

  const { date, yearGZ, monthGZ, dayGZ } = useLuckPickerStore();
  const seGz = useMemo(() => normalizeGZ(yearGZ), [yearGZ]);
  const wolGz = useMemo(() => normalizeGZ(monthGZ), [monthGZ]);
  const ilGz  = useMemo(() => normalizeGZ(dayGZ), [dayGZ]);

  const daeList = useDaewoonList(data, data?.mingSikType);
  const autoDaeIndex = useMemo(() => {
    if (!daeList?.length) return 0;
    const i = daeList.findIndex((d, k) => {
      const next = daeList[k + 1]?.at;
      return date >= d.at && (!next || date < next);
    });
    if (i !== -1) return i;
    if (date < daeList[0].at) return 0;
    return daeList.length - 1;
  }, [daeList, date]);

  const daewoonGz = useMemo(() => {
    const raw = daewoonGzProp ?? daeList?.[autoDaeIndex]?.gz ?? "";
    const ko = normalizeGZ(raw);
    return ko || null;
  }, [daewoonGzProp, daeList, autoDaeIndex]);

  const { manualHour } = useHourPredictionStore();
  const rule: DayBoundaryRule = (data.mingSikType as DayBoundaryRule) ?? "야자시";

  const solarKo = useMemo(() => normalizePillars(pillars), [pillars]);
  const lunarKo = useMemo(() => normalizePillars(lunarPillars), [lunarPillars]);

  const solarKoWithHour = useMemo(() => {
    const arr = [...solarKo] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [solarKo, manualHour]);
  const lunarKoWithHour = useMemo(() => {
    const arr = [...lunarKo] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [lunarKo, manualHour]);

  const computedFallback = useMemo<[string, string, string, string] | null>(() => {
    const y = Number(data.birthDay?.slice(0, 4));
    const m = Number(data.birthDay?.slice(4, 6));
    const d = Number(data.birthDay?.slice(6, 8));
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const base = new Date(y, m - 1, d, 12, 0, 0, 0);
    const yn = normalizeGZLocal(getYearGanZhi(base) || "");
    const wl = normalizeGZLocal(getMonthGanZhi(base) || "");
    const il = normalizeGZLocal(getDayGanZhi(base, rule) || "");
    return [yn, wl, il, ""];
  }, [data.birthDay, rule]);

  const solarValid = hasValidYmd(solarKoWithHour);
  const lunarValid = hasValidYmd(lunarKoWithHour);

  const [basis] = useState<"solar" | "lunar">("solar");
  const effectiveBasis: "solar" | "lunar" =
    basis === "lunar"
      ? (lunarValid ? "lunar" : solarValid ? "solar" : "lunar")
      : (solarValid ? "solar" : lunarValid ? "lunar" : "solar");

  const activePillars = useMemo<[string, string, string, string]>(() => {
    const source =
      effectiveBasis === "lunar"
        ? (lunarValid ? lunarKoWithHour : solarValid ? solarKoWithHour : computedFallback ?? ["", "", "", ""])
        : (solarValid ? solarKoWithHour : lunarValid ? lunarKoWithHour : computedFallback ?? ["", "", "", ""]);
    const arr = [...source] as [string, string, string, string];
    if ((!arr[3] || arr[3] === "") && manualHour) arr[3] = manualHour.stem + manualHour.branch;
    return arr;
  }, [effectiveBasis, solarValid, lunarValid, solarKoWithHour, lunarKoWithHour, computedFallback, manualHour]);

  const hourKey = useMemo(
    () => (manualHour ? manualHour.stem + manualHour.branch : activePillars[3] || ""),
    [manualHour, activePillars]
  );

  const chain = useMemo(() => ({
    dae: blendTab !== "원국" ? daewoonGz ?? null : null,
    se:  (blendTab === "세운" || blendTab === "월운" || blendTab === "일운") ? (seGz ?? null) : null,
    wol: (blendTab === "월운" || blendTab === "일운") ? (wolGz ?? null) : null,
    il:  (blendTab === "일운") ? (ilGz ?? null) : null,
  }), [blendTab, daewoonGz, seGz, wolGz, ilGz]);

  // 기본 계산(원국/운 섞임 여부와 무관)
  const unified = useMemo(() => {
    if (!hasValidYmd(activePillars)) return null;
    return computeUnifiedPower({ natal: activePillars, tab: blendTab, chain, hourKey });
  }, [activePillars, blendTab, chain, hourKey]);

  // ─────────────────────────────────────────────
  // ★ 운 반영 강제 오버레이(펜타곤/소분류/메인5)
  // ─────────────────────────────────────────────
  const overlay = useMemo(() => {
    if (!unified) return null;

    const natalBare = toBareStemMap(unified.perStemElementScaled);

    // 운 bare stems
    const daeBare  = chain.dae ? toBareFromGZ(chain.dae) : {};
    const seBare   = chain.se  ? toBareFromGZ(chain.se)  : {};
    const wolBare  = chain.wol ? toBareFromGZ(chain.wol) : {};
    const ilBare   = chain.il  ? toBareFromGZ(chain.il)  : {};

    // 비율 합산
    const merged = mergeWithRatio([
      { kind: "natal", bare: natalBare },
      { kind: "dae",   bare: daeBare },
      { kind: "se",    bare: seBare },
      { kind: "wol",   bare: wolBare },
      { kind: "il",    bare: ilBare },
    ]);

    const mergedNorm = normalizeTo100(merged); 
    const perStemAugFull = bareToFullStemMap(mergedNorm);
    const totalsSub  = stemsScaledToSubTotals(merged, unified.dayStem);
    const totalsMain = subTotalsToMainTotals(totalsSub);
    const elemPct100 = stemsScaledToElementPercent100(merged);

    return { perStemAugBare: merged, perStemAugFull, elemPct100, totalsMain, totalsSub };
  }, [unified, chain]);


  // ── 원국 전용 보조값
  const presentMap = useMemo(
    () => elementPresenceFromPillars(activePillars, { includeBranches: true }),
    [activePillars]
  );
  const hasAbsent = useMemo(
    () => (["목", "화", "토", "금", "수"] as Element[]).some((el) => !presentMap[el]),
    [presentMap]
  );

  const elemForFallback = overlay?.elemPct100 ?? unified?.elementPercent100 ?? lightElementScoreFromPillars(activePillars);

  // 펜타곤 데이터: 운 반영 totalsMain 사용
  const chartData = useMemo(() => {
    if (!unified || !overlay) return [] as Array<{ name: TenGodMain; value: number; color: string }>;
    const colors = getTenGodColors(unified.dayStem);
    return (Object.entries(overlay.totalsMain) as [TenGodMain, number][])
      .map(([name, value]) => ({
        name,
        value,
        color: colors[name as TenGod],
      }));
  }, [unified, overlay]);


  // 오행 퍼센트: 운 반영 버전
  const elementPct = overlay?.elemPct100 ?? { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  // 소분류(10): 운 반영 버전 (UI에서 필요시 사용)
  const tenSubTotals100 = overlay?.totalsSub ?? null;

  // 메인5(원하면 사용): overlay.totalsMain

  const hourKeyForUi = useMemo(
    () => (manualHour ? manualHour.stem + manualHour.branch : activePillars[3] || ""),
    [manualHour, activePillars]
  );

  const luckKey = useMemo(
    () =>
      [
        blendTab,
        daewoonGz ?? "",
        seGz ?? "",
        wolGz ?? "",
        ilGz ?? "",
        date?.toISOString?.() ?? "",
        hourKeyForUi,
      ].join("|"),
    [blendTab, daewoonGz, seGz, wolGz, ilGz, date, hourKeyForUi]
  );

  const revKey = useMemo(() => {
    const subsSig = tenSubTotals100
      ? (Object.entries(tenSubTotals100)
          .sort(([a],[b]) => a.localeCompare(b))
          .map(([k, v]) => `${k}:${v}`)
          .join(","))
      : "none";

    const dataSig = chartData.map((d) => `${d.name}:${d.value}`).join(",");

    return `${luckKey}||${activePillars.join("")}||${dataSig}||${subsSig}`;
  }, [luckKey, activePillars, chartData, tenSubTotals100]);

  // 용신(표시는 원국/운 합산 totals 중 하나 선택 가능; 여기선 unified.totals 사용)
  const yongshinRaw: YongshinResult =
    typeof computeYongshin === "function"
      ? (computeYongshin(activePillars, unified?.totals) as YongshinResult)
      : null;

  const yongshinList = useMemo<YongshinItem[]>(() => {
    const rawArr = yongshinRaw?.ordered ?? [];
    const list: YongshinItem[] = rawArr.map((rec) => {
      const element = rec.element ?? "";
      const elNorm: Element | null =
        /목|木|wood/i.test(element) ? "목" :
        /화|火|fire/i.test(element) ? "화" :
        /토|土|earth/i.test(element) ? "토" :
        /금|金|metal/i.test(element) ? "금" :
        /수|水|water/i.test(element) ? "수" : null;
      const score = typeof rec.score === "number"
        ? rec.score
        : elNorm
          ? (elemForFallback[elNorm] ?? 0)
          : 0;
      const reasons = Array.isArray(rec.reasons) ? rec.reasons : [];
      return { element, elNorm, score, reasons };
    });

    const getPresent = (el: Element | null): boolean => (el ? presentMap[el] : false);

    const demoted = demoteAbsent
      ? list.map((it) =>
          it.elNorm && !getPresent(it.elNorm)
            ? { ...it, score: 0, reasons: [...it.reasons, "부재후순위: 원국 부재 → 0점"] }
            : it
        )
      : list;

    demoted.sort((a, b) => {
      const ap = getPresent(a.elNorm) ? 1 : 0;
      const bp = getPresent(b.elNorm) ? 1 : 0;
      if (demoteAbsent && ap !== bp) return bp - ap;
      if ((b.score ?? 0) !== (a.score ?? 0)) return (b.score ?? 0) - (a.score ?? 0);
      return (a.elNorm ?? a.element).localeCompare(b.elNorm ?? b.element);
    });

    return demoted;
  }, [yongshinRaw, demoteAbsent, elemForFallback, presentMap]);

  const maxScore = useMemo(
    () => Math.max(0, ...yongshinList.map((it) => (Number.isFinite(it.score) ? it.score : 0))),
    [yongshinList]
  );

  function getDayElementPercent(natal: string[]): number {
    const shinPct = natalShinPercent(natal, { criteriaMode: "modern", useHarmonyOverlay: true });
    return shinPct;
  }

  if (!hasValidYmd(activePillars)) {
    return (
      <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-sm">
        간지를 인식할 수 없어요.
      </div>
    );
  }

  return (
    <div className="space-y-4 mb-4">
      {/* 운 탭 */}
      <div className="flex gap-2 justify-center flex-wrap">
        {BLEND_TABS.map((t) => (
          <button
            key={t}
            onClick={() => setBlendTab(t)}
            className={
              "px-2 py-1 text-xs rounded border cursor-pointer " +
              (blendTab === t
                ? "bg-yellow-500 text-black border-yellow-600"
                : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* 섹션 탭 */}
      <div className="flex gap-2 mb-2 justify-center flex-wrap">
        {["일간 · 오행 강약", "형충회합", "신살"].map((t) => (
          <button
            key={t}
            onClick={() => setBigTab(t as typeof bigTab)}
            className={
              "px-3 py-1 text-sm rounded border cursor-pointer " +
              (bigTab === t
                ? "bg-violet-500 text-white border-violet-600"
                : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700")
            }
          >
            {t}
          </button>
        ))}
      </div>

      {/* 형충회합 */}
      {bigTab === "형충회합" && (
        <HarmonyTagPanel
          key={`harm-${blendTab}-${hourKeyForUi}`}
          pillars={activePillars}
          daewoon={daewoonGz || undefined}
          sewoon={seGz || undefined}
          wolwoon={wolGz || undefined}
          ilwoon={ilGz || undefined}
          tab={blendTab}
        />
      )}

      {/* 일간강약 */}
      {bigTab === "일간 · 오행 강약" && (
        <div className="space-y-4">
          {/* PentagonChart — 운 반영 오버레이 값으로 렌더 */}
          <PentagonChart
            key={`pentagon-${revKey}`}
            data={chartData}                              // 메인5(비겁/식상/재성/관성/인성) 합100
            revKey={revKey}
            perStemElementScaled={overlay?.perStemAugFull}    // 증강된 천간 스케일(운 천간+지지본기 주입)
            elementPercent={elementPct}                   // 오행 퍼센트(합100)
            dayStem={activePillars[2]?.charAt(0) ?? null}
          />

          <StrengthBar value={getDayElementPercent(activePillars)} />
          <ClimateBars natal={activePillars} />

          {/* 용신 추천 (원국 기준/현재 totals 기준 둘 다 가능) */}
          <div className="w-full p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold">용신 추천</div>
              {hasAbsent && (
                <button
                  type="button"
                  onClick={() => setDemoteAbsent((v) => !v)}
                  className={`text-xs px-2 py-1 rounded-lg border transition cursor-pointer
                    ${
                      demoteAbsent
                        ? "bg-violet-100 text-violet-800 border-violet-200 whitespace-nowrap dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800"
                        : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700"
                    }`}
                  aria-pressed={demoteAbsent}
                >
                  부재후순위: {demoteAbsent ? "ON" : "OFF"}
                </button>
              )}
            </div>

            <ul className="space-y-2">
              {yongshinList.map((it, idx) => (
                <li
                  key={it.elNorm ?? it.element}
                  className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                      {idx + 1}위
                    </span>
                    <span className="text-sm font-semibold">{it.element}</span>
                  </div>
                  <div className="flex-1">
                    <div className="mt-1 h-1.5 w-full rounded bg-neutral-300 dark:bg-neutral-800 overflow-hidden">
                      <div
                        className="h-1.5 rounded bg-white dark:bg-neutral-100"
                        style={{
                          width: `${
                            maxScore > 0
                              ? Math.max(2, Math.min(100, Math.round(((it.score ?? 0) / maxScore) * 100)))
                              : 12
                          }%`,
                        }}
                        title={`점수 ${it.score}`}
                      />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(it.reasons ?? []).map((r, i) => (
                        <span
                          key={i}
                          className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* 신살 */}
      {bigTab === "신살" && (
        <ShinsalTagPanel
          key={`shin-${blendTab}-${hourKeyForUi}`}
          pillars={activePillars}
          daewoon={daewoonGz || undefined}
          sewoon={seGz || undefined}
          wolwoon={wolGz || undefined}
          ilwoon={ilGz || undefined}
          tab={blendTab}
        />
      )}
    </div>
  );
}
