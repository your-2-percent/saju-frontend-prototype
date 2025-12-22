// features/prompt/topicGuide/types.ts

import type { BlendTab } from "@/features/AnalysisReport/logic/blend";

/**
 * 메인 카테고리
 * - etc: 기본형(공통 프롬프트만)
 */
export type MainCategoryKey =
  | "etc" // ✅ 기본형(공통)
  | "personality"
  | "lifeFlow"
  | "love"
  | "career"
  | "money"
  | "family"
  | "baby"
  | "health"
  | "move"
  | "social"
  | "compat"
  | "risk"
  | "meta";

/** 서브 카테고리 (대분류별 prefix로 구분) */
export type SubCategoryKey =
  // 공통: 전체 개요
  | "overview"

  // 성격 · 기질 (personality)
  | "personality_basic"
  | "personality_shadow"
  | "personality_relationshipStyle"
  | "personality_workStyle"
  | "personality_stressPattern"

  // 인생 흐름 · 사이클 (lifeFlow)
  | "lifeFlow_cycle"
  | "lifeFlow_turningPoint"
  | "lifeFlow_peak"
  | "lifeFlow_down"
  | "lifeFlow_theme"

  // 사랑 · 연애 · 결혼 (love)
  | "love_pattern"
  | "love_timing"
  | "love_partner"
  | "love_current"
  | "love_breakup"
  | "love_marriageChange"

  // 직업 · 진로 · 학업 · 시험 (career)
  | "career_aptitude"
  | "career_mode"
  | "career_jobChange"
  | "career_promotion"
  | "career_study"
  | "career_exam"

  // 돈 · 재물 · 수입/지출 (money)
  | "money_flow"
  | "money_income"
  | "money_spending"
  | "money_saving"
  | "money_asset"
  | "money_debt"
  | "money_invest"
  | "money_bigEvent"

  // 가족 · 가정 (family)
  | "family_origin"
  | "family_current"
  | "family_parents"
  | "family_siblings"
  | "family_children"
  | "family_care"

  // 임신·출산·택일 (baby)
  | "baby_pregnancy"
  | "baby_birth"
  | "baby_selection"

  // 건강 (health)
  | "health_overall"
  | "health_physical"
  | "health_mental"
  | "health_stress"
  | "health_accident"

  // 이사/이동 (move)
  | "move_timing"
  | "move_chance"
  | "move_targetHouse"
  | "move_environment"
  | "move_finance"

  // 인간관계 (social)
  | "social_overall"
  | "social_friend"
  | "social_workspace"
  | "social_network"
  | "social_conflict"

  // 궁합·상대 분석 (compat)
  | "compat_overall"
  | "compat_love"
  | "compat_marriage"
  | "compat_work"
  | "compat_family"
  | "compat_friend"

  // 리스크 (risk)
  | "risk_money"
  | "risk_relationship"
  | "risk_health"
  | "risk_lawsuit"
  | "risk_burnout"

  // 메타 (meta)
  | "meta_structure"
  | "meta_cycle"
  | "meta_trigger"
  | "meta_usage";

// timeMode는 프롬프트 관점에서 "단일 탭 vs 멀티 운 세트"
export type TimeMode = "single" | "multi";
export type RelationMode = "solo" | "couple";

export type TopicContext = {
  topic?: MainCategoryKey;
  subTopic?: SubCategoryKey;
  timeMode?: TimeMode;
  tab?: BlendTab | undefined; // 싱글 모드에서는 필수
  relationMode?: RelationMode;
};

export function normalizeTimeMode(timeMode?: TimeMode): TimeMode {
  return timeMode === "multi" ? "multi" : "single";
}
