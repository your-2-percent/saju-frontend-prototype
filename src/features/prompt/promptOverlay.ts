// features/AnalysisReport/promptOverlay.ts
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import type {
  LuckChain,
  UnifiedPowerResult,
} from "@/features/AnalysisReport/utils/unifiedPower";
//import type { Element } from "@/features/AnalysisReport/utils/types";
import {
  STEM_TO_ELEMENT,
  normalizeTo100,
  toBareStemMap,
  toBareFromGZ,
  mapStemToTenGodSub,
} from "./promptCore";

/** 오행 합산용 */
function elementsFromNormalized(
  perStemInt: Record<string, number>,
): Record<"목" | "화" | "토" | "금" | "수", number> {
  const acc: Record<"목" | "화" | "토" | "금" | "수", number> = {
    목: 0,
    화: 0,
    토: 0,
    금: 0,
    수: 0,
  };
  for (const [stem, v] of Object.entries(perStemInt)) {
    const el = STEM_TO_ELEMENT[stem];
    if (el) acc[el] += v;
  }
  return acc; // 추가 normalize/반올림 없음
}

/** 십신 소분류 합산 */
function tenSubFromNormalized(
  perStemInt: Record<string, number>,
  dayStem: string,
): Record<
  "비견" | "겁재" | "식신" | "상관" | "정재" | "편재" | "정관" | "편관" | "정인" | "편인",
  number
> {
  const acc: Record<
    "비견" | "겁재" | "식신" | "상관" | "정재" | "편재" | "정관" | "편관" | "정인" | "편인",
    number
  > = {
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

  for (const [stemKo, v] of Object.entries(perStemInt)) {
    if (v <= 0) continue;
    const sub = mapStemToTenGodSub(dayStem, stemKo);
    acc[sub] += v;
  }
  return acc;
}

/** 십신 대분류 합산 */
function tenMainFromSub(sub: {
  비견: number;
  겁재: number;
  식신: number;
  상관: number;
  정재: number;
  편재: number;
  정관: number;
  편관: number;
  정인: number;
  편인: number;
}) {
  return {
    비겁: sub.비견 + sub.겁재,
    식상: sub.식신 + sub.상관,
    재성: sub.정재 + sub.편재,
    관성: sub.정관 + sub.편관,
    인성: sub.정인 + sub.편인,
  } as const;
}

/* 가중치 */
const LUCK_RATIO = { natal: 50, dae: 30, se: 20, wol: 7, il: 3 } as const;

/** 운별 bare 스템맵을 가중합산 후 100 기준으로 normalize */
function mergeWithRatio(
  parts: { kind: keyof typeof LUCK_RATIO; bare: Record<string, number> }[],
): Record<string, number> {
  const acc: Record<string, number> = {};

  for (const { kind, bare } of parts) {
    const ratio = LUCK_RATIO[kind] ?? 0;
    if (ratio <= 0) continue;

    const norm = normalizeTo100(bare); // 소스 자체 합100 맞춰줌
    for (const [stem, val] of Object.entries(norm)) {
      acc[stem] = (acc[stem] ?? 0) + val * ratio;
    }
  }

  // 최종 합 100으로 normalize
  const sum = Object.values(acc).reduce((a, b) => a + b, 0);
  if (sum > 0) {
    for (const k of Object.keys(acc)) {
      acc[k] = (acc[k] / sum) * 100;
    }
  }
  return acc;
}

/**
 * AnalysisReport와 동일한 방식으로
 *  - perStemAugBare(정수 100 벡터)
 *  - 오행/십신 소·대분류 분포
 * 를 만들어주는 오버레이 계산기
 */
export function makeOverlayByLuck(
  unified: UnifiedPowerResult,
  tab: BlendTab,
  chain?: LuckChain,
) {
  // 1) 원국 스템 bare
  const natalBare = toBareStemMap(unified.perStemElementScaled);

  // 2) 운 스템 bare (탭 조건 동일 적용)
  const daeBare =
    tab !== "원국" && chain?.dae ? toBareFromGZ(chain.dae) : {};
  const seBare =
    (tab === "세운" || tab === "월운" || tab === "일운") && chain?.se
      ? toBareFromGZ(chain.se)
      : {};
  const wolBare =
    (tab === "월운" || tab === "일운") && chain?.wol
      ? toBareFromGZ(chain.wol)
      : {};
  const ilBare =
    tab === "일운" && chain?.il ? toBareFromGZ(chain.il) : {};

  // 3) 가중합산 → normalize 100
  const merged = mergeWithRatio([
    { kind: "natal", bare: natalBare },
    { kind: "dae", bare: daeBare },
    { kind: "se", bare: seBare },
    { kind: "wol", bare: wolBare },
    { kind: "il", bare: ilBare },
  ]);

  // 4) "정수 100"으로 딱 한 번 정규화 — 이 벡터만 사용
  const mergedInt100 = normalizeTo100(merged);

  // 5) 여기서부터는 추가 normalize 금지 — 단순 합산만
  const elementPercentInt = elementsFromNormalized(mergedInt100);
  const totalsSubInt = tenSubFromNormalized(mergedInt100, unified.dayStem);
  const totalsMainInt = tenMainFromSub(totalsSubInt);

  return {
    perStemAugBare: mergedInt100, // 기반 벡터(정수100)
    elementPercent: elementPercentInt, // 오행(정수)
    totalsSub: totalsSubInt, // 십신 소분류(정수)
    totalsMain: totalsMainInt, // 십신 대분류(정수)
  };
}
