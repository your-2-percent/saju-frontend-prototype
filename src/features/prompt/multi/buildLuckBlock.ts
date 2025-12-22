// features/prompt/multi/buildLuckBlock.ts
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import { buildAllRelationTags } from "@/features/AnalysisReport/logic/relations";
import { buildShinsalTags, type ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import { getTwelveUnseong, getTwelveShinsalBySettings, type EraType } from "@/shared/domain/간지/twelve";
import type { LuckChain, UnifiedPowerResult } from "@/features/AnalysisReport/utils/unifiedPower";
import type { Element } from "@/features/AnalysisReport/utils/types";
import { getNabeum } from "../promptCore";
import { makeOverlayByLuck } from "../promptOverlay";
import {
  elementPercentWithTenGodLabels,
  filterHarmonyTagsByScope,
  filterShinsalByScope,
  type ShinsalScope,
} from "./sectionUtils";

export type LuckScope = ShinsalScope;

export type LuckShowToggles = {
  tenGod: boolean;
  twelveUnseong: boolean;
  twelveShinsal: boolean;
  shinsal: boolean;
  nabeum: boolean;
};

export type ShinsalSettings = {
  baseBranch: string;
  era: EraType;
  gaehwa: boolean;
};

type RelationArgs = {
  daewoon?: string;
  sewoon?: string;
  wolwoon?: string;
  ilwoon?: string;
};

export function buildLuckBlock(params: {
  scope: LuckScope;
  infoText: string;
  gz: string;
  chain: LuckChain;
  natal: Pillars4;
  relationArgs: RelationArgs;
  basis?: ShinsalBasis;
  unified: UnifiedPowerResult;
  dayEl: Element;
  baseDayStem: string;
  show: LuckShowToggles;
  shinsalSettings: ShinsalSettings;
  harmonyMode?: "full" | "scope";
  includeBasicInfo?: boolean;
}): Record<string, unknown> {
  const {
    scope,
    infoText,
    gz,
    chain,
    natal,
    relationArgs,
    basis,
    unified,
    dayEl,
    baseDayStem,
    show,
    shinsalSettings,
    harmonyMode = "scope",
    includeBasicInfo = true,
  } = params;

  const overlay = makeOverlayByLuck(unified, scope, chain);

  const rel = buildAllRelationTags({
    natal,
    daewoon: relationArgs.daewoon,
    sewoon: relationArgs.sewoon,
    wolwoon: relationArgs.wolwoon,
    ilwoon: relationArgs.ilwoon,
  });

  const shinsalRaw = show.shinsal
    ? buildShinsalTags({
        natal,
        daewoon: relationArgs.daewoon,
        sewoon: relationArgs.sewoon,
        wolwoon: relationArgs.wolwoon,
        ilwoon: relationArgs.ilwoon,
        basis,
      })
    : null;

  const nabeum = show.nabeum ? getNabeum(gz) : null;
  const unseong = show.twelveUnseong
    ? getTwelveUnseong(baseDayStem, gz.charAt(1))
    : null;
  const shinsal12 = show.twelveShinsal
    ? getTwelveShinsalBySettings({
        baseBranch: shinsalSettings.baseBranch,
        targetBranch: gz.charAt(1),
        era: shinsalSettings.era,
        gaehwa: shinsalSettings.gaehwa,
      })
    : null;

  const harmony =
    harmonyMode === "full" ? rel : filterHarmonyTagsByScope(rel, scope);

  const entry: Record<string, unknown> = {
    ...(includeBasicInfo ? { 기본정보: infoText, 간지: gz } : {}),
    오행강약: elementPercentWithTenGodLabels(overlay.elementPercent, dayEl),
    ...(show.tenGod ? { 십신강약: overlay.totalsSub } : {}),
    형충회합: harmony,
    ...(show.shinsal ? { 신살: filterShinsalByScope(shinsalRaw, scope) } : {}),
    ...(show.nabeum
      ? {
          납음오행: nabeum
            ? {
                gz,
                nabeum: nabeum.name,
                element: nabeum.element,
                code: nabeum.code,
              }
            : null,
        }
      : {}),
    ...(show.twelveUnseong
      ? { 십이운성: { pos: scope, gz, unseong } }
      : {}),
    ...(show.twelveShinsal
      ? { 십이신살: { pos: scope, gz, shinsal: shinsal12 } }
      : {}),
  };

  return entry;
}
