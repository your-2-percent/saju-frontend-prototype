import { useEffect, useState } from "react";
import type { BlendTab } from "@/analysisReport/calc/logic/blend";
import type { MainCategoryKey, SubCategoryKey, RelationMode } from "@/features/prompt/buildPrompt";
import { usePromptCopySectionsStore } from "@/promptCopy/input/promptCopySectionsStore";
import { useMultiRangeControls } from "@/promptCopy/input/useMultiRangeControls";
import type { MultiTab, ToneKey } from "@/promptCopy/calc/types";

type Args = {
  msId: string;
  canUseMultiMode: boolean;
  canUseLuckTabs: boolean;
};

export function usePromptCopyInput({ msId, canUseMultiMode, canUseLuckTabs }: Args) {
  const sections = usePromptCopySectionsStore((s) => s.sections);
  const toggleSection = usePromptCopySectionsStore((s) => s.toggleSection);

  const [tone, setTone] = useState<ToneKey>("analysis");
  const [friendMode, setFriendMode] = useState(false);
  const [teacherMode, setTeacherMode] = useState(false);

  const [partnerId, setPartnerId] = useState<string>("");
  const [mainCategory, setMainCategory] = useState<MainCategoryKey>("personality");
  const [subCategory, setSubCategory] = useState<SubCategoryKey>("overview");
  const [relationMode, setRelationMode] = useState<RelationMode>("solo");

  const [activeTab, setActiveTab] = useState<BlendTab>("원국");
  const [isMultiMode, setIsMultiMode] = useState(false);
  const [multiTab, setMultiTab] = useState<MultiTab>("대운");
  const [selectedDaeIdx, setSelectedDaeIdx] = useState<number[]>([]);

  const [questionDraft, setQuestionDraft] = useState("");
  const [extraQuestions, setExtraQuestions] = useState<string[]>([]);

  const rangeControls = useMultiRangeControls();

  useEffect(() => {
    if (mainCategory !== "love" && mainCategory !== "compat") {
      setRelationMode("solo");
      setPartnerId("");
    }
  }, [mainCategory]);

  useEffect(() => {
    if (!canUseMultiMode && isMultiMode) {
      setIsMultiMode(false);
    }
  }, [canUseMultiMode, isMultiMode]);

  useEffect(() => {
    if (!canUseLuckTabs && activeTab !== "원국") {
      setActiveTab("원국");
    }
  }, [canUseLuckTabs, activeTab]);

  useEffect(() => {
    if (multiTab !== "대운") {
      setSelectedDaeIdx([]);
    }
  }, [multiTab]);

  useEffect(() => {
    setQuestionDraft("");
    setExtraQuestions([]);
  }, [msId]);

  function handleAddQuestion() {
    const q = questionDraft.trim();
    if (!q) return;
    setExtraQuestions((prev) => [...prev, q]);
    setQuestionDraft("");
  }

  function handleRemoveQuestion(idx: number) {
    setExtraQuestions((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleClearQuestions() {
    setExtraQuestions([]);
  }

  function handleToggleDae(idx: number) {
    setSelectedDaeIdx((prev) => (prev.includes(idx) ? prev.filter((v) => v !== idx) : [...prev, idx]));
  }

  return {
    sections,
    toggleSection,
    tone,
    setTone,
    friendMode,
    setFriendMode,
    teacherMode,
    setTeacherMode,
    partnerId,
    setPartnerId,
    mainCategory,
    setMainCategory,
    subCategory,
    setSubCategory,
    relationMode,
    setRelationMode,
    activeTab,
    setActiveTab,
    isMultiMode,
    setIsMultiMode,
    multiTab,
    setMultiTab,
    selectedDaeIdx,
    setSelectedDaeIdx,
    handleToggleDae,
    rangeControls,
    questionDraft,
    setQuestionDraft,
    extraQuestions,
    setExtraQuestions,
    handleAddQuestion,
    handleRemoveQuestion,
    handleClearQuestions,
  };
}

export type PromptCopyInputState = ReturnType<typeof usePromptCopyInput>;
