// features/AnalysisReport/logic/shinsal/buildShinsalTags.ts
import type { Pillars4 } from "../relations";
import type { ShinsalBasis, TagBucketsByPos } from "./types";
import { getSamjaeYears, getVoidPair } from "./core/common";
import { idx } from "./core/pos";
import { getBranchAt } from "./core/normalize";
import { calcNatalShinsal } from "./calc/natal";
import { calcLuckShinsal } from "./calc/luck";
import { toBucketsByPos, uniqKeepMaxPerPos, uniqKeepMaxPerTag } from "./save/finalize";

export function buildShinsalTags({
  natal,
  daewoon,
  sewoon,
  wolwoon,
  ilwoon,
  basis,
}: {
  natal: Pillars4;
  daewoon?: string | null;
  sewoon?: string | null;
  wolwoon?: string | null;
  ilwoon?: string | null;
  basis?: ShinsalBasis;
}): {
  good: TagBucketsByPos & { dae: string[]; se: string[]; wolun: string[]; ilun: string[] };
  bad: TagBucketsByPos & { dae: string[]; se: string[]; wolun: string[]; ilun: string[] };
  meta: {
    voidPair: { day?: [string, string]; year?: [string, string] };
    samjaeYears: { day?: string[]; year?: string[] };
    currentBasis: { voidBasis: "day" | "year"; samjaeBasis: "day" | "year" };
  };
} {
  const {
    goodPos,
    badPos,
    dayVoid,
    yearVoid,
    dStem,
    dBranch,
    mBranch,
    yBranch,
    branches,
  } = calcNatalShinsal({ natal, daewoon, basis });

  const goodPosDedup = uniqKeepMaxPerTag(uniqKeepMaxPerPos(goodPos));
  const badPosDedup = uniqKeepMaxPerTag(uniqKeepMaxPerPos(badPos));

  const goodByPos = toBucketsByPos(goodPosDedup);
  const badByPos = toBucketsByPos(badPosDedup);

  const dae = calcLuckShinsal({
    src: "dae",
    luck: daewoon ?? null,
    natal,
    dStem,
    dBranch,
    mBranch,
    yBranch,
    branches,
    dayVoid,
    yearVoid,
    basis,
  });
  const se = calcLuckShinsal({
    src: "se",
    luck: sewoon ?? null,
    natal,
    dStem,
    dBranch,
    mBranch,
    yBranch,
    branches,
    dayVoid,
    yearVoid,
    basis,
  });
  const wol = calcLuckShinsal({
    src: "wol",
    luck: wolwoon ?? null,
    natal,
    dStem,
    dBranch,
    mBranch,
    yBranch,
    branches,
    dayVoid,
    yearVoid,
    basis,
  });
  const il = calcLuckShinsal({
    src: "il",
    luck: ilwoon ?? null,
    natal,
    dStem,
    dBranch,
    mBranch,
    yBranch,
    branches,
    dayVoid,
    yearVoid,
    basis,
  });

  return {
    good: { ...goodByPos, dae: dae.good, se: se.good, wolun: wol.good, ilun: il.good },
    bad: { ...badByPos, dae: dae.bad, se: se.bad, wolun: wol.bad, ilun: il.bad },
    meta: {
      voidPair: {
        day: getVoidPair(natal[idx.day]) ?? undefined,
        year: getVoidPair(natal[idx.year]) ?? undefined,
      },
      samjaeYears: {
        day: getSamjaeYears(getBranchAt(natal[idx.day])) ?? undefined,
        year: getSamjaeYears(getBranchAt(natal[idx.year])) ?? undefined,
      },
      currentBasis: {
        voidBasis: basis?.voidBasis ?? "day",
        samjaeBasis: basis?.samjaeBasis ?? "day",
      },
    },
  };
}
