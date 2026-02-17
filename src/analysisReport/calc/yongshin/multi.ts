// features/AnalysisReport/calc/yongshin/multi.ts
import type { Element } from "@/analysisReport/calc/utils/types";
import { calcClimatePercents, type ClimatePercents } from "@/analysisReport/input/useClimatePercents";

export type YongshinKind = "EOKBU" | "JOHU" | "TONGGWAN" | "BYEONGYAK" | "GYEOKGUK";

export type YongshinItem = {
  element: string; // 라벨(표시용) - 원본 문자열 유지
  elNorm: Element | null; // 표준화(목/화/토/금/수)
  score: number;
  reasons: string[];
  finalScore?: number; // ✅ 최종 보정 점수 (UI 표시 및 랭킹용)
};

export type YongshinGroup = {
  kind: YongshinKind;
  title: string;
  marker: "★" | "☆" | "·";
  priority: number;
  weight: number;
  applicable: boolean;
  note: string;
  candidates: YongshinItem[];
  maxScore: number;
  fitScore: number;      // 내부점수(계산/비교용)
  finalScore: number;    // ✅ 최종점수(UI 표시용, 최종선택과 일치하도록 보정)
};

export type YongshinMultiResult = {
  bestKind: YongshinKind | null;
  best: YongshinGroup | null;
  groups: YongshinGroup[]; // priority 순 정렬
  adjustedElemPct: Record<Element, number>; // ✅ 보정된 오행 퍼센트 (삼합 등 반영)
};

const ELEMENTS: readonly Element[] = ["목", "화", "토", "금", "수"] as const;
const BRANCH_BOOST = {
  threeHarmony: 20, // (하향) 합국이 너무 지배적이지 않게
  halfStrong: 12,   // (하향) 반합도 적당한 가산점으로
  halfMedium: 8,
  halfWeak: 4,
  monthBranch: 10,  // (대폭 하향) 현대적 관점: 월지 독재 방지, 일주/시주 세력 존중
  maxPerElement: 30, // (하향) 보정치 총합 상한선 낮춤
} as const;

type SeasonKind = "WINTER" | "SUMMER" | "SPRING" | "AUTUMN" | "UNKNOWN";

function getSeasonKind(monthGz: string): SeasonKind {
  const gz = (monthGz ?? "").trim();
  const b = gz ? gz[gz.length - 1] : "";

  if (["해", "자", "축"].includes(b)) return "WINTER";
  if (["사", "오", "미"].includes(b)) return "SUMMER";
  if (["인", "묘", "진"].includes(b)) return "SPRING";
  if (["신", "유", "술"].includes(b)) return "AUTUMN";
  return "UNKNOWN";
}

type TempKind = "cold" | "hot" | "mild";
type WetKind = "wet" | "dry" | "normal";

const CLIMATE_EXTREME_DELTA = 30; // 80% 이상(혹은 20% 이하)일 때만 급한 조후로 판단

function tempKindFromPct(pct: number): TempKind {
  if (pct <= 40) return "cold";
  if (pct >= 60) return "hot";
  return "mild";
}

function wetKindFromPct(pct: number): WetKind {
  if (pct >= 60) return "wet";
  if (pct <= 40) return "dry";
  return "normal";
}

function isClimateExtreme(pct: number): boolean {
  return Math.abs(pct - 50) >= CLIMATE_EXTREME_DELTA;
}

function pickJohuWeight(season: SeasonKind, climate: ClimatePercents | null): number {
  if (!climate) return season === "WINTER" || season === "SUMMER" ? 0.85 : 0.55;

  const tempExtreme = isClimateExtreme(climate.hanNanPct);
  const wetExtreme = isClimateExtreme(climate.joSeupPct);
  const climateExtreme = tempExtreme || wetExtreme;

  if (!climateExtreme) return season === "WINTER" || season === "SUMMER" ? 0.55 : 0.45;

  const tempKind = tempKindFromPct(climate.hanNanPct);
  const seasonTemp: TempKind = season === "WINTER" ? "cold" : season === "SUMMER" ? "hot" : "mild";
  const seasonMatch = tempKind === "mild" || seasonTemp === "mild" || tempKind === seasonTemp;

  // 조후가 급하면(매우 춥거나 뜨거우면) 억부(1.25)보다 우선순위를 높임 (1.5)
  if (season === "WINTER" || season === "SUMMER") return seasonMatch ? 1.5 : 0.8;
  return 0.65;
}

