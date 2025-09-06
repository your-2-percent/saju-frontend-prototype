import { computePowerDataDetailed as coreCompute } from "../utils/computePowerData";
import { computeDeukFlags } from "../utils/strength";
import { normalizeGZ } from "./relations";
/**
 * 기존 computePowerDataDetailed를 감싸서
 * - pillars를 한글 간지로 정규화
 * - 득령/득지/득세 플래그를 criteriaMode에 맞춰 재계산해서 보장
 */
export function computePowerDataDetailed(pillars, mode = "hgc", hiddenStemSetting = "all", debug = false, useHarmonyOverlay = false, criteriaMode = "modern") {
    const base = coreCompute(pillars, mode, hiddenStemSetting, debug, useHarmonyOverlay);
    const ko = (pillars ?? [])
        .slice(0, 4)
        .map(normalizeGZ);
    const elScore = base.elementScoreRaw ?? { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    const { flags } = computeDeukFlags(ko, elScore, criteriaMode);
    return {
        totals: base.totals,
        perTenGod: base.perTenGod,
        elementScoreRaw: elScore,
        deukFlags: flags,
    };
}
