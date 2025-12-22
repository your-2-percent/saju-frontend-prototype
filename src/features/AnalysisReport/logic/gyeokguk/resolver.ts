// features/AnalysisReport/logic/gyeokguk/resolver.ts
import type { Element, GyeokgukInner, TenGodSubtype } from "./types";
import { getSolarTermBoundaries } from "@/features/myoun/calc/solarTerms";
import {
  DIST_MAP,
  KE,
  STEM_TO_ELEMENT,
  YANGIN_MAP,
  WOLGEOP_MAP,
  GEONLOK_SET,
  BRANCH_TO_TERM,
} from "./rules";
import { detectOuterGyeok } from "./evaluator";
import {
  normStemKo,
  hasSamHapWithMonth,
  isYangStem,
  mapStemToTenGodSub,
} from "./utils";
import { formatNaegyeokLabel, formatReasons, type ReasonToken, type SaryeongPickFrom } from "./formatter";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

type Dist = {
  초기?: { stem: string; w: number };
  중기?: { stem: string; w: number };
  정기: { stem: string; w: number };
};

function getBoundariesCovering(date: Date) {
  // getSolarTermBoundaries(date)는 "입춘~다음입춘" 범위만 반환
  // 그래서 생일이 입춘 이전(1월 등)이면 전년도 기준으로 다시 구해 커버
  let bounds = getSolarTermBoundaries(date);
  const start = bounds[0]?.date;
  if (start && date.getTime() < start.getTime()) {
    const prev = new Date(date);
    prev.setFullYear(date.getFullYear() - 1);
    bounds = getSolarTermBoundaries(prev);
  }
  return bounds;
}

function getJeolipStartDate(monthBranch: string, date: Date): Date | null {
  // rules.ts의 BRANCH_TO_TERM에서 첫 번째(절=12절기)만 사용
  const termName = BRANCH_TO_TERM[monthBranch]?.[0];
  if (!termName) return null;

  const bounds = getBoundariesCovering(date);
  const found = bounds.find((t) => t.name === termName)?.date ?? null;
  return found;
}

