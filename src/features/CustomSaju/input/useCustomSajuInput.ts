import { useEffect, useState } from "react";
import type { Branch, FormState, HourRule, MatchRow, Pillars } from "./customSajuTypes";

export function useCustomSajuInput() {
  const [pillars, setPillars] = useState<Pillars>({});
  const [active, setActive] = useState<keyof Pillars | null>(null);
  const [monthBranchChoices, setMonthBranchChoices] = useState<Branch[] | null>(null);

  const [useWoldu, setUseWoldu] = useState(true);
  const [useSiju, setUseSiju] = useState(true);
  const [hourRule, setHourRule] = useState<HourRule>("자시");
  const [gender, setGender] = useState<"male" | "female">("male");

  const [results, setResults] = useState<MatchRow[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({
    gender: "남자",
    mingSikType: "조자시/야자시",
    DayChangeRule: "자시일수론",
    calendarType: "solar",
  });
  const [unknownPlace, setUnknownPlace] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [showToast4, setShowToast] = useState(false);
  const [searchToast, setSearchToast] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1800);
  };

  useEffect(() => {
    if (!showToast4) return;
    const timer = setTimeout(() => setShowToast(false), 2000);
    return () => clearTimeout(timer);
  }, [showToast4]);

  useEffect(() => {
    if (!searchToast) return;
    const timer = setTimeout(() => setSearchToast(false), 2000);
    return () => clearTimeout(timer);
  }, [searchToast]);

  return {
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
    gender,
    setGender,
    results,
    setResults,
    searching,
    setSearching,
    selectedRow,
    setSelectedRow,
    form,
    setForm,
    unknownPlace,
    setUnknownPlace,
    error,
    setError,
    toast,
    showToast4,
    setShowToast,
    searchToast,
    setSearchToast,
    showToast,
  };
}
