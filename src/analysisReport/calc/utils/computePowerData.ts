// features/AnalysisReport/utils/computePowerData.ts
import type { PowerData, TenGod, Element } from "./types";
import { getTenGodColors } from "./colors";
import { TONGGEUN_HAGEONCHUNG, TONGGEUN_CLASSIC } from "./tonggeun";
import { applyHarmonyOverlay, normalizeGZ } from "../logic/relations";
import { computeDeukFlags } from "./strength";
import type { ComputeOptions, ComputeResult, TenGodSubtype } from "@/analysisReport/calc/powerDataTypes";
import {
  BRANCH_EL,
  BRANCH_MAIN_STEM,
  LV_ADJ,
  KE,
  PILLAR_ORDER,
  SHENG_NEXT,
  SHENG_PREV,
  STEM_EL,
  WEIGHTS_CLASSIC,
  WEIGHTS_MODERN,
  allocateByLargestRemainder,
  branchPolarity,
  elementOfGodMajor,
  gzBranch,
  gzStem,
  normalizeTo100Strict,
  projectionPercent,
  relationLevel,
  stemPolarity,
  toKoGZ,
  type YinYang,
} from "@/analysisReport/calc/powerDataPrimitives";
import {
  buildEmptyPowerDataResult,
  deriveDayStemAndElement,
  hasRequiredPillars,
} from "@/analysisReport/calc/powerDataBuilders";

export { elementOfGodMajor, normalizeTo100Strict };

/* =========================
 * 메인 계산기
 * ========================= */