function calcPresentBalance(elemPct: Record<Element, number>, presentMap: Record<Element, boolean>) {
  const presentEls = ELEMENTS.filter((el) => presentMap[el]);
  const vals = presentEls.map((el) => elemPct[el] ?? 0);

  const max = vals.length ? Math.max(...vals) : 0;
  const min = vals.length ? Math.min(...vals) : 0;
  const spread = Math.round(max - min);

  // ✅ “삼행/사행이어도 균형 좋으면” 인정(남아있는 오행 기준 분산이 작을 때)
  const balancedPresent = presentEls.length >= 3 && spread <= 12;

  return { presentEls, spread, balancedPresent };
}


// --------------------
// Normalizers
// --------------------
export function normalizeElementLabel(element: string): Element | null {
  if (/목|木|wood/i.test(element)) return "목";
  if (/화|火|fire/i.test(element)) return "화";
  if (/토|土|earth/i.test(element)) return "토";
  if (/금|金|metal/i.test(element)) return "금";
  if (/수|水|water/i.test(element)) return "수";
  return null;
}

// --------------------
// Five-elements relations
// --------------------
function produces(el: Element): Element {
  switch (el) {
    case "목":
      return "화";
    case "화":
      return "토";
    case "토":
      return "금";
    case "금":
      return "수";
    case "수":
      return "목";
  }
}

function producedBy(el: Element): Element {
  switch (el) {
    case "목": return "수";
    case "화": return "목";
    case "토": return "화";
    case "금": return "토";
    case "수": return "금";
  }
}

function controls(el: Element): Element {
  // "el이 극하는 오행"
  switch (el) {
    case "목":
      return "토";
    case "화":
      return "금";
    case "토":
      return "수";
    case "금":
      return "목";
    case "수":
      return "화";
  }
}

function controlledBy(el: Element): Element {
  // "el을 극하는 오행" (Controller)
  switch (el) {
    case "목": return "금";
    case "화": return "수";
    case "토": return "목";
    case "금": return "화";
    case "수": return "토";
  }
}

type Conflict = {
  a: Element;
  b: Element;
  controller: Element; // a,b 중 “극하는 쪽”
  controlled: Element; // a,b 중 “극당하는 쪽”
  mediator: Element; // 통관(생생으로 잇는) 오행
  reason: string;
};

function detectConflicts(elemPct: Record<Element, number>): Conflict[] {
  // 강한 상극이 “구조적으로 의미있게” 나타나는지 간단 감지
  // 기준 너무 빡세게 잡으면 안 잡힘 → 실무용으로 적당히(24% 이상 둘 다)
  const th = 24;

  const pairs: Array<[Element, Element]> = [
    ["금", "목"],
    ["수", "화"],
    ["목", "토"],
    ["화", "금"],
    ["토", "수"],
  ];

  const out: Conflict[] = [];

  for (const [x, y] of pairs) {
    const px = elemPct[x] ?? 0;
    const py = elemPct[y] ?? 0;
    if (px < th || py < th) continue;
    const ratio = Math.min(px, py) / Math.max(px, py);
    if (ratio < 0.6) continue;

    // 컨트롤 관계 확정
    let controller: Element | null = null;
    let controlled: Element | null = null;

    if (controls(x) === y) {
      controller = x;
      controlled = y;
    } else if (controls(y) === x) {
      controller = y;
      controlled = x;
    } else {
      continue;
    }

    const mediator = produces(controller);
    const reason = `${controller}↘(극)${controlled} 강함 → 통관 ${mediator}(생생 연결)`;

    out.push({
      a: x,
      b: y,
      controller,
      controlled,
      mediator,
      reason,
    });
  }

  return out;
}

// score helper: “이미 많으면 덜 필요”
function needAdjustedScore(base: number, pct: number): number {
  // pct가 0이면 거의 base, pct가 커질수록 깎임
  const k = Math.max(0.1, 1 - pct / 120); // 100%라도 0.16은 남김
  return Math.max(0, Math.round(base * k));
}

function applyAbsentDemotion(
  items: YongshinItem[],
  presentMap: Record<Element, boolean>,
  demoteAbsent: boolean
): YongshinItem[] {
  if (!demoteAbsent) return items;

  return items.map((it) => {
    if (!it.elNorm) return it;
    const present = presentMap[it.elNorm];
    if (present) return it;
    return {
      ...it,
      score: 0,
      reasons: [...it.reasons, "부재후순위: 원국 부재 → 0점"],
    };
  });
}

