import { useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import type { LuckChain } from "@/features/AnalysisReport/utils/unifiedPower";
import { getEffectivePlanTier } from "@/shared/lib/plan/access";
import { getPlanCapabilities } from "@/shared/lib/plan/planCapabilities";
import { useAuthUserId } from "@/features/PromptCopyCard/saveInterface/useAuthUserId";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { usePromptCopyInput } from "@/features/PromptCopyCard/input/usePromptCopyInput";
import { usePromptCopyCalc } from "@/features/PromptCopyCard/calc/usePromptCopyCalc";
import { usePromptCopySave } from "@/features/PromptCopyCard/save/usePromptCopySave";
import type { MainCategoryKey, SubCategoryKey } from "@/features/prompt/buildPrompt";

type Input = {
  ms: MyeongSik;
  natal: Pillars4;
  lunarPillars: Pillars4;
  chain?: LuckChain;
  basis?: ShinsalBasis;
  includeTenGod?: boolean;
};

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

  const planTier = useMemo(() => getEffectivePlanTier(effectiveUserId), [effectiveUserId]);
  const caps = useMemo(() => getPlanCapabilities(planTier), [planTier]);
  const canUseMultiMode = caps.canUseMultiMode;
  const canUseLuckTabs = caps.canUseLuckTabs;

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

  const { copiedAll, copiedInfo, canCopyAll, canCopyInfo, onCopyAll, onCopyInfoOnly } = usePromptCopySave(
    calc.finalText,
    calc.infoOnlyText
  );

  function handleMainCategoryChange(next: MainCategoryKey, subs: { key: SubCategoryKey }[]) {
    input.setMainCategory(next);
    input.setSubCategory(subs?.[0]?.key ?? "overview");
  }

  return {
    sections: input.sections,
    toggleSection: input.toggleSection,
    tone: input.tone,
    setTone: input.setTone,
    friendMode: input.friendMode,
    setFriendMode: input.setFriendMode,
    teacherMode: input.teacherMode,
    setTeacherMode: input.setTeacherMode,
    date: calc.date,
    setDate: calc.setDate,
    planTier,
    promptAccess: caps.promptAccess,
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
    canCopyAll,
    canCopyInfo,
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
