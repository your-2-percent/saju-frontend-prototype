import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import type { LuckChain } from "@/features/AnalysisReport/utils/unifiedPower";
import type { ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import PromptCopyHeader from "@/features/PromptCopyCard/ui/PromptCopyHeader";
import PromptSectionsToggle from "@/features/PromptCopyCard/ui/PromptSectionsToggle";
import TonePicker from "@/features/PromptCopyCard/ui/TonePicker";
import CategorySelectors from "@/features/PromptCopyCard/ui/CategorySelectors";
import RelationSelectors from "@/features/PromptCopyCard/ui/RelationSelectors";
import ModeSwitch from "@/features/PromptCopyCard/ui/ModeSwitch";
import SingleModeControls from "@/features/PromptCopyCard/ui/SingleModeControls";
import MultiModeControls from "@/features/PromptCopyCard/ui/MultiModeControls";
import ExtraQuestionsEditor from "@/features/PromptCopyCard/ui/ExtraQuestionsEditor";
import PromptOutput from "@/features/PromptCopyCard/ui/PromptOutput";
import { TONE_META, TABS, MAIN_CATEGORY_META, CATEGORY_SUBS } from "@/features/PromptCopyCard/meta";
import { usePromptCopyModel } from "@/features/PromptCopyCard/input/usePromptCopyModel";

type Props = {
  ms: MyeongSik;
  natal: Pillars4;
  lunarPillars: Pillars4;
  chain?: LuckChain;
  basis?: ShinsalBasis;
  includeTenGod?: boolean;
};

export default function PromptCopyCard({
  ms,
  natal,
  chain,
  basis,
  lunarPillars,
  includeTenGod = false,
}: Props) {
  const model = usePromptCopyModel({
    ms,
    natal,
    chain,
    basis,
    lunarPillars,
    includeTenGod,
  });

  const currentSubList = CATEGORY_SUBS[model.mainCategory];

  if (!ms) {
    return (
      <div className="p-4 border rounded bg-neutral-50 dark:bg-neutral-900 text-sm text-neutral-500">
        명식을 먼저 선택해주세요.
      </div>
    );
  }

  const isPromptLocked = model.promptAccess !== "full";
  const lockTitle = isPromptLocked ? "프리 플랜에서는 프롬프트 사용이 불가합니다. 🔒" : undefined;

  const canCopyInfo = !isPromptLocked && model.canCopyInfo;
  const canCopyAll = !isPromptLocked && model.canCopyAll;

  return (
    <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 space-y-3">
      {/* ✅ 잠금 오버레이 */}
      {isPromptLocked ? (
        <div className="absolute inset-0 z-10 rounded-xl bg-white/70 dark:bg-neutral-900/70 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="max-w-sm text-center border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm">
            <div className="text-lg font-semibold">🔒 프리미엄 기능</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
              프리 플랜에서는 프롬프트 복사/사용이 막혀 있어요.
              <br />
              베이직/프로에서 사용 가능.
            </div>
          </div>
        </div>
      ) : null}

      <PromptCopyHeader
        copiedInfo={model.copiedInfo}
        copiedAll={model.copiedAll}
        canCopyInfo={canCopyInfo}
        canCopyAll={canCopyAll}
        lockTitle={lockTitle}
        onCopyInfoOnly={model.onCopyInfoOnly}
        onCopyAll={model.onCopyAll}
      />

      <PromptSectionsToggle sections={model.sections} toggleSection={model.toggleSection} />

      <TonePicker
        tone={model.tone}
        toneMeta={TONE_META}
        setTone={model.setTone}
        friendMode={model.friendMode}
        setFriendMode={(e) => model.setFriendMode(e.target.checked)}
        teacherMode={model.teacherMode}
        setTeacherMode={(e) => model.setTeacherMode(e.target.checked)}
      />

      <CategorySelectors
        mainCategory={model.mainCategory}
        subCategory={model.subCategory}
        mainCategoryMeta={MAIN_CATEGORY_META}
        currentSubList={currentSubList}
        onMainCategoryChange={(next) => model.handleMainCategoryChange(next, CATEGORY_SUBS[next])}
        onSubCategoryChange={model.setSubCategory}
      />

      <RelationSelectors
        visible={model.mainCategory === "love" || model.mainCategory === "compat"}
        relationMode={model.relationMode}
        setRelationMode={model.setRelationMode}
        partnerId={model.partnerId}
        setPartnerId={model.setPartnerId}
        partnerOptions={model.partnerOptions}
      />

      <ModeSwitch
        isMultiMode={model.canUseMultiMode ? model.isMultiMode : false}
        setIsMultiMode={(next) => {
          if (!model.canUseMultiMode && next) return;
          model.setIsMultiMode(next);
        }}
        canUseMultiMode={model.canUseMultiMode}
      />

      {!model.isMultiMode ? (
        <SingleModeControls
          tabs={TABS}
          activeTab={model.tabForLogic}
          setActiveTab={(t) => {
            if (!model.canUseLuckTabs && t !== "원국") return;
            model.setActiveTab(t);
          }}
          date={model.date}
          setDate={model.setDate}
          canUseLuckTabs={model.canUseLuckTabs}
        />
      ) : (
        <MultiModeControls
          multiTab={model.multiTab}
          setMultiTab={model.setMultiTab}
          daeList={model.daeList.map((d) => ({
            gz: d.gz,
            age: d.age,
            startYear: d.startYear,
            endYear: d.endYear,
          }))}
          selectedDaeIdx={model.selectedDaeIdx}
          onToggleDae={model.handleToggleDae}
          seStartYear={model.rangeControls.seStartYear}
          seEndYear={model.rangeControls.seEndYear}
          onSeStartChange={model.rangeControls.onSeStartChange}
          onSeEndChange={model.rangeControls.onSeEndChange}
          onSeStartBlur={model.rangeControls.onSeStartBlur}
          onSeEndBlur={model.rangeControls.onSeEndBlur}
          seYearsCount={model.rangeControls.seYearsCount}
          wolStartDate={model.rangeControls.wolStartYM}
          wolEndDate={model.rangeControls.wolEndYM}
          onWolStartChange={model.rangeControls.onWolStartChange}
          onWolEndChange={model.rangeControls.onWolEndChange}
          onWolStartBlur={model.rangeControls.onWolStartBlur}
          onWolEndBlur={model.rangeControls.onWolEndBlur}
          wolMonthsCount={model.rangeControls.wolMonthsCount}
          ilStartDate={model.rangeControls.ilStartDate}
          ilEndDate={model.rangeControls.ilEndDate}
          onIlStartChange={model.rangeControls.onIlStartChange}
          onIlEndChange={model.rangeControls.onIlEndChange}
          onIlStartBlur={model.rangeControls.onIlStartBlur}
          onIlEndBlur={model.rangeControls.onIlEndBlur}
          ilDaysCount={model.rangeControls.ilDaysCount}
        />
      )}

      <ExtraQuestionsEditor
        questionDraft={model.questionDraft}
        onChangeDraft={(e) => model.setQuestionDraft(e.target.value)}
        onAddQuestion={model.handleAddQuestion}
        extraQuestions={model.extraQuestions}
        onClearAll={model.handleClearQuestions}
        onRemoveQuestion={model.handleRemoveQuestion}
        locked={isPromptLocked}
        lockTitle={lockTitle}
      />

      <PromptOutput value={model.finalText} lockSelection={isPromptLocked} />
    </div>
  );
}
