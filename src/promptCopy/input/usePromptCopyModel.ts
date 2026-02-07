import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import type { ShinsalBasis } from "@/analysisReport/calc/logic/shinsal";
import type { LuckChain } from "@/analysisReport/calc/utils/unifiedPower";
import { getPlanCapabilities } from "@/shared/lib/plan/planCapabilities";
import { parsePlanTier } from "@/shared/lib/plan/planTier";
import { useAuthUserId } from "@/promptCopy/saveInterface/useAuthUserId";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";
import { usePromptCopyInput } from "@/promptCopy/input/usePromptCopyInput";
import { usePromptCopyCalc } from "@/promptCopy/calc/usePromptCopyCalc";
import { usePromptCopySave } from "@/promptCopy/save/usePromptCopySave";
import type { MainCategoryKey, SubCategoryKey } from "@/features/prompt/buildPrompt";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";

type Input = {
  ms: MyeongSik;
  natal: Pillars4;
  lunarPillars: Pillars4;
  chain?: LuckChain;
  basis?: ShinsalBasis;
  includeTenGod?: boolean;
};

type PromptAccess = "full" | "locked"; // 지금 멤버십 정책에선 hidden 안 씀

export function usePromptCopyModel({
  ms,
  natal,
  lunarPillars,
  chain,
  basis,
  includeTenGod = false,
}: Input) {
  const rtUserId = useMyeongSikStore((s) => s._rtUserId);
  const authUserId = useAuthUserId();
  const effectiveUserId = authUserId ?? rtUserId ?? null;

  // ✅ 핵심: entitlements store를 "구독"해서 plan 변경 시 리렌더 되게 만들기
  const entLoaded = useEntitlementsStore((s) => s.loaded);
  const entUserId = useEntitlementsStore((s) => s.userId);
  const entPlan = useEntitlementsStore((s) => s.plan);

  // ✅ 사용자 매칭 + loaded 기반으로 planTier 결정 (reactive)
  const planTier = useMemo(() => {
    if (!effectiveUserId) return parsePlanTier("FREE");
    if (!entLoaded) return parsePlanTier("FREE");
    if (entUserId !== effectiveUserId) return parsePlanTier("FREE");
    return parsePlanTier(entPlan ?? null);
  }, [effectiveUserId, entLoaded, entUserId, entPlan]);

  const caps = useMemo(() => getPlanCapabilities(planTier), [planTier]);

  const canUseMultiMode = caps.canUseMultiMode;
  const canUseLuckTabs = caps.canUseLuckTabs;

  // ✅ 프롬프트 접근: 이제 caps.promptAccess에 의존하지 말고 canUseAllPrompts로 결정
  const promptAccess: PromptAccess = caps.canUseAllPrompts ? "full" : "locked";

  const input = usePromptCopyInput({ msId: ms.id, canUseMultiMode, canUseLuckTabs });

  const calc = usePromptCopyCalc({
    ms,
    natal,
    lunarPillars,
    chain,
    basis,
    includeTenGod,
    canUseMultiMode,
    canUseLuckTabs,
    input,
  });

  const { copiedAll, copiedInfo, canCopyAll, canCopyInfo, onCopyAll, onCopyInfoOnly } =
    usePromptCopySave(calc.finalText, calc.infoOnlyText);

  function handleMainCategoryChange(next: MainCategoryKey, subs: { key: SubCategoryKey }[]) {
    input.setMainCategory(next);
    input.setSubCategory(subs?.[0]?.key ?? "overview");
  }

  return {
    sections: input.sections,
    toggleSection: input.toggleSection,
    friendMode: input.friendMode,
    setFriendMode: input.setFriendMode,
    teacherMode: input.teacherMode,
    setTeacherMode: input.setTeacherMode,
    date: calc.date,
    setDate: calc.setDate,

    planTier,
    promptAccess,

    canUseMultiMode,
    canUseLuckTabs,

    partnerId: input.partnerId,
    setPartnerId: input.setPartnerId,
    partnerMs: calc.partnerMs,
    mainCategory: input.mainCategory,
    subCategory: input.subCategory,
    setSubCategory: input.setSubCategory,
    relationMode: input.relationMode,
    setRelationMode: input.setRelationMode,
    activeTab: input.activeTab,
    setActiveTab: input.setActiveTab,
    isMultiMode: input.isMultiMode,
    setIsMultiMode: input.setIsMultiMode,
    multiTab: input.multiTab,
    setMultiTab: input.setMultiTab,
    selectedDaeIdx: input.selectedDaeIdx,
    handleToggleDae: input.handleToggleDae,
    rangeControls: input.rangeControls,
    partnerOptions: calc.partnerOptions,
    daeList: calc.daeList,
    tabForLogic: calc.tabForLogic,
    baseText: calc.baseText,
    basePrompt: calc.basePrompt,
    finalText: calc.finalText,
    infoOnlyText: calc.infoOnlyText,
    copiedAll,
    copiedInfo,
    canCopyAll: promptAccess === "full" && canCopyAll,
    canCopyInfo: promptAccess === "full" && canCopyInfo,
    onCopyAll,
    onCopyInfoOnly,
    handleMainCategoryChange,
    setQuestionDraft: input.setQuestionDraft,
    questionDraft: input.questionDraft,
    extraQuestions: input.extraQuestions,
    setExtraQuestions: input.setExtraQuestions,
    handleAddQuestion: input.handleAddQuestion,
    handleRemoveQuestion: input.handleRemoveQuestion,
    handleClearQuestions: input.handleClearQuestions,
    allowManualHour: calc.allowManualHour,
    activePillars: calc.activePillars,
  };
}
