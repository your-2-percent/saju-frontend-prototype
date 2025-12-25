import { X } from "lucide-react";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import type { MyeongSik } from "@/shared/lib/storage";
import { OptionsPanel } from "./ui/OptionsPanel";
import { PillarGrid } from "./ui/PillarGrid";
import { ResultsTable } from "./ui/ResultsTable";
import { ToastLayer } from "./ui/ToastLayer";
import { MonthBranchChoices } from "./ui/MonthBranchChoices";
import { SelectionPanel } from "./ui/SelectionPanel";
import { useCustomSajuInput } from "./input/useCustomSajuInput";
import { useCustomSajuCalc } from "./calc/useCustomSajuCalc";
import { useCustomSajuSave } from "./save/useCustomSajuSave";

export default function CustomSajuModal({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: MyeongSik) => void;
}) {
  const { settings: settingsObj } = useSettingsStore();
  const input = useCustomSajuInput();

  const calc = useCustomSajuCalc({
    pillars: input.pillars,
    setPillars: input.setPillars,
    active: input.active,
    setActive: input.setActive,
    monthBranchChoices: input.monthBranchChoices,
    setMonthBranchChoices: input.setMonthBranchChoices,
    useWoldu: input.useWoldu,
    setUseWoldu: input.setUseWoldu,
    useSiju: input.useSiju,
    setUseSiju: input.setUseSiju,
    hourRule: input.hourRule,
    setHourRule: input.setHourRule,
    setResults: input.setResults,
    setError: input.setError,
    showToast: input.showToast,
  });

  const save = useCustomSajuSave({
    pillars: input.pillars,
    hourRule: input.hourRule,
    results: input.results,
    selectedRow: input.selectedRow,
    gender: input.gender,
    form: input.form,
    unknownPlace: input.unknownPlace,
    setResults: input.setResults,
    setSearching: input.setSearching,
    setError: input.setError,
    setSearchToast: input.setSearchToast,
    setForm: input.setForm,
    setUnknownPlace: input.setUnknownPlace,
    showToast: input.showToast,
    onSave,
    onClose,
  });

  if (!open) return null;

  return (
    <div className="fixed min-w-[320px] inset-0 z-[1000] flex items-center justify-center bg-black/50">
      <div className="bg-white max-w-[360px] dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-5xl p-4 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 cursor-pointer"
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        <h2 className="text-lg font-semibold mb-4">간지로 명식 만들기</h2>

        <OptionsPanel
          useWoldu={input.useWoldu}
          useSiju={input.useSiju}
          hourRule={input.hourRule}
          gender={input.gender}
          onToggleWoldu={calc.onToggleWoldu}
          onToggleSiju={calc.onToggleSiju}
          onChangeHourRule={calc.onChangeHourRule}
          onChangeGender={input.setGender}
        />

        {calc.needStartFromYearOrDay && !calc.canEnterOthers && (
          <div className="mb-3 text-sm text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-900/30 rounded p-2 text-center">
            월두/시두법 적용 중입니다. <br /><b>연주</b> 또는 <b>일주</b>부터 입력하세요.
          </div>
        )}

        <PillarGrid
          pillars={input.pillars}
          active={input.active}
          canEnterOthers={calc.canEnterOthers}
          onActivate={input.setActive}
        />

        <MonthBranchChoices
          choices={input.monthBranchChoices}
          onChoose={calc.handleMonthBranchChoice}
        />

        <div className="flex w-full flex-wrap gap-6 mb-4">
          <SelectionPanel
            active={input.active}
            pillars={input.pillars}
            activeIsStem={calc.activeIsStem}
            activeIsBranch={calc.activeIsBranch}
            onSelect={calc.handleSelect}
            settingsObj={settingsObj}
          />
        </div>

        <div className="flex justify-between items-center gap-3 mb-4">
          <span>
            <button
              type="button"
              onClick={() => {
                if (!calc.filledAll) {
                  input.setShowToast(true);
                  return;
                }
                save.doSearch();
              }}
              disabled={input.searching}
              className="px-2 py-1 rounded-md bg-blue-600 text-white disabled:opacity-50 cursor-pointer"
            >
              {input.searching ? "검색중.." : "검색"}
            </button>
          </span>
          <span className="flex items-center gap-2">
            <button
              type="button"
              onClick={calc.clearAll}
              className="px-2 py-1 rounded-md bg-red-600 border border-neutral-300 dark:border-neutral-700 cursor-pointer"
            >
              초기화
            </button>
            <button
              type="button"
              onClick={save.handleSave}
              className="px-2 py-1 rounded-md border bg-yellow-600 border-neutral-300 dark:border-neutral-700 cursor-pointer"
            >
              저장
            </button>
          </span>
        </div>

        <div className="max-h-[40vh] overflow-auto rounded border border-neutral-200 dark:border-neutral-800">
          <ResultsTable
            results={input.results}
            selectedRow={input.selectedRow}
            onSelectRow={input.setSelectedRow}
            gender={input.gender}
          />
        </div>

        <ToastLayer
          toast={input.toast}
          showToast4={input.showToast4}
          searchToast={input.searchToast}
          error={input.error}
        />
      </div>
    </div>
  );
}