function sortCandidates(items: YongshinItem[], presentMap: Record<Element, boolean>, demoteAbsent: boolean): YongshinItem[] {
  const getPresent = (el: Element | null): boolean => (el ? presentMap[el] : false);

  return [...items].sort((a, b) => {
    if (demoteAbsent) {
      const ap = getPresent(a.elNorm) ? 1 : 0;
      const bp = getPresent(b.elNorm) ? 1 : 0;
      if (ap !== bp) return bp - ap;
    }
    if (b.score !== a.score) return b.score - a.score;
    return (a.elNorm ?? a.element).localeCompare(b.elNorm ?? b.element, "ko");
  });
}

// --------------------
// Type builders
// --------------------
export function buildJohuCandidates(
  monthGz: string,
  elemPct: Record<Element, number>,
  climate?: ClimatePercents | null
): YongshinItem[] {
  // 조후: 월지(계절) + 한난/조습 퍼센트 반영
  const gz = (monthGz ?? "").trim();
  const branch = gz ? gz[gz.length - 1] : "";

  const winter = new Set(["해", "자", "축"]);
  const summer = new Set(["사", "오", "미"]);
  const spring = new Set(["인", "묘", "진"]);
  const autumn = new Set(["신", "유", "술"]);

  type Pref = { el: Element; base: number; why: string };

  const scores = Object.fromEntries(ELEMENTS.map((el) => [el, 0])) as Record<Element, number>;
  const reasons = Object.fromEntries(ELEMENTS.map((el) => [el, [] as string[]])) as Record<Element, string[]>;

  const addScore = (el: Element, base: number, why: string) => {
    scores[el] += base;
    reasons[el].push(why);
  };

  const addPrefs = (prefs: Pref[]) => {
    for (const p of prefs) addScore(p.el, p.base, p.why);
  };

  let avoidForTemp: Element | null = null;

  let usedClimate = false;
  if (climate) {
    const tempExtreme = isClimateExtreme(climate.hanNanPct);
    const wetExtreme = isClimateExtreme(climate.joSeupPct);
    if (tempExtreme || wetExtreme) {
      usedClimate = true;
      const tempKind = tempKindFromPct(climate.hanNanPct);
      const wetKind = wetKindFromPct(climate.joSeupPct);
      const tempDelta = Math.abs(climate.hanNanPct - 50);
      const wetDelta = Math.abs(climate.joSeupPct - 50);
      const tScale = Math.min(1, tempDelta / 35);
      const wScale = Math.min(1, wetDelta / 35);

      const coldPct = Math.round(100 - climate.hanNanPct);
      const hotPct = Math.round(climate.hanNanPct);
      const wetPct = Math.round(climate.joSeupPct);
      const dryPct = Math.round(100 - climate.joSeupPct);

      if (tempExtreme) {
        const main = Math.round(80 + 50 * tScale);
        const sub = Math.round(40 + 25 * tScale);
        if (tempKind === "cold") {
          addScore("화", main, `조후(한냉 ${coldPct}%): 난온 필요 -> 화`);
          addScore("토", sub, "조후 보조: 한습 완화 -> 토");
          avoidForTemp = "수";
        } else if (tempKind === "hot") {
          addScore("수", main, `조후(조열 ${hotPct}%): 청량 필요 -> 수`);
          addScore("금", sub, "조후 보조: 생수 -> 금");
          avoidForTemp = "화";
        }
      }

      if (wetExtreme) {
        const main = Math.round(55 + 35 * wScale);
        const sub = Math.round(25 + 20 * wScale);
        if (wetKind === "wet") {
          addScore("토", main, `조후(습 ${wetPct}%): 습 조정 -> 토`);
          if (avoidForTemp !== "화") {
            addScore("화", sub, "조후 보조: 습냉 가온 -> 화");
          }
        } else if (wetKind === "dry") {
          if (avoidForTemp !== "수") {
            addScore("수", main, `조후(조 ${dryPct}%): 윤택 필요 -> 수`);
          }
          addScore("목", sub, "조후 보조: 생발 -> 목");
        }
      }
    }
  }

  if (!usedClimate) {
    let prefs: Pref[] = [];
    if (winter.has(branch)) {
      prefs = [
        { el: "화", base: 110, why: "조후(한냉): 난온 필요 → 화 우선" },
        { el: "토", base: 60, why: "조후 보조: 한습 완화·기운 안정 → 토 보조" },
      ];
    } else if (summer.has(branch)) {
      prefs = [
        { el: "수", base: 110, why: "조후(조열): 청량 필요 → 수 우선" },
        { el: "금", base: 70, why: "조후 보조: 수를 돕는 금(생수) 보조" },
      ];
    } else if (spring.has(branch)) {
      prefs = [
        { el: "화", base: 90, why: "조후(춘한): 온기 올림 → 화 보조/우선" },
        { el: "목", base: 55, why: "조후 보조: 생발(성장) 동력 → 목 보조" },
      ];
    } else if (autumn.has(branch)) {
      prefs = [
        { el: "화", base: 85, why: "조후(서량): 온기 필요 → 화 보조" },
        { el: "수", base: 75, why: "조후(조건): 윤택 필요 → 수 보조" },
      ];
    } else {
      // 월지 파싱 실패/특이값
      prefs = [
        { el: "화", base: 60, why: "조후: 월지 판독 불명 → 기본 보정 후보(화)" },
        { el: "수", base: 60, why: "조후: 월지 판독 불명 → 기본 보정 후보(수)" },
      ];
    }
    addPrefs(prefs);
  }

  return ELEMENTS
    .filter((el) => scores[el] > 0)
    .map((el) => ({
      element: el,
      elNorm: el,
      score: needAdjustedScore(scores[el], elemPct[el] ?? 0),
      reasons: [...reasons[el], `현재 ${el} 비율 ${Math.round(elemPct[el] ?? 0)}%`],
    }));
}

