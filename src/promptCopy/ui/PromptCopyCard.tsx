import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import type { LuckChain } from "@/analysisReport/calc/utils/unifiedPower";
import type { ShinsalBasis } from "@/analysisReport/calc/logic/shinsal";
import PromptCopyHeader from "@/promptCopy/ui/PromptCopyHeader";
import PromptSectionsToggle from "@/promptCopy/ui/PromptSectionsToggle";
import CategorySelectors from "@/promptCopy/ui/CategorySelectors";
import RelationSelectors from "@/promptCopy/ui/RelationSelectors";
import ModeSwitch from "@/promptCopy/ui/ModeSwitch";
import SingleModeControls from "@/promptCopy/ui/SingleModeControls";
import MultiModeControls from "@/promptCopy/ui/MultiModeControls";
import PromptOutput from "@/promptCopy/ui/PromptOutput";
import { TABS, MAIN_CATEGORY_META, CATEGORY_SUBS } from "@/promptCopy/calc/meta";
import { usePromptCopyModel } from "@/promptCopy/input/usePromptCopyModel";

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

  const currentSubList = CATEGORY_SUBS[model.mainCategory as keyof typeof CATEGORY_SUBS];

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
  const geminiUrl = "https://gemini.google.com/app";
  const chatGptUrl = "https://chatgpt.com/";

  const handleCopyAndMove = async (url: string) => {
    await model.onCopyAll();

    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-3 space-y-2 desk:space-y-3">
      {/* ✅ 잠금 오버레이 */}
      {isPromptLocked ? (
        <div className="absolute inset-0 z-10 rounded-xl bg-white/70 dark:bg-neutral-900/70 backdrop-blur-[1px] flex items-center justify-center p-4">
          <div className="max-w-sm text-center border border-neutral-300 dark:border-neutral-700 rounded-xl bg-white dark:bg-neutral-900 px-4 py-3 shadow-sm">
            <div className="text-lg font-semibold">🔒 프리미엄 기능</div>
            <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
              프리 플랜에서는 프롬프트 복사/사용이 막혀 있어요.
              <br />
              🔒 웹 접속시간 누적 100시간을 달성하면 사용 가능합니다! (로그인 시에만 카운트)
            </div>
          </div>
        </div>
      ) : null}

      <PromptCopyHeader />

      <PromptSectionsToggle sections={model.sections} toggleSection={model.toggleSection} />

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

      <PromptOutput value={model.finalText} lockSelection={isPromptLocked} />

      <div className="flex justify-end">
        <div className="flex flex-col desk:flex-row gap-2 w-full desk:w-auto">
          <button
            type="button"
            onClick={model.onCopyInfoOnly}
            disabled={!canCopyInfo}
            title={!canCopyInfo ? lockTitle : undefined}
            className={[
              "w-full desk:w-auto px-3 py-1 rounded-md text-xs whitespace-nowrap border",
              canCopyInfo ? "cursor-pointer" : "cursor-not-allowed opacity-50",
              model.copiedInfo
                ? "bg-green-600 text-white border-green-600"
                : canCopyInfo
                ? "bg-orange-600 text-white dark:bg-orange-600"
                : "bg-orange-600/70 text-white border-orange-600/50",
            ].join(" ")}
          >
            {model.copiedInfo ? "복사됨" : `명식정보만복사${!canCopyInfo ? " 🔒" : ""}`}
          </button>

          <button
            type="button"
            onClick={model.onCopyAll}
            disabled={!canCopyAll}
            title={!canCopyAll ? lockTitle : undefined}
            className={[
              "w-full desk:w-auto px-3 py-1 rounded-md text-xs whitespace-nowrap",
              canCopyAll ? "cursor-pointer" : "cursor-not-allowed opacity-50",
              model.copiedAll
                ? "bg-green-600 text-white"
                : "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black",
            ].join(" ")}
          >
            {model.copiedAll ? "복사됨" : `복사만하기${!canCopyAll ? " 🔒" : ""}`}
          </button>

          <button
            type="button"
            onClick={() => void handleCopyAndMove(geminiUrl)}
            disabled={!canCopyAll}
            title={!canCopyAll ? lockTitle : undefined}
            className={[
              "w-full desk:w-auto px-3 py-1 rounded-md text-xs whitespace-nowrap",
              canCopyAll
                ? "cursor-pointer bg-blue-600 text-white dark:bg-blue-500"
                : "cursor-not-allowed opacity-50 bg-blue-600 text-white dark:bg-blue-500",
            ].join(" ")}
          >
            {`복사 및 제미나이로 이동${!canCopyAll ? " 🔒" : ""}`}
          </button>

          <button
            type="button"
            onClick={() => void handleCopyAndMove(chatGptUrl)}
            disabled={!canCopyAll}
            title={!canCopyAll ? lockTitle : undefined}
            className={[
              "w-full desk:w-auto px-3 py-1 rounded-md text-xs whitespace-nowrap",
              canCopyAll
                ? "cursor-pointer bg-emerald-600 text-white dark:bg-emerald-500"
                : "cursor-not-allowed opacity-50 bg-emerald-600 text-white dark:bg-emerald-500",
            ].join(" ")}
          >
            {`복사 및 챗지피티로 이동${!canCopyAll ? " 🔒" : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
