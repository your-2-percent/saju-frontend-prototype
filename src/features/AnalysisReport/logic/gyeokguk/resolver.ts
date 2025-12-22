// features/AnalysisReport/logic/gyeokguk/resolver.ts
import type { Element, GyeokgukInner, TenGodSubtype } from "./types";
import {
  DIST_MAP,
  KE,
  STEM_TO_ELEMENT,
  YANGIN_MAP,
  WOLGEOP_MAP,
  GEONLOK_SET,
} from "./rules";
import { detectOuterGyeok } from "./evaluator";
import {
  normStemKo,
  hasSamHapWithMonth,
  isWithinEarlyPhase,
  isYangStem,
  mapStemToTenGodSub,
} from "./utils";
import { formatNaegyeokLabel, formatReasons, type ReasonToken } from "./formatter";

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
  const tokens: ReasonToken[] = [];

  const dist0 = DIST_MAP[monthBranch];
  if (!dist0) {
    return { 월령: "-", 사령: "-", 진신: "-", 가신: "-", 내격: "-", 외격: [], reason: ["월지 분포표 없음"] };
  }

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
    tokens.push({ kind: "WANGJI_FIXED_JUNGI" });
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
      tokens.push({ kind: "SAENGJI_EMITTED_ONE", from: emittedOnly[0].from });
    } else if (emittedOnly.length > 1) {
      emittedOnly.sort((a, b) => b.w - a.w);
      saryeong = emittedOnly[0].stem;
      tokens.push({ kind: "SAENGJI_EMITTED_MULTI", from: emittedOnly[0].from });
    } else {
      saryeong = dist.정기.stem;
      tokens.push({ kind: "SAENGJI_NOT_EMITTED_USE_JUNGI" });
    }
  }
  // 3) 고지: 삼합 성립 시 중기, 아니면 절입+12 이내 여기, 이후 정기
  else if (["진", "술", "축", "미"].includes(monthBranch)) {
    if (hasSamHapWithMonth(monthBranch, otherBranches) && dist.중기) {
      saryeong = dist.중기.stem;
      tokens.push({ kind: "GOJI_SAMHAP_USE_JUNGI" });
    } else if (isWithinEarlyPhase(monthBranch, date) && dist.초기) {
      saryeong = dist.초기.stem;
      tokens.push({ kind: "GOJI_EARLY_JEOLIP_USE_CHOGI" });
    } else {
      saryeong = dist.정기.stem;
      tokens.push({ kind: "GOJI_LATE_JEOLIP_USE_JUNGI" });
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

  if (isNeutralized?.(jinshin)) tokens.push({ kind: "NEUTRALIZED" });

  // 내격: 비견/겁재 제외(단, 예외는 별도 허용)
  let naegyeok = "-";
  const sub = mapStemToTenGodSub(dayStem, jinshin) as TenGodSubtype;

  const isGeonlok = GEONLOK_SET.some(([s,b]) => s === dayStem && b === monthBranch);
  const isYangin = isYangStem(dayStem) && YANGIN_MAP[dayStem] === monthBranch;
  const isWolgeop = !isYangStem(dayStem) && WOLGEOP_MAP[dayStem] === monthBranch;

  if (sub === "비견" || sub === "겁재") {
    if (isGeonlok) {
      naegyeok = "건록격";
      tokens.push({ kind: "EX_GEONLOK" });
    } else if (isYangin) {
      naegyeok = "양인격";
      tokens.push({ kind: "EX_YANGIN" });
    } else if (isWolgeop) {
      naegyeok = "월지겁재격";
      tokens.push({ kind: "EX_WOLGEOP" });
    } else {
      tokens.push({ kind: "EX_EXCLUDED_BIGEOP" });
    }
  } else {
    naegyeok = formatNaegyeokLabel(sub);
  }

  // 외격(특수격) 수집
  const outer = detectOuterGyeok({ pillars, dayStem, monthBranch, emittedStems, mapping });

  return { 월령: wolryeong, 사령: saryeong, 진신: jinshin, 가신: gasin, 내격: naegyeok, 외격: outer, reason: formatReasons(tokens) };
}