export function computePowerDataDetailed(opts: ComputeOptions): ComputeResult {
  
  const {
    pillars,
    dayStem: dayStemOverride,
    mode: hiddenMode,
    debug,
    useHarmonyOverlay,
    criteriaMode,
    luck,
  } = opts;

  const WEIGHTS = criteriaMode === "modern" ? WEIGHTS_MODERN : WEIGHTS_CLASSIC;
  const tongMap = hiddenMode === "classic" ? TONGGEUN_CLASSIC : TONGGEUN_HAGEONCHUNG;

  // 누적 버킷
  const elementScore: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  const stemScoreRaw: Record<string, number> = {}; // 디버깅 추적용

  // 입력 정규화 (항상 한글 간지)
  const pillarsKo = (pillars ?? []).slice(0, 4).map(toKoGZ);
  if (!hasRequiredPillars(pillarsKo)) {
    return buildEmptyPowerDataResult(elementScore);
  }

  const { dayStem, dayEl } = deriveDayStemAndElement(pillarsKo, dayStemOverride);

  // 파트 트래킹
  type StemPart = { stem?: string; el?: Element; pol?: YinYang; val: number };
  const stemParts: StemPart[] = [{ val: 0 }, { val: 0 }, { val: 0 }, { val: 0 }];

  type BranchPart = { el: Element; pol: YinYang; val: number };
  const branchParts: BranchPart[][] = [[], [], [], []];

  /* 1) 원국 천간/지지 '존재 가산'(stemScoreRaw만, elementScore에는 영향 X) */
  for (const gz of pillarsKo) {
    if (!gz) continue;
    const stem = gz.charAt(0);
    const branch = gz.charAt(1);
    stemScoreRaw[stem] = (stemScoreRaw[stem] ?? 0) + 50;
    const mainStem = BRANCH_MAIN_STEM[branch];
    if (mainStem) stemScoreRaw[mainStem] = (stemScoreRaw[mainStem] ?? 0) + 50;
  }

  /* 2) 자리 점수(천간/지지) */
  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i]!;
    if (!gz || gz.length < 2) continue;
    const pos = PILLAR_ORDER[i]!;
    const s = gzStem(gz);
    const b = gzBranch(gz);
    const w = WEIGHTS[pos];

    // 천간 기본
    const elS = STEM_EL(s);
    if (elS) {
      elementScore[elS] += w.stem;
      stemParts[i] = { stem: s, el: elS, pol: stemPolarity(s), val: w.stem };
    }

    // 지지 기본(주기운 100%)
    const elB = BRANCH_EL(b);
    if (elB) {
      elementScore[elB] += w.branch;
      branchParts[i].push({ el: elB, pol: branchPolarity(b), val: w.branch });
    }
  }

  /* 2-1) 통근율(천간) */
  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i]!;
    if (!gz || gz.length < 2) continue;
    const pos = PILLAR_ORDER[i]!;
    const rate = tongMap[gz] ?? 0;
    if (rate === 0) continue;
    const s = gzStem(gz);
    const elS = STEM_EL(s);
    if (!elS) continue;
    const add = WEIGHTS[pos].stem * rate;
    elementScore[elS] += add;
    stemParts[i].val += add;
  }

  /* 2-2) 투출(지지 → 같은 오행의 천간) */
  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i]!;
    if (!gz || gz.length < 2) continue;
    const b = gzBranch(gz);
    const mainEl = BRANCH_EL(b);
    if (!mainEl) continue;

    const base = WEIGHTS[PILLAR_ORDER[i]!].branch;
    const bPol = branchPolarity(b);

    let addSum = 0;
    const cand: number[] = [i];
    if (i - 1 >= 0) cand.push(i - 1);
    if (i + 1 <= 3) cand.push(i + 1);
    if (i - 2 >= 0) cand.push(i - 2);
    if (i + 2 <= 3) cand.push(i + 2);
    const uniq = Array.from(new Set(cand));

    for (const si of uniq) {
      if (!pillarsKo[si] || pillarsKo[si]!.length < 2) continue;
      const s = gzStem(pillarsKo[si]!);
      const sEl = STEM_EL(s);
      if (!sEl || sEl !== mainEl) continue;
      const same = stemPolarity(s) === bPol;
      const dist = Math.abs(si - i) as 0 | 1 | 2;
      const pct = projectionPercent(dist, same);
      addSum += base * pct;
    }

    if (addSum !== 0) {
      elementScore[mainEl] += addSum;
      branchParts[i].push({ el: mainEl, pol: bPol, val: addSum });
    }
  }

  /* 3) 왕상휴수사 보정(천간/지지 각각) */
  // 천간
  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i]!;
    if (!gz || gz.length < 2) continue;
    const s = gzStem(gz);
    const el = STEM_EL(s);
    if (!el) continue;
    let adj = 0;

    const b = gzBranch(pillarsKo[i]!);
    const nbElV = BRANCH_EL(b);
    if (nbElV) adj += LV_ADJ[relationLevel(el, nbElV)];

    const sideIdx = i === 0 ? [1] : i === 3 ? [2] : [i - 1, i + 1];
    for (const j of sideIdx) {
      const ns = gzStem(pillarsKo[j]!);
      const nbEl = STEM_EL(ns);
      if (!nbEl) continue;
      adj += LV_ADJ[relationLevel(el, nbEl)];
    }

    const before = stemParts[i].val;
    if (before !== 0 && adj !== 0) {
      const after = Math.round(before * (1 + adj) * 10) / 10;
      const delta = after - before;
      elementScore[el] += delta;
      stemParts[i].val = after;
    }
  }
  // 지지
  for (let i = 0; i < 4; i++) {
    const gz = pillarsKo[i]!;
    if (!gz || gz.length < 2) continue;
    const b = gzBranch(gz);
    const el = BRANCH_EL(b);
    if (!el) continue;
    let adj = 0;

    const s = gzStem(pillarsKo[i]!);
    const nbElU = STEM_EL(s);
    if (nbElU) adj += LV_ADJ[relationLevel(el, nbElU)];

    const sideIdx = i === 0 ? [1] : i === 3 ? [2] : [i - 1, i + 1];
    for (const j of sideIdx) {
      if (!pillarsKo[j] || pillarsKo[j]!.length < 2) continue;
      const nb = gzBranch(pillarsKo[j]!);
      const nbEl = BRANCH_EL(nb);
      if (!nbEl) continue;
      adj += LV_ADJ[relationLevel(el, nbEl)];
    }

    const baseHere = branchParts[i].reduce((a, p) => a + p.val, 0);
    if (baseHere !== 0 && adj !== 0) {
      const after = Math.round(baseHere * (1 + adj) * 10) / 10;
      const delta = after - baseHere;
      elementScore[el] += delta;
      if (branchParts[i].length > 0) branchParts[i][0]!.val += delta;
    }
  }

  /* (옵션) 합충형파해 오버레이 */
  if (useHarmonyOverlay) {
    applyHarmonyOverlay(pillarsKo, elementScore);
  }

  /* 3.5) 운 오버레이 — ✅ 단일 소스에 비례 가산 */
  type LuckKind = "dae" | "se" | "wol" | "il";
  const LUCK_PCT: Record<LuckKind, { stem: number; branch: number }> = {
    dae: { stem: 0.04, branch: 0.04 },
    se: { stem: 0.03, branch: 0.03 },
    wol: { stem: 0.02, branch: 0.02 },
    il: { stem: 0.01, branch: 0.01 },
  };

  type LuckPart = { stem?: string; el: Element; pol: YinYang; val: number };
  const luckSubs: LuckPart[] = [];

  if (!luck || luck.tab === "원국") {
    // 운이 없거나 원국 탭일 경우 → Luck 가산 로직 전부 무시하고 바로 아래 단계로 이동
  } else {
  function addLuckGZ(raw: string | null | undefined, kind: LuckKind) {
    const ko = raw ? normalizeGZ(raw) : "";
    if (!ko || ko.length < 2) return;
    const s = gzStem(ko);
    const b = gzBranch(ko);
    const elS = STEM_EL(s);
    const elB = BRANCH_EL(b);
    const sumBase = Math.max(
      1,
      (elementScore.목 ?? 0) +
        (elementScore.화 ?? 0) +
        (elementScore.토 ?? 0) +
        (elementScore.금 ?? 0) +
        (elementScore.수 ?? 0),
    );
    const pct = LUCK_PCT[kind];

    if (elS) {
      const add = Math.round(sumBase * pct.stem);
      elementScore[elS] += add;
      luckSubs.push({ stem: s, el: elS, pol: stemPolarity(s), val: add });
    }
    if (elB) {
      const add = Math.round(sumBase * pct.branch);
      elementScore[elB] += add;
      luckSubs.push({ el: elB, pol: branchPolarity(b), val: add });
    }
  }

    addLuckGZ(luck.dae, "dae");
    if (luck.tab === "세운" || luck.tab === "월운" || luck.tab === "일운") addLuckGZ(luck.se, "se");
    if (luck.tab === "월운" || luck.tab === "일운") addLuckGZ(luck.wol, "wol");
    if (luck.tab === "일운") addLuckGZ(luck.il, "il");
  }

  /* 4) 오행→십신 대분류 누적 (단일 소스: elementScore) */
  const tenAccSimple: Record<TenGod, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  (Object.entries(elementScore) as [Element, number][]).forEach(([el, v]) => {
    const major = pickMajorByElement(el, dayEl);
    tenAccSimple[major] += v;
  });

  // 대분류 합 100 정수
  const orderMajors: TenGod[] = ["비겁", "식상", "재성", "관성", "인성"];
  const pctMajors = normalizeTo100Strict(orderMajors.map((k) => tenAccSimple[k]));
  const colors = getTenGodColors(dayStem);
  const totals: PowerData[] = orderMajors.map((name, i) => ({
    name,
    value: pctMajors[i]!,
    color: colors[name],
  }));

  /* 5) 소분류(십신) 비율 — elementScore에서 균등 파생 + 대분류에 정확히 맞춤 */
  const subAcc: Record<TenGodSubtype, number> = {
    비견: 0,
    겁재: 0,
    식신: 0,
    상관: 0,
    정재: 0,
    편재: 0,
    정관: 0,
    편관: 0,
    정인: 0,
    편인: 0,
  };

  function pickMajorByElement(el: Element, dEl: Element): TenGod {
    if (el === dEl) return "비겁";
    if (SHENG_NEXT[dEl] === el) return "식상";
    if (KE[dEl] === el) return "재성";
    if (KE[el] === dEl) return "관성";
    if (SHENG_PREV[dEl] === el) return "인성";
    return "비겁";
  }

  function addSub(el: Element, val: number) {
    const major = pickMajorByElement(el, dayEl);
    // 균등 50:50 분배(음/양)
    switch (major) {
      case "비겁":
        subAcc["비견"] += val * 0.5;
        subAcc["겁재"] += val * 0.5;
        break;
      case "식상":
        subAcc["식신"] += val * 0.5;
        subAcc["상관"] += val * 0.5;
        break;
      case "재성":
        subAcc["정재"] += val * 0.5;
        subAcc["편재"] += val * 0.5;
        break;
      case "관성":
        subAcc["정관"] += val * 0.5;
        subAcc["편관"] += val * 0.5;
        break;
      case "인성":
        subAcc["정인"] += val * 0.5;
        subAcc["편인"] += val * 0.5;
        break;
    }
  }

  (Object.entries(elementScore) as [Element, number][]).forEach(([el, v]) => {
    if (v > 0) addSub(el, v);
  });

  // 대분류 totals 값에 정확히 맞춰 소분류 재스케일
  const perTenGod: Record<TenGod, { a: TenGodSubtype; b: TenGodSubtype; aVal: number; bVal: number }> = {
    비겁: { a: "비견", b: "겁재", aVal: 0, bVal: 0 },
    식상: { a: "식신", b: "상관", aVal: 0, bVal: 0 },
    재성: { a: "정재", b: "편재", aVal: 0, bVal: 0 },
    관성: { a: "정관", b: "편관", aVal: 0, bVal: 0 },
    인성: { a: "정인", b: "편인", aVal: 0, bVal: 0 },
  };
  for (const name of orderMajors) {
    const target = totals.find((t) => t.name === name)?.value ?? 0;
    const aName = perTenGod[name]!.a;
    const bName = perTenGod[name]!.b;
    const a0 = subAcc[aName] ?? 0;
    const b0 = subAcc[bName] ?? 0;
    const sum = a0 + b0;
    if (sum > 0) {
      const a = Math.floor((target * a0) / sum + 0.5);
      const b = target - a;
      perTenGod[name]!.aVal = a;
      perTenGod[name]!.bVal = b;
    } else {
      perTenGod[name]!.aVal = Math.floor(target / 2 + 0.5);
      perTenGod[name]!.bVal = target - perTenGod[name]!.aVal;
    }
  }

  // 득령/득지/득세
  const { flags: deukFlags } = computeDeukFlags(pillarsKo, elementScore);

  /* 6) perStemElement / perStemElementScaled — 단일 소스에서 파생 */
  const perStemRaw: Record<string, number> = {};

  // 원국 천간
  stemParts.forEach((p) => {
    if (p.stem && p.el && p.val) {
      const label = `${p.stem}${p.el}`; // 예: "경금"
      perStemRaw[label] = (perStemRaw[label] ?? 0) + p.val;
    }
  });

  // 원국 지지를 대표천간으로 귀속 (본기 기준)
  for (let idx = 0; idx < 4; idx++) {
    const gz = pillarsKo[idx]!;
    if (!gz || gz.length < 2) continue;
    const b = gzBranch(gz);
    const mainStem = BRANCH_MAIN_STEM[b];
    const elB = BRANCH_EL(b);
    if (!mainStem || !elB) continue;
    const label = `${mainStem}${elB}`;
    const sum = branchParts[idx].reduce((s, p) => s + p.val, 0);
    perStemRaw[label] = (perStemRaw[label] ?? 0) + sum;
  }

  // 해밀턴 배분으로 majors(=totals) 값에 정확히 맞춤
  const STEM_LABELS = ["갑목", "을목", "병화", "정화", "무토", "기토", "경금", "신금", "임수", "계수"];
  const perStemElementScaled: Record<string, number> = {};
  STEM_LABELS.forEach((l) => {
    perStemElementScaled[l] = 0;
  });

  orderMajors.forEach((god) => {
    const target = totals.find((t) => t.name === god)?.value ?? 0; // ex) 33
    const majorEl = elementOfGodMajor(god, dayEl);
    const parts = Object.entries(perStemRaw).filter(([label]) => label.endsWith(majorEl)); // ["경금", v1], ["신금", v2] 등

    const labels = parts.map(([label]) => label);
    const weights = parts.map(([, v]) => v);

    const totalUnits = Math.max(0, Math.round(target * 10)); // 0.1 단위
    const units = allocateByLargestRemainder(weights.length ? weights : [1, 1], totalUnits);

    // 단위 → 실수(소수1자리)
    if (labels.length === 2) {
      perStemElementScaled[labels[0]!] = (units[0] ?? Math.round(totalUnits / 2)) / 10;
      perStemElementScaled[labels[1]!] = (units[1] ?? (totalUnits - (units[0] ?? 0))) / 10;
    } else if (labels.length === 1) {
      perStemElementScaled[labels[0]!] = totalUnits / 10;
    } else {
      // raw가 없을 때도 majors를 정확히 채우기 위해 균등 분배
      const names =
        majorEl === "목"
          ? ["갑목", "을목"]
          : majorEl === "화"
          ? ["병화", "정화"]
          : majorEl === "토"
          ? ["무토", "기토"]
          : majorEl === "금"
          ? ["경금", "신금"]
          : ["임수", "계수"];
      const u0 = Math.floor(totalUnits / 2);
      const u1 = totalUnits - u0;
      perStemElementScaled[names[0]!] += u0 / 10;
      perStemElementScaled[names[1]!] += u1 / 10;
    }
  });

  /* 7) 대분류 → 오행 역매핑(합100 정수) — 프롬프트/펜타곤 공용 */
  const order5: Element[] = ["목", "화", "토", "금", "수"];
  const elementPercentRaw: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const t of totals) {
    const el = elementOfGodMajor(t.name as TenGod, dayEl);
    elementPercentRaw[el] += t.value; // totals는 이미 정수
  }
  const normalized5 = normalizeTo100Strict(order5.map((k) => elementPercentRaw[k]));
  const elementPercent100: Record<Element, number> = {
    목: normalized5[0]!,
    화: normalized5[1]!,
    토: normalized5[2]!,
    금: normalized5[3]!,
    수: normalized5[4]!,
  };

  if (debug) {
    console.log({
      elementScore,
      totals,
      perTenGod,
      perStemRaw,
      perStemElementScaled,
      elementPercent100,
    });
  }

  const overlay = {
    totalsSub: subAcc,                         // 십신 소분류 10개 (비견~편인)
    perStemAugBare: perStemRaw,                // 천간별 세부 오행 기여 (예: 경금, 신금)
    perStemAugFull: perStemElementScaled,      // 해밀턴 분배 완료된 오행별 정규값
  };
  return {
    overlay,
    totals,
    perTenGod,
    PerTenGodSub: subAcc,
    stemScoreRaw,
    elementScoreRaw: elementScore,
    deukFlags,
    perStemElement: perStemRaw,
    perStemElementScaled,
    elementPercent100,
  };
}


