// features/AnalysisReport/logic/relations.ts
// (리팩토링) 1000줄짜리 단일 파일 → 모듈 분리. 기존 import 경로 호환 유지.

export type {
  Pillars4,
  RelationTags,
  HarmonyOptions,
  LuckOptions,
  HarmonyResult,
  StrengthLevel,
  CoupleHarmony,
} from "./relations/types";

export type { LuckKind, PosLabel } from "./relations/constants";
export { POS_LABELS, POS, LUCK_ORDER, WEAK_SUFFIX } from "./relations/constants";

export type { KoBranch, TrioGroup } from "./relations/groups";
export { SANHE_GROUPS, BANGHAP_GROUPS, TRIAD_SHAPE_GROUPS } from "./relations/groups";

export { normalizeGZ } from "./relations/normalize";

export { buildHarmonyTags } from "./relations/buildHarmonyTags";
export { buildAllRelationTags } from "./relations/buildAllRelationTags";
export { applyHarmonyOverlay } from "./relations/overlay";
export { mergeRelationTags } from "./relations/merge";
export { buildCoupleHarmonyTags_AB } from "./relations/couple";

export {
  SHENG_NEXT,
  SHENG_PREV,
  KE,
  KE_INV,
} from "./relations/types";