export function buildTonggwanCandidates(elemPct: Record<Element, number>): { applicable: boolean; items: YongshinItem[]; note: string } {
  const conflicts = detectConflicts(elemPct);
  if (!conflicts.length) {
    return {
      applicable: false,
      items: [],
      note: "강한 상극 구조가 뚜렷할 때만 통관 후보를 띄움",
    };
  }

  const scoreByEl = new Map<Element, { score: number; reasons: string[] }>();

  for (const c of conflicts) {
    const pa = elemPct[c.a] ?? 0;
    const pb = elemPct[c.b] ?? 0;
    const intensity = Math.min(pa, pb); // 둘 중 약한 쪽이 강해야 “둘 다 강한 상극”
    const base = 95 + Math.round(intensity / 2); // 강할수록 통관 점수↑

    const ex = scoreByEl.get(c.mediator);
    const addReasons = [
      c.reason,
      `(${c.a} ${Math.round(pa)}% · ${c.b} ${Math.round(pb)}%)`,
      `통관 후보: ${c.controller}→${c.mediator}→${c.controlled}`,
    ];

    if (!ex) {
      scoreByEl.set(c.mediator, { score: base, reasons: addReasons });
    } else {
      scoreByEl.set(c.mediator, {
        score: Math.max(ex.score, base),
        reasons: [...ex.reasons, ...addReasons],
      });
    }
  }

  const items: YongshinItem[] = Array.from(scoreByEl.entries()).map(([el, v]) => ({
    element: el,
    elNorm: el,
    score: needAdjustedScore(v.score, elemPct[el] ?? 0),
    reasons: v.reasons,
  }));

  return {
    applicable: true,
    items,
    note: "금목/수화/목토/화금/토수 등 ‘둘 다 강한 상극’일 때 통관(생생 연결) 우선 검토",
  };
}

export function buildByeongyakCandidates(
  elemPct: Record<Element, number>,
  presentMap: Record<Element, boolean>
): { applicable: boolean; items: YongshinItem[]; note: string } {
  // 병약: “극저/결핍” 보강 성격으로 간단 구현
  let minEl: Element = "목";
  let minV = elemPct["목"] ?? 0;

  for (const el of ELEMENTS) {
    const v = elemPct[el] ?? 0;
    if (v < minV) {
      minV = v;
      minEl = el;
    }
  }

  const hasAbsent = ELEMENTS.some((el) => !presentMap[el]);
  const applicable = hasAbsent || minV <= 8;

  if (!applicable) {
    return {
      applicable: false,
      items: [],
      note: "오행이 전반적으로 고르게 있으면 병약(결핍 보강)은 후순위로 내림",
    };
  }

  const base = hasAbsent ? 85 : 70;
  const score = needAdjustedScore(base + Math.round((8 - Math.min(8, minV)) * 6), elemPct[minEl] ?? 0);

  const items: YongshinItem[] = [
    {
      element: minEl,
      elNorm: minEl,
      score,
      reasons: [
        hasAbsent ? "병약(결핍): 원국 부재/결핍 보강 후보" : "병약(극저): 특정 오행이 지나치게 낮아 보강 후보",
        `최저 오행 ${minEl} = ${Math.round(minV)}%`,
      ],
    },
  ];

  return {
    applicable: true,
    items,
    note: "‘아예 없거나(부재)’ 혹은 ‘극저(대충 8% 이하)’인 오행이 있을 때 보강 관점 후보",
  };
}

