// features/AnalysisReport/logic/shinsal/calc/luck.ts
import type { Pillars4 } from "../../relations";
import type { PosIndex, ShinsalBasis, Source } from "../types";
import { getBranchAt, normStemChar, parseGZ } from "../core/normalize";
import { getSamjaeYears, isInPairList, 귀문_pairs, 원진_pairs, 천라지망_pairs } from "../core/common";
import { findBestPosForBranch } from "../core/find";
import {
  labelLuck_Month,
  labelLuck_Samjae,
  labelLuck_SB,
  labelLuck_SangJoe,
  labelLuck_SrcWithPos,
  labelLuck_Void,
} from "../core/labels";
import {
  MAP_D_BAEKHO,
  MAP_D_CHEONEUL,
  MAP_D_GEUMYEO,
  MAP_D_HONGYEOM,
  MAP_D_YANGIN,
} from "../maps/dayStem";
import {
  MAP_M_CHEONDEOKHAP_S,
  MAP_M_CHEONDEOK_S,
  MAP_M_CHEONUI_B,
  MAP_M_WOLDEOKHAP_S,
  MAP_M_WOLDEOK_S,
} from "../maps/month";
import { MAP_Y_JOGAEK_se, MAP_Y_SANGMOON_se } from "../maps/year";

export function calcLuckShinsal({
  src,
  luck,
  natal,
  dStem,
  dBranch,
  mBranch,
  yBranch,
  branches,
  dayVoid,
  yearVoid,
  basis,
}: {
  src: Source;
  luck: string | null | undefined;
  natal: Pillars4;
  dStem: string;
  dBranch: string;
  mBranch: string;
  yBranch: string;
  branches: string[];
  dayVoid: [string, string] | null;
  yearVoid: [string, string] | null;
  basis?: ShinsalBasis;
}): { good: string[]; bad: string[] } {
  const good: string[] = [];
  const bad: string[] = [];

  const pushLuck = (arr: string[], v: string) => {
    if (!arr.includes(v)) arr.push(v);
  };

  const gz = parseGZ(luck ?? null);
  if (!gz) return { good, bad };

  const Lb = gz.branch;
  const Ls = gz.stem;

  // 월지×운 (길)
  if (normStemChar(MAP_M_CHEONDEOK_S[mBranch] ?? "") === Ls) pushLuck(good, labelLuck_Month("천덕귀인", src));
  if (normStemChar(MAP_M_WOLDEOK_S[mBranch] ?? "") === Ls) pushLuck(good, labelLuck_Month("월덕귀인", src));
  if (normStemChar(MAP_M_CHEONDEOKHAP_S[mBranch] ?? "") === Ls) pushLuck(good, labelLuck_Month("천덕합", src));
  if (normStemChar(MAP_M_WOLDEOKHAP_S[mBranch] ?? "") === Ls) pushLuck(good, labelLuck_Month("월덕합", src));
  if (MAP_M_CHEONUI_B[mBranch]?.includes(Lb)) pushLuck(good, labelLuck_Month("천의성", src));

  // 일간×운 (대표 항목)
  if (MAP_D_CHEONEUL[dStem]?.includes(Lb)) pushLuck(good, labelLuck_SB("천을귀인", src));
  if (MAP_D_GEUMYEO[dStem]?.includes(Lb)) pushLuck(good, labelLuck_SB("금여록", src));
  if (MAP_D_HONGYEOM[dStem]?.includes(Lb)) pushLuck(bad, labelLuck_SB("홍염", src));
  if (MAP_D_YANGIN[dStem]?.includes(Lb)) pushLuck(bad, labelLuck_SB("양인살", src));
  if (MAP_D_BAEKHO[dStem]?.includes(Lb)) pushLuck(bad, labelLuck_SB("백호대살", src));

  // 연지 기준 세운 악살: 상문/조객
  if (src === "se") {
    if (MAP_Y_SANGMOON_se[yBranch]?.includes(Lb)) pushLuck(bad, labelLuck_SangJoe(src, "상문살"));
    if (MAP_Y_JOGAEK_se[yBranch]?.includes(Lb)) pushLuck(bad, labelLuck_SangJoe(src, "조객살"));
  }

  // 천라지망(운지+원국 지지)
  for (const nb of branches) {
    if (isInPairList(천라지망_pairs, Lb, nb)) {
      const pos = findBestPosForBranch(nb, natal)?.pos;
      if (pos !== undefined) pushLuck(bad, labelLuck_SrcWithPos("천라지망", src, pos));
      break;
    }
  }

  // 현침(일간×운지)
  if (new Set(["갑", "신"]).has(dStem) && new Set(["묘", "오", "미", "신"]).has(Lb)) {
    pushLuck(bad, labelLuck_SB("현침살", src));
  }

  // 공망(운지)
  const pair = (basis?.voidBasis ?? "day") === "day" ? dayVoid : yearVoid;
  if (pair && (Lb === pair[0] || Lb === pair[1])) pushLuck(bad, labelLuck_Void(src, basis?.voidBasis ?? "day"));

  // 원진/귀문(운지+원국) — 운 표기는 기존 규격 유지
  for (let p = 0 as PosIndex; p <= 3; p++) {
    const nb = getBranchAt(natal[p]);
    if (isInPairList(원진_pairs, Lb, nb)) pushLuck(bad, labelLuck_SrcWithPos("원진", src, p));
    if (isInPairList(귀문_pairs, Lb, nb)) pushLuck(bad, labelLuck_SrcWithPos("귀문", src, p));
  }

  // 삼재(세운만)
  if (src === "se") {
    const baseBranch = (basis?.samjaeBasis ?? "day") === "day" ? dBranch : yBranch;
    const yrs = baseBranch ? getSamjaeYears(baseBranch) : null;
    if (yrs && yrs.includes(Lb)) pushLuck(bad, labelLuck_Samjae(src, basis?.samjaeBasis ?? "day"));
  }

  return { good, bad };
}
