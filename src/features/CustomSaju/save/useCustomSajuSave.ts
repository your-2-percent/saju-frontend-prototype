import { flushSync } from "react-dom";
import type { DayBoundaryRule } from "@/shared/type";
import type { MyeongSik } from "@/shared/lib/storage";
import { buildCustomSajuPayload } from "./buildPayload";
import { addMyeongSik } from "../storage/myeongSikRepo";
import { findMatchingDates } from "../calc/searchMatches";
import type { FormState, HourRule, MatchRow, Pillars } from "../input/customSajuTypes";
import { isFilledAll } from "../calc/pillarRules";

type Args = {
  pillars: Pillars;
  hourRule: HourRule;
  results: MatchRow[] | null;
  selectedRow: number | null;
  gender: "male" | "female";
  form: FormState;
  unknownPlace: boolean;
  setResults: (next: MatchRow[] | null) => void;
  setSearching: (next: boolean) => void;
  setError: (next: string | null) => void;
  setSearchToast: (next: boolean) => void;
  setForm: (next: FormState) => void;
  setUnknownPlace: (next: boolean) => void;
  showToast: (msg: string) => void;
  onSave: (data: MyeongSik) => void;
  onClose: () => void;
};

export function useCustomSajuSave({
  pillars,
  hourRule,
  results,
  selectedRow,
  gender,
  form,
  unknownPlace,
  setResults,
  setSearching,
  setError,
  setSearchToast,
  setForm,
  setUnknownPlace,
  showToast,
  onSave,
  onClose,
}: Args) {
  const doSearch = () => {
    setResults(null);
    setError(null);
    if (!isFilledAll(pillars)) {
      setError("연·월·일·시 4간지를 모두 선택하세요.");
      return;
    }

    setSearching(true);
    try {
      const rule: DayBoundaryRule = hourRule === "자시" ? "조자시/야자시" : "인시";
      const out = findMatchingDates(pillars, hourRule, rule);
      if (out.length === 0) setError("일치하는 날짜가 없습니다. (범위: 1900~2100)");
      setResults(out);
    } catch (e) {
      if (e instanceof Error) setError(e.message);
      else setError(String(e));
    } finally {
      setSearching(false);
    }
  };

  const handleSave = () => {
    const built = buildCustomSajuPayload({
      selectedRow,
      results,
      gender,
      hourRule,
      form,
      unknownPlace,
    });
    if ("error" in built) {
      setSearchToast(true);
      return;
    }

    flushSync(() => {
      addMyeongSik(built.payload);
    });

    onSave(built.payload);
    showToast("저장 완료!");
    setForm({
      gender: "남자",
      mingSikType: "조자시/야자시",
      DayChangeRule: "자시일수론",
      calendarType: "solar",
    });
    setUnknownPlace(false);
    onClose();
  };

  return {
    doSearch,
    handleSave,
  };
}