// Helper: 가장 강한 오행 찾기
function getStrongestElement(elemPct: Record<Element, number>): { el: Element; pct: number } {
  let maxEl: Element = "목";
  let maxVal = -1;
  for (const el of ELEMENTS) {
    const val = elemPct[el] ?? 0;
    if (val > maxVal) {
      maxVal = val;
      maxEl = el;
    }
  }
  return { el: maxEl, pct: maxVal };
}

function getDayStemElement(pillars: string[]): Element | null {
  const stem = pillars[2]?.charAt(0);
  if (!stem) return null;
  if ("갑을".includes(stem)) return "목";
  if ("병정".includes(stem)) return "화";
  if ("무기".includes(stem)) return "토";
  if ("경신".includes(stem)) return "금";
  if ("임계".includes(stem)) return "수";
  return null;
}

function getMonthBranchElement(monthGz: string): Element | null {
  const branch = (monthGz || "").trim().slice(-1);
  if ("인묘寅卯".includes(branch)) return "목";
  if ("사오巳午".includes(branch)) return "화";
  if ("신유申酉".includes(branch)) return "금";
  if ("해자亥子".includes(branch)) return "수";
  if ("진술축미辰戌丑未".includes(branch)) return "토";
  return null;
}

// 한자 -> 한글 변환 헬퍼
function toKoBranch(b: string): string {
  const map: Record<string, string> = {
    子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
    午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해"
  };
  return map[b] ?? b;
}

// Helper: 합국(Hap) 감지 - 삼합 및 반합
function detectCombinations(pillars: string[]): { element: Element; name: string; score: number }[] {
  // 지지를 한글로 통일하여 Set 생성
  const branches = pillars.map((p) => (p && p.length > 1 ? toKoBranch(p[1]) : ""));
  const bSet = new Set(branches);
  const results: { element: Element; name: string; score: number }[] = [];

  // 1. 삼합 (Three Harmony)
  if (bSet.has("인") && bSet.has("오") && bSet.has("술")) results.push({ element: "화", name: "인오술 화국", score: BRANCH_BOOST.threeHarmony });
  if (bSet.has("사") && bSet.has("유") && bSet.has("축")) results.push({ element: "금", name: "사유축 금국", score: BRANCH_BOOST.threeHarmony });
  if (bSet.has("신") && bSet.has("자") && bSet.has("진")) results.push({ element: "수", name: "신자진 수국", score: BRANCH_BOOST.threeHarmony });
  if (bSet.has("해") && bSet.has("묘") && bSet.has("미")) results.push({ element: "목", name: "해묘미 목국", score: BRANCH_BOOST.threeHarmony });

  // 2. 반합 (Half Harmony)
  // 목
  if (bSet.has("해") && bSet.has("묘")) results.push({ element: "목", name: "해묘 반합(목국)", score: BRANCH_BOOST.halfStrong });
  else if (bSet.has("묘") && bSet.has("미")) results.push({ element: "목", name: "묘미 반합(목국)", score: BRANCH_BOOST.halfMedium });
  else if (bSet.has("해") && bSet.has("미")) results.push({ element: "목", name: "해미 반합(목국)", score: BRANCH_BOOST.halfWeak }); // 가합
  // 화
  if (bSet.has("인") && bSet.has("오")) results.push({ element: "화", name: "인오 반합(화국)", score: BRANCH_BOOST.halfStrong });
  else if (bSet.has("오") && bSet.has("술")) results.push({ element: "화", name: "오술 반합(화국)", score: BRANCH_BOOST.halfMedium });
  else if (bSet.has("인") && bSet.has("술")) results.push({ element: "화", name: "인술 반합(화국)", score: BRANCH_BOOST.halfWeak });
  // 금
  if (bSet.has("사") && bSet.has("유")) results.push({ element: "금", name: "사유 반합(금국)", score: BRANCH_BOOST.halfStrong });
  else if (bSet.has("유") && bSet.has("축")) results.push({ element: "금", name: "유축 반합(금국)", score: BRANCH_BOOST.halfMedium });
  else if (bSet.has("사") && bSet.has("축")) results.push({ element: "금", name: "사축 반합(금국)", score: BRANCH_BOOST.halfWeak });
  // 수
  if (bSet.has("신") && bSet.has("자")) results.push({ element: "수", name: "신자 반합(수국)", score: BRANCH_BOOST.halfStrong });
  else if (bSet.has("자") && bSet.has("진")) results.push({ element: "수", name: "자진 반합(수국)", score: BRANCH_BOOST.halfMedium });
  else if (bSet.has("신") && bSet.has("진")) results.push({ element: "수", name: "신진 반합(수국)", score: BRANCH_BOOST.halfWeak });

  return results;
}

