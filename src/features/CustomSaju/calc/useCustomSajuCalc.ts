import { useEffect, useMemo } from "react";
import type { Branch, HourRule, MatchRow, Pillars } from "../input/customSajuTypes";
import {
  applySiju,
  applyWoldu,
  hourStemFromBranch,
  isFilledAll,
  violatesSiju,
  violatesWoldu,
} from "./pillarRules";
import { monthStemOf } from "./ganjiRules";

type Args = {
  pillars: Pillars;
  setPillars: (next: Pillars | ((prev: Pillars) => Pillars)) => void;
  active: keyof Pillars | null;
  setActive: (next: keyof Pillars | null) => void;
  monthBranchChoices: Branch[] | null;
  setMonthBranchChoices: (next: Branch[] | null) => void;
  useWoldu: boolean;
  setUseWoldu: (next: boolean) => void;
  useSiju: boolean;
  setUseSiju: (next: boolean) => void;
  hourRule: HourRule;
  setHourRule: (next: HourRule) => void;
  setResults: (next: MatchRow[] | null) => void;
  setError: (next: string | null) => void;
  showToast: (msg: string) => void;
};

export function useCustomSajuCalc({
  pillars,
  setPillars,
  active,
  setActive,
  monthBranchChoices,
  setMonthBranchChoices,
  useWoldu,
  setUseWoldu,
  useSiju,
  setUseSiju,
  hourRule,
  setHourRule,
  setResults,
  setError,
  showToast,
}: Args) {
  const needStartFromYearOrDay = useWoldu || useSiju;
  const hasYear = !!(pillars.yearStem && pillars.yearBranch);
  const hasDay = !!(pillars.dayStem && pillars.dayBranch);
  const canEnterOthers = !needStartFromYearOrDay || hasYear || hasDay;

  const activeIsStem = !!active && active.endsWith("Stem");
  const activeIsBranch = !!active && active.endsWith("Branch");
  const filledAll = useMemo(() => isFilledAll(pillars), [pillars]);

  useEffect(() => {
    if (!useSiju || !pillars.dayStem || !pillars.hourBranch) return;
    if (pillars.hourBranch === "자" || pillars.hourBranch === "축") {
      const stem = hourStemFromBranch(pillars.dayStem, hourRule, pillars.hourBranch);
      if (stem) setPillars((prev) => ({ ...prev, hourStem: stem }));
    }
  }, [hourRule, useSiju, pillars.dayStem, pillars.hourBranch, setPillars]);

  const handleSelect = (value: string) => {
    if (!active) return;

    const targetIsYearOrDay =
      active === "yearStem" ||
      active === "yearBranch" ||
      active === "dayStem" ||
      active === "dayBranch";
    if (!canEnterOthers && !targetIsYearOrDay) {
      setError("월두/시두법 적용 중에는 연주 또는 일주부터 입력하세요.");
      setTimeout(() => setError(null), 1500);
      return;
    }

    let next: Pillars = { ...pillars, [active]: value } as Pillars;

    if (active === "yearStem" || active === "monthStem" || active === "monthBranch") {
      const woldu = applyWoldu(next, active, useWoldu);
      next = woldu.next;
      setMonthBranchChoices(woldu.monthBranchChoices);
    }
    if (active === "dayStem" || active === "hourStem" || active === "hourBranch") {
      next = applySiju(next, active, useSiju, hourRule);
    }

    let turnedOff = false;
    if (violatesWoldu(next, useWoldu)) {
      setUseWoldu(false);
      turnedOff = true;
    }
    if (violatesSiju(next, useSiju, hourRule)) {
      setUseSiju(false);
      turnedOff = true;
    }
    if (turnedOff) showToast("월두/시두법에 맞지 않습니다. 체크가 해제됩니다.");

    setPillars(next);
    setResults(null);

    const counter =
      active === "yearStem"
        ? "yearBranch"
        : active === "yearBranch"
          ? "yearStem"
          : active === "monthStem"
            ? "monthBranch"
            : active === "monthBranch"
              ? "monthStem"
              : active === "dayStem"
                ? "dayBranch"
                : active === "dayBranch"
                  ? "dayStem"
                  : active === "hourStem"
                    ? "hourBranch"
                    : "hourStem";
    setActive(counter);

    setTimeout(() => {
      const p = { ...next };
      if (p.yearStem && p.yearBranch && !p.monthStem) { setActive("monthStem"); return; }
      if (p.monthStem && p.monthBranch && !p.dayStem) { setActive("dayStem"); return; }
      if (p.dayStem && p.dayBranch && !p.hourStem) { setActive("hourStem"); return; }
    }, 0);
  };

  const handleMonthBranchChoice = (br: Branch) => {
    let next: Pillars = { ...pillars, monthBranch: br };
    setMonthBranchChoices(null);
    const woldu = applyWoldu(next, "monthBranch", useWoldu);
    next = woldu.next;
    setPillars(next);
    setActive("dayStem");
  };

  const clearAll = () => {
    setPillars({});
    setResults(null);
    setError(null);
    setActive(null);
    setMonthBranchChoices(null);
  };

  const onToggleWoldu = (checked: boolean) => {
    setResults(null);
    if (checked) {
      setPillars((prev) => {
        const next = { ...prev };
        if (next.yearStem && next.monthBranch) {
          next.monthStem = monthStemOf(next.yearStem, next.monthBranch);
        }
        return next;
      });
    }
    setUseWoldu(checked);
  };

  const onToggleSiju = (checked: boolean) => {
    setResults(null);
    if (checked) {
      setPillars((prev) => {
        const next = { ...prev };
        if (next.dayStem && next.hourBranch) {
          const stem = hourStemFromBranch(next.dayStem, hourRule, next.hourBranch);
          if (stem) next.hourStem = stem;
        }
        return next;
      });
    }
    setUseSiju(checked);
  };

  const onChangeHourRule = (rule: HourRule) => {
    setResults(null);
    setHourRule(rule);
    if (useSiju && pillars.dayStem && pillars.hourBranch && (pillars.hourBranch === "자" || pillars.hourBranch === "축")) {
      const stem = hourStemFromBranch(pillars.dayStem, rule, pillars.hourBranch);
      if (stem) {
        setPillars((prev) => ({ ...prev, hourStem: stem }));
      }
    }
  };

  return {
    needStartFromYearOrDay,
    canEnterOthers,
    activeIsStem,
    activeIsBranch,
    filledAll,
    monthBranchChoices,
    handleSelect,
    handleMonthBranchChoice,
    clearAll,
    onToggleWoldu,
    onToggleSiju,
    onChangeHourRule,
  };
}
