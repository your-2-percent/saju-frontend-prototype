import { useEffect, useMemo } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import type { DayBoundaryRule } from "@/shared/type";
import {
  buildChatPrompt,
  buildChatPromptJsonOnly,
  buildMultiLuckPrompt,
  buildMultiLuckPromptJsonOnly,
} from "@/features/prompt/buildPrompt";
import { computeUnifiedPower, type LuckChain } from "@/features/AnalysisReport/utils/unifiedPower";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { useHourPredictionStore } from "@/shared/lib/hooks/useHourPredictionStore";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";
import { extractMyeongSikInfoOnly } from "@/features/PromptCopyCard/infoOnly";
import {
  buildFriendInstruction,
  buildPartnerPromptFragment,
  buildToneInstruction,
} from "@/features/PromptCopyCard/promptTextUtils";
import type { PartnerOption } from "@/features/PromptCopyCard/types";
import type { PromptCopyInputState } from "@/features/PromptCopyCard/input/usePromptCopyInput";
import {
  buildDaeList,
  buildFallbackChain,
  buildFinalPrompt,
  buildNatalWithPrediction,
  buildPartnerOptions,
  computeActivePillars,
  computeFallbackPillars,
  computeManualHourStr,
  computeShinCategory,
  isValidSolarPillars,
  normalizePillarsForPrompt,
  resolveEffectiveBasis,
  applyManualHour,
} from "@/features/PromptCopyCard/calc/promptCopyCalc";

type Input = {
  ms: MyeongSik;
  natal: Pillars4;
  lunarPillars: Pillars4;
  chain?: LuckChain;
  basis?: ShinsalBasis;
  includeTenGod?: boolean;
  canUseMultiMode: boolean;
  canUseLuckTabs: boolean;
  input: PromptCopyInputState;
};