function normalizePercents(pcts: Record<Element, number>): Record<Element, number> {
  const sum = Object.values(pcts).reduce((a, b) => a + b, 0);
  if (sum <= 0.001) return pcts;
  const out = { ...pcts };
  for (const k of ELEMENTS) {
    out[k] = (out[k] / sum) * 100;
  }
  return out;
}

function getTenGodRelation(day: Element, target: Element): "비겁" | "식상" | "재성" | "관성" | "인성" {
  if (day === target) return "비겁";
  if (produces(day) === target) return "식상";
  if (controls(day) === target) return "재성";
  if (controls(target) === day) return "관성";
  if (produces(target) === day) return "인성";
  return "비겁"; // fallback
}

export function buildMultiYongshin(args: {
  eokbuList: YongshinItem[];
  monthGz: string;
  elemPct: Record<Element, number>;
  presentMap: Record<Element, boolean>;
  demoteAbsent: boolean;
  // TODO: 격국용신은 나중에 주입 가능하게 뚫어둠
  pillars: string[];
  gyeokgukList?: YongshinItem[] | null;
}): YongshinMultiResult {
  const { eokbuList, monthGz, elemPct, presentMap, demoteAbsent, gyeokgukList, pillars } = args;
  const climate = calcClimatePercents(pillars);

  const dayEl = getDayStemElement(pillars);
  const monthEl = getMonthBranchElement(monthGz);
  const season = getSeasonKind(monthGz); // 계절 미리 계산

  // 0) 세력 재계산: 삼합 & 월지 가중치 적용
  const combinations = detectCombinations(pillars);
  let adjustedElemPct = { ...elemPct };
  const boostNotes: string[] = [];
  const perElementBoost: Record<Element, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };

  // 0-1. 합국 보정 (삼합/반합)
  for (const combo of combinations) {
    perElementBoost[combo.element] += combo.score;
    boostNotes.push(combo.name);
  }

  // 0-2. 월지(계절) 보정
  if (monthEl) {
    perElementBoost[monthEl] += BRANCH_BOOST.monthBranch;
    boostNotes.push(`월지(${monthEl}) 득령`);
  }

  for (const el of ELEMENTS) {
    const capped = Math.min(BRANCH_BOOST.maxPerElement, perElementBoost[el]);
    adjustedElemPct[el] = (adjustedElemPct[el] ?? 0) + capped;
  }

  // 정규화
  adjustedElemPct = normalizePercents(adjustedElemPct);

  // 1) 최강 세력 및 신강/신약 판별
  const strongest = getStrongestElement(adjustedElemPct);
  const target = strongest.el;
  const targetPct = strongest.pct;

  let refinedEokbuList = [...eokbuList];
  let eokbuNote = "제1용신. 일간 강약/균형(억부)을 최우선으로 봄";

  // 신강/신약 판단 (일간 + 인성 vs 식상 + 재성 + 관성)
  let isShinGang = false;
  if (dayEl) {
    const selfPct = adjustedElemPct[dayEl] ?? 0;
    const resourcePct = adjustedElemPct[producedBy(dayEl)] ?? 0;
    const myForce = selfPct + resourcePct;
    isShinGang = myForce >= 45; // 45% 이상이면 신강으로 간주 (보정된 수치 기준)
  }

  // 2) 억부/격국적 용신 판단 (세력이 30% 이상으로 뚜렷할 때)
  if (targetPct >= 30 && dayEl) {
    let recommendedEl: Element | null = null;
    let methodReason = "";
    const relation = getTenGodRelation(dayEl, target);

    // 로직:
    // 1. 신강하면 -> 식상(설기) > 관성(제어) > 재성(소모) 순으로 고려
    // 2. 신약하면 -> 인성(생조) > 비겁(방신) 순으로 고려
    // 3. 단, 특정 세력(target)이 태왕하여 병이 되는 경우, 그 병을 치료하는 약을 우선함.

    switch (relation) {
      case "비겁": // 신강(비겁태왕) -> 식상 설기 우선, 관성 제어 차선
        {
          // ✅ 겨울 수일간 특수 처리: 꽁꽁 언 물은 나무를 키울 수 없으므로 화(재성)가 최우선
          if (dayEl === "수" && season === "WINTER") {
            recommendedEl = "화";
            methodReason = `겨울 수(${dayEl})가 태왕하여 조후 겸 억부로 화(재성)를 용신으로 삼음`;
          } else {
            const output = produces(dayEl);
            // 식상이 너무 약하지 않으면 식상 우선
            recommendedEl = output;
            methodReason = `일간(${dayEl})이 태왕하여 식상(${output})으로 설기`;
          }
        }
        break;
      case "인성": // 신강(인성태왕) -> 재성으로 인성 제어 (용재파인)
        recommendedEl = controlledBy(target); // ✅ Fix: 인성을 극하는 오행(재성)을 찾아야 함
        methodReason = `인성(${target})이 강해 재성(${recommendedEl})으로 제어(용재파인)`;
        break;
      case "식상": // 신약(식상태왕) -> 인성으로 일간 보호 (상관패인)
        recommendedEl = producedBy(dayEl);
        methodReason = `식상(${target})이 강해 인성(${recommendedEl})으로 일간 보호(상관패인)`;
        break;
      case "재성": // 신약(재성태왕) -> 비겁으로 재성 감당 (득비리재)
        recommendedEl = dayEl;
        methodReason = `재성(${target})이 강해 비겁(${recommendedEl})으로 힘을 보탬(득비리재)`;
        break;
      case "관성": // 신약(관살태왕) -> 인성으로 화살 (살인상생)
        // 관살이 강할 때 식상제살(식상) vs 살인상생(인성)
        // 일간이 너무 약하면 인성이 우선.
        if (isShinGang) {
             recommendedEl = produces(dayEl); // 식상 (식신제살)
             methodReason = `관살(${target})에 대항하여 식상(${recommendedEl})으로 제살(식신제살)`;
        } else {
             recommendedEl = producedBy(dayEl); // 인성 (살인상생)
             methodReason = `관살(${target})이 강해 인성(${recommendedEl})으로 화살(살인상생)`;
        }
        break;
    }
    
    if (recommendedEl) {
      const boostReason = boostNotes.length > 0 ? `[${boostNotes.join(", ")}] 반영` : "세력 균형";
      refinedEokbuList = [
        {
          element: recommendedEl,
          elNorm: recommendedEl,
          score: 150, // 압도적 점수 부여
          reasons: [methodReason, boostReason],
        },
        ...eokbuList.filter((x) => x.elNorm !== recommendedEl),
      ];
      eokbuNote = `세력 분석: ${methodReason}`;
    }
  }

  const eokbuCandidates = sortCandidates(
    applyAbsentDemotion(refinedEokbuList, presentMap, demoteAbsent),
    presentMap,
    demoteAbsent
  );

  // 2) 조후
  const johuCandidates = sortCandidates(
    applyAbsentDemotion(buildJohuCandidates(monthGz, elemPct, climate), presentMap, demoteAbsent),
    presentMap,
    demoteAbsent
  );

  const balance = calcPresentBalance(elemPct, presentMap);

  // ✅ 조후는 한난/조습 퍼센트와 계절 일치도를 함께 반영
  const johuWeight = pickJohuWeight(season, climate);

  // ✅ 억부는 기본 가중치
  const eokbuWeight = 1.25;

  // 3) 통관
  const tong = buildTonggwanCandidates(elemPct);
  const tongCandidates = sortCandidates(
    applyAbsentDemotion(tong.items, presentMap, demoteAbsent),
    presentMap,
    demoteAbsent
  );

  // 4) 병약
  const by = buildByeongyakCandidates(elemPct, presentMap);
  const byCandidates = sortCandidates(
    applyAbsentDemotion(by.items, presentMap, demoteAbsent),
    presentMap,
    demoteAbsent
  );

  // 5) 격국(일단 외부에서 주입되는 경우만)
  const ggRaw = Array.isArray(gyeokgukList) ? gyeokgukList : [];
  const ggApplicable = ggRaw.length > 0;
  const ggCandidates = sortCandidates(applyAbsentDemotion(ggRaw, presentMap, demoteAbsent), presentMap, demoteAbsent);

  // "세력이 매우 장악했을때, 그것을 따르는게 나으니 격국용신으로 잡아주십시오."
  // 특정 오행이 60% 이상이면 종격 가능성이 높으므로 격국 가중치 상향
  const isDominant = strongest.pct >= 60;
  const gyeokgukWeight = isDominant ? 1.6 : 0.55; // 지배적일 경우 억부(1.25)보다 높게
  const gyeokgukNote = isDominant ? "세력이 매우 강하여 이를 따르는 격국(종격 등) 우선 고려" : (ggApplicable ? "억부/조후와 겹치지 않을 때 보조적으로 고려" : "격국 후보 없음");

  const mkMax = (xs: YongshinItem[]) => Math.max(0, ...xs.map((x) => (Number.isFinite(x.score) ? x.score : 0)));

  const groupsBase: Array<Omit<YongshinGroup, "maxScore" | "fitScore" | "finalScore">> = [
    {
      kind: "EOKBU",
      title: "억부용신",
      marker: "★",
      priority: 1,
      weight: eokbuWeight, // ✅
      applicable: eokbuCandidates.length > 0,
      note: eokbuNote,
      candidates: eokbuCandidates,
    },
    {
      kind: "JOHU",
      title: "조후용신",
      marker: "☆",
      priority: 2,
      weight: johuWeight, // ✅
      applicable: true,
      note:
        season === "WINTER"
          ? "제2용신. 겨울(한냉) 조후 보정 관점"
          : season === "SUMMER"
            ? "제2용신. 여름(조열) 조후 보정 관점"
            : "제2용신. 조후는 계절 극단에서 우선, 그 외엔 보조",
      candidates: johuCandidates,
    },
    {
      kind: "TONGGWAN",
      title: "통관용신",
      marker: "·",
      priority: 3,
      weight: 0.7,
      applicable: tong.applicable,
      note: tong.note,
      candidates: tongCandidates,
    },
    {
      kind: "BYEONGYAK",
      title: "병약용신",
      marker: "·",
      priority: 3,
      weight: 0.7,
      applicable: by.applicable,
      note: by.note,
      candidates: byCandidates,
    },
    {
      kind: "GYEOKGUK",
      title: "격국용신",
      marker: "·",
      priority: 4,
      weight: gyeokgukWeight,
      applicable: ggApplicable,
      note: gyeokgukNote,
      candidates: ggCandidates,
    },
  ];

  const groups: YongshinGroup[] = groupsBase
    .map((g) => {
      // 1) 그룹 내 모든 후보에 대해 finalScore 계산
      const calculatedCandidates = g.candidates.map((cand) => {
        if (!g.applicable) return { ...cand, finalScore: 0 };

        let fs = cand.score * g.weight;

        // 억부 보너스/패널티
        if (g.kind === "EOKBU") {
          if (!balance.balancedPresent) {
            const bonus = Math.min(35, Math.round(balance.spread * 0.9));
            fs += bonus;
          } else {
            fs *= 0.75;
          }
        }

        // 부재 패널티 (demoteAbsent가 true면 이미 score가 0이지만, false일 때도 우선순위 낮춤)
        if (cand.elNorm && !presentMap[cand.elNorm]) {
          fs *= 0.25;
        }

        // 스케일링
        fs = Math.min(99, fs * 0.55);
        
        return { ...cand, finalScore: Math.round(fs) };
      });

      // 2) finalScore 기준 재정렬
      calculatedCandidates.sort((a, b) => (b.finalScore ?? 0) - (a.finalScore ?? 0));

      const top = calculatedCandidates[0];
      const fitScore = top?.finalScore ?? 0;
      const maxScore = mkMax(calculatedCandidates);

      return {
        ...g,
        maxScore,
        fitScore,
        finalScore: fitScore, // 그룹 대표 점수
        candidates: calculatedCandidates,
      };
    })
    .sort((a, b) => a.priority - b.priority);

    // best 선택(기본은 fitScore 최대)
    const bestByScore = [...groups]
    .filter((g) => g.applicable && g.candidates.length > 0)
    .sort((a, b) => (b.fitScore !== a.fitScore ? b.fitScore - a.fitScore : a.priority - b.priority))[0];

    // ✅ best 결정 후: UI용 최종점수(finalScore) 보정
    const maxFit = Math.max(0, ...groups.map((g) => g.fitScore));
    const bestKind = bestByScore?.kind ?? null;

    const groupsFinal: YongshinGroup[] = groups.map((g) => {
      if (!bestKind) return g;

      // best가 내부 1등이 아니더라도, UI에선 “최종선택”이 항상 1등 점수로 보이게
      if (g.kind === bestKind) {
        const boosted = g.fitScore < maxFit ? maxFit + 1 : g.fitScore;
        return { ...g, finalScore: boosted };
      }

      return { ...g, finalScore: g.fitScore };
    });

    const bestFinal = bestKind ? (groupsFinal.find((g) => g.kind === bestKind) ?? null) : null;

    return {
      bestKind,
      best: bestFinal,
      groups: groupsFinal,
    adjustedElemPct,
    };
}