/** 절입 기준 “몇 일째” (절입 시각 직후=1일째) */
function getJeolipDayIndex(monthBranch: string, date: Date): number | null {
  const start = getJeolipStartDate(monthBranch, date);
  if (!start) return null;

  const diffDays = Math.floor((date.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  return diffDays < 1 ? 1 : diffDays;
}

/**
 * 분일(절입 후 n일째)로 월지 지장간(초/중/정)을 선택
 * - w를 “일수”로 취급: dayIdx가 구간에 들어가면 해당 구간 stem
 * - 구간 합을 넘어가면 정기로 귀결
 */
function pickByBunil(dist: Dist, dayIdx: number): { stem: string; from: SaryeongPickFrom } {
  const chogiDays = dist.초기?.w ?? 0;
  const junggiDays = dist.중기?.w ?? 0;

  if (dist.초기 && dayIdx <= chogiDays) {
    return { stem: dist.초기.stem, from: "초기" };
  }

  if (dist.중기 && dayIdx <= chogiDays + junggiDays) {
    return { stem: dist.중기.stem, from: "중기" };
  }

  return { stem: dist.정기.stem, from: "정기" };
}

export function computeNaegyeok(params: {
  dayStem: string;
  monthBranch: string;
  date: Date;
  pillars: [string, string, string, string];  // 원국 전체 (연월일시)
  emittedStems?: string[];                    // 연/월/일/시 천간
  otherBranches?: string[];                   // 월 제외 연/일/시 지지
  isNeutralized?: (stemKo: string) => boolean;
  mapping?: string;
  // (기존 호환용) 더 이상 필수로 안 씀
  jie?: { date: string } | null;
}): GyeokgukInner {
  const {
    dayStem,
    monthBranch,
    date,
    pillars,
    emittedStems = [],
    otherBranches = [],
    isNeutralized,
    mapping,
  } = params;

  const tokens: ReasonToken[] = [];

  const dist0 = DIST_MAP[monthBranch];
  if (!dist0) {
    return {
      월령: "-",
      사령: "-",
      당령: "-",
      진신: "-",
      가신: "-",
      내격: "-",
      외격: [],
      reason: ["월지 분포표 없음"],
      reasonTokens: [],
    };
  }

  const dist: Dist = {
    초기: dist0.초기 ? { stem: normStemKo(dist0.초기.stem), w: dist0.초기.w } : undefined,
    중기: dist0.중기 ? { stem: normStemKo(dist0.중기.stem), w: dist0.중기.w } : undefined,
    정기: { stem: normStemKo(dist0.정기.stem), w: dist0.정기.w },
  };

  // 월령 = 월지(제강) 정기
  const wolryeong = dist.정기.stem;

  // 사령 = “그 날/그 시점에 월지에서 실제로 집권하는 지장간”
  let saryeong = wolryeong;
 

  // 1) 왕지(자오묘유): 네 기존 규칙 유지 → 정기 고정
  if (["자", "오", "묘", "유"].includes(monthBranch)) {
    saryeong = dist.정기.stem;
    tokens.push({ kind: "WANGJI_FIXED_JUNGI" });
  } else {
    const dayIdx = getJeolipDayIndex(monthBranch, date);

    if (dayIdx != null) {
      // 2) 고지(진술축미) + 삼합 성립이면 중기 우선(네 규칙 유지)
      if (["진", "술", "축", "미"].includes(monthBranch) && hasSamHapWithMonth(monthBranch, otherBranches) && dist.중기) {
        saryeong = dist.중기.stem;
        tokens.push({ kind: "GOJI_SAMHAP_USE_JUNGI" });
      } else {
        // 3) 그 외: 분일로 초/중/정 선택
        const picked = pickByBunil(dist, dayIdx);
        saryeong = picked.stem;

        // ✅ reason token(툴팁) 정합성: 기존 토큰만으로 최대한 맞춰줌
        // - 고지면: 초기면 '절입+12일 이내' / 그 외 '절입+12일 이후'로 흡수
        if (["진", "술", "축", "미"].includes(monthBranch)) {
          if (picked.from === "초기") tokens.push({ kind: "GOJI_EARLY_JEOLIP_USE_CHOGI" });
          else tokens.push({ kind: "GOJI_LATE_JEOLIP_USE_JUNGI" });
        }
        // - 생지(인신사해)면: “투출” 문구가 섞이긴 하지만,
        //   UI상 ‘초/중/정 선택’ 로그라도 남기려고 가장 가까운 토큰으로 흡수
        else if (["인", "신", "사", "해"].includes(monthBranch)) {
          tokens.push({ kind: "SAENGJI_NOT_EMITTED_USE_JUNGI" });
        }
      }
    } else {
      // ❗절입을 못 구하면(혹시) 기존 방식으로 폴백: 투출 우선(생지), 삼합/절입(고지)
      // 생지: 투출 우선
      if (["인", "신", "사", "해"].includes(monthBranch)) {
        const cand: { from: SaryeongPickFrom; stem: string; w: number; emitted: boolean }[] = [];
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
      // 고지: 삼합이면 중기, 아니면 정기
      else if (["진", "술", "축", "미"].includes(monthBranch)) {
        if (hasSamHapWithMonth(monthBranch, otherBranches) && dist.중기) {
          saryeong = dist.중기.stem;
          tokens.push({ kind: "GOJI_SAMHAP_USE_JUNGI" });
        } else {
          saryeong = dist.정기.stem;
          tokens.push({ kind: "GOJI_LATE_JEOLIP_USE_JUNGI" });
        }
      } else {
        saryeong = dist.정기.stem;
      }
    }
  }

  // ✅ 당령 = “사령이 천간 투출했고, 합/충으로 무력화가 아니면”
  let dangryeong = "";
    dangryeong =
    saryeong && emittedStems.includes(saryeong) && !isNeutralized?.(saryeong)
      ? saryeong
      : "";

  // 3) ✅ 진신: 당령 있으면 당령, 없으면 사령
  const jinshin = dangryeong || saryeong;

  // 가신: 진신을 극하면서 음양 동일 천간
  let gasin = "";
  const jinEl = STEM_TO_ELEMENT[jinshin];
  if (jinEl) {
    const needEl = (Object.entries(KE).find(([, v]) => v === jinEl)?.[0] ?? null) as Element | null;
    if (needEl) {
      const pick = Object.entries(STEM_TO_ELEMENT).find(
        ([s, e]) => e === needEl && isYangStem(s) === isYangStem(jinshin)
      );
      gasin = pick?.[0] ?? "";
    }
  }

  if (isNeutralized?.(jinshin)) tokens.push({ kind: "NEUTRALIZED" });

  // 내격: 비견/겁재 제외(단, 예외는 별도 허용)
  let naegyeok = "-";
  const sub = mapStemToTenGodSub(dayStem, jinshin) as TenGodSubtype;

  const isGeonlok = GEONLOK_SET.some(([s, b]) => s === dayStem && b === monthBranch);
  const isYangin2 = isYangStem(dayStem) && YANGIN_MAP[dayStem] === monthBranch;
  const isWolgeop = !isYangStem(dayStem) && WOLGEOP_MAP[dayStem] === monthBranch;

  if (sub === "비견" || sub === "겁재") {
    if (isGeonlok) {
      naegyeok = "건록격";
      tokens.push({ kind: "EX_GEONLOK" });
    } else if (isYangin2) {
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

  return {
    월령: wolryeong,
    사령: saryeong,
    당령: dangryeong,
    진신: jinshin,
    가신: gasin,
    내격: naegyeok,
    외격: outer,
    reason: formatReasons(tokens),
    reasonTokens: tokens,
  };
}