export function usePromptCopyCalc({
  ms,
  natal,
  lunarPillars,
  chain,
  basis,
  includeTenGod = false,
  canUseMultiMode,
  canUseLuckTabs,
  input,
}: Input) {
  const {
    tone,
    friendMode,
    teacherMode,
    partnerId,
    mainCategory,
    subCategory,
    relationMode,
    activeTab,
    isMultiMode,
    multiTab,
    selectedDaeIdx,
    rangeControls,
    extraQuestions,
    sections,
  } = input;

  const list = useMyeongSikStore((s) => s.list);
  const { date, setDate } = useLuckPickerStore();

  useEffect(() => {
    setDate(new Date());
  }, [ms.id, setDate]);

  const partnerMs = useMemo<MyeongSik | null>(() => {
    if (!partnerId) return null;
    return list.find((m) => m.id === partnerId) ?? null;
  }, [partnerId, list]);

  const rule: DayBoundaryRule = (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";
  const baseDate = useMemo(() => date ?? new Date(), [date]);
  const fallbackChain = useMemo(() => buildFallbackChain(chain, baseDate, rule), [chain, baseDate, rule]);

  const gatedChain = useMemo<LuckChain>(() => {
    if (canUseLuckTabs) return fallbackChain;
    return { dae: null, se: null, wol: null, il: null };
  }, [canUseLuckTabs, fallbackChain]);

  const manualHour = useHourPredictionStore((s) => s.manualHour);
  const allowManualHour =
    !ms.birthTime || ms.birthTime === "모름" || !/^\d{4}$/.test(ms.birthTime ?? "");

  const { solarKo, lunarKo } = useMemo(
    () => normalizePillarsForPrompt(natal, lunarPillars),
    [natal, lunarPillars]
  );

  const solarKoWithHour = useMemo(
    () => applyManualHour(solarKo, manualHour, allowManualHour),
    [solarKo, manualHour, allowManualHour]
  );
  const lunarKoWithHour = useMemo(
    () => applyManualHour(lunarKo, manualHour, allowManualHour),
    [lunarKo, manualHour, allowManualHour]
  );

  const computedFallback = useMemo(() => computeFallbackPillars(ms, rule), [ms, rule]);
  const solarValid = isValidSolarPillars(solarKoWithHour);
  const lunarValid = isValidSolarPillars(lunarKoWithHour);

  const effectiveBasis = resolveEffectiveBasis(solarValid, lunarValid, "solar");

  const activePillars = useMemo(
    () =>
      computeActivePillars(
        effectiveBasis,
        solarValid,
        lunarValid,
        solarKoWithHour,
        lunarKoWithHour,
        computedFallback,
        manualHour,
        allowManualHour
      ),
    [
      effectiveBasis,
      solarValid,
      lunarValid,
      solarKoWithHour,
      lunarKoWithHour,
      computedFallback,
      manualHour,
      allowManualHour,
    ]
  );

  const hourKey = useMemo(
    () => (allowManualHour && manualHour ? manualHour.stem + manualHour.branch : activePillars[3] || ""),
    [manualHour, activePillars, allowManualHour]
  );

  const manualHourStr = computeManualHourStr(manualHour, allowManualHour);
  const natalWithPrediction = useMemo(
    () => buildNatalWithPrediction(ms, manualHourStr, allowManualHour),
    [ms, manualHourStr, allowManualHour]
  );

  const tabForLogic: BlendTab = canUseLuckTabs ? activeTab : "원국";
  const isLoveTopic = mainCategory === "love" || mainCategory === "compat";
  const isCoupleMode = isLoveTopic && relationMode === "couple";
  const partnerForPrompt = isCoupleMode ? partnerMs ?? null : null;
  const relationModeForPrompt = isLoveTopic ? relationMode : undefined;

  const unified = useMemo(() => {
    return computeUnifiedPower({
      natal: natalWithPrediction,
      tab: tabForLogic,
      chain: gatedChain,
      hourKey,
    });
  }, [natalWithPrediction, tabForLogic, gatedChain, hourKey]);

  const { percent, category } = useMemo(
    () => computeShinCategory(natalWithPrediction),
    [natalWithPrediction]
  );

  const daeList = useMemo(() => buildDaeList(ms), [ms]);
  const partnerOptions = useMemo<PartnerOption[]>(
    () => buildPartnerOptions(list ?? [], ms.id),
    [list, ms.id]
  );
  const selectedDaeList = useMemo(
    () => selectedDaeIdx.map((idx) => daeList[idx]).filter((v): v is NonNullable<typeof v> => Boolean(v)),
    [selectedDaeIdx, daeList]
  );
  const seYears = useMemo(() => (multiTab === "세운" ? rangeControls.seYearsList : []), [multiTab, rangeControls.seYearsList]);
  const wolMonths = useMemo(
    () => (multiTab === "월운" ? rangeControls.wolMonthsList : []),
    [multiTab, rangeControls.wolMonthsList]
  );
  const ilDays = useMemo(() => (multiTab === "일운" ? rangeControls.ilDaysList : []), [multiTab, rangeControls.ilDaysList]);

  const normalText = useMemo(() => {
    if (!ms) return "";
    return buildChatPrompt({
      ms,
      natal: natalWithPrediction,
      chain: gatedChain,
      basis,
      includeTenGod,
      tab: tabForLogic,
      unified,
      percent,
      category,
      topic: mainCategory,
      subTopic: subCategory,
      timeMode: "single",
      relationMode,
      partnerMs: partnerForPrompt,
      teacherMode,
      sections,
    });
  }, [
    ms,
    basis,
    includeTenGod,
    tabForLogic,
    gatedChain,
    unified,
    percent,
    category,
    natalWithPrediction,
    mainCategory,
    subCategory,
    relationMode,
    partnerForPrompt,
    teacherMode,
    sections,
  ]);

  const multiText = useMemo(() => {
    if (!ms || !isMultiMode) return "";
    if (!canUseMultiMode) return "";

    return buildMultiLuckPrompt({
      ms,
      natal: natalWithPrediction,
      basis,
      includeTenGod,
      unified,
      percent,
      category,
      selectedDaeList,
      daeList,
      seYears,
      wolMonths,
      ilDays,
      topic: mainCategory,
      subTopic: subCategory,
      timeMode: "multi",
      relationMode: relationModeForPrompt,
      partnerMs: partnerForPrompt,
      teacherMode,
      friendMode,
      sections,
    });
  }, [
    ms,
    isMultiMode,
    canUseMultiMode,
    seYears,
    selectedDaeList,
    daeList,
    wolMonths,
    ilDays,
    natalWithPrediction,
    basis,
    includeTenGod,
    unified,
    percent,
    category,
    mainCategory,
    subCategory,
    relationModeForPrompt,
    partnerForPrompt,
    teacherMode,
    friendMode,
    sections,
  ]);

  const partnerPromptFragment = useMemo(
    () => buildPartnerPromptFragment(relationMode, partnerMs),
    [relationMode, partnerMs]
  );

  const baseText = isMultiMode ? multiText : normalText;
  const toneInstruction = useMemo(() => buildToneInstruction(tone), [tone]);
  const friendInstruction = useMemo(() => buildFriendInstruction(friendMode), [friendMode]);

  const basePrompt = useMemo(
    () =>
      baseText || partnerPromptFragment
        ? `${baseText}${partnerPromptFragment}\n${toneInstruction}${friendInstruction}`
        : "",
    [toneInstruction, friendInstruction, baseText, partnerPromptFragment]
  );

  const finalText = useMemo(() => buildFinalPrompt(basePrompt, extraQuestions), [basePrompt, extraQuestions]);

  const jsonOnlyText = useMemo(() => {
    if (!ms) return "";
    if (isMultiMode) {
      return buildMultiLuckPromptJsonOnly({
        ms,
        natal: natalWithPrediction,
        basis,
        includeTenGod,
        unified,
        percent,
        category,
        selectedDaeList,
        daeList,
        seYears,
        wolMonths,
        ilDays,
        topic: mainCategory,
        subTopic: subCategory,
        timeMode: "multi",
        relationMode: relationModeForPrompt,
        partnerMs: partnerForPrompt,
        teacherMode,
        friendMode,
        sections,
      });
    }

    return buildChatPromptJsonOnly({
      ms,
      natal: natalWithPrediction,
      chain: gatedChain,
      basis,
      includeTenGod,
      tab: tabForLogic,
      unified,
      percent,
      category,
      topic: mainCategory,
      subTopic: subCategory,
      timeMode: "single",
      relationMode,
      partnerMs: partnerForPrompt,
      teacherMode,
      sections,
    });
  }, [
    ms,
    isMultiMode,
    natalWithPrediction,
    basis,
    includeTenGod,
    unified,
    percent,
    category,
    selectedDaeList,
    daeList,
    seYears,
    wolMonths,
    ilDays,
    mainCategory,
    subCategory,
    relationMode,
    relationModeForPrompt,
    partnerForPrompt,
    teacherMode,
    friendMode,
    sections,
    gatedChain,
    tabForLogic,
  ]);

  const infoOnlyText = useMemo(() => {
    const jsonOnly = jsonOnlyText.trim();
    if (jsonOnly) return jsonOnly;
    const fallbackInfo = extractMyeongSikInfoOnly(baseText).trim();
    if (fallbackInfo) return fallbackInfo;
    return baseText.trim();
  }, [jsonOnlyText, baseText]);

  return {
    date,
    setDate,
    partnerMs,
    partnerOptions,
    daeList,
    tabForLogic,
    baseText,
    basePrompt,
    finalText,
    infoOnlyText,
    allowManualHour,
    activePillars,
  };
}
