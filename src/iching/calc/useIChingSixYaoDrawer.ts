import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from "react";
import {
  buildPeriodPayload,
  deriveBaseDateForTab,
  type DateRangeYMD,
  type PeriodTab,
} from "@/iching/calc/period";
import { addDays, formatYMD, parseYMDStrict } from "@/iching/calc/ganzhi";
import {
  buildStableSajuSeedPart,
  coinTossLine,
  cycleLine,
  fnv1a32,
  getChangingIndexes,
  makeId,
  mulberry32,
  safeNowISO,
  toChangedYinYang,
  toYinYang,
} from "@/iching/calc/ichingDrawerUtils";
import { deriveHexMetaFromLines, deriveSixYaoAutoSideFromLines } from "@/iching/ui/SixYaoResultCard";
import { buildPeriodCardsFromPayload } from "@/iching/calc/buildPeriodCards";
import { buildIChingPrompt } from "@/iching/calc/ichingPrompt";
import type { PeriodCard } from "@/iching/calc/drawerTypes";
import type { DivinationRecord, LineDraw, LineValue, SajuContext } from "@/iching/calc/ichingTypes";
import { ICHING_CARDS } from "@/iching/data/ichingCards";

type DrawMode = "all" | "step";

type UseIChingSixYaoDrawerArgs = {
  saju?: SajuContext | null;
  viewMeta?: Record<string, unknown>;
  initialQuestion?: string;
  onBaseDateChange?: (date: Date | null) => void;
};

export function useIChingSixYaoDrawer({
  saju,
  viewMeta,
  initialQuestion = "",
  onBaseDateChange,
}: UseIChingSixYaoDrawerArgs) {
  const [question, setQuestion] = useState<string>(initialQuestion);
  const [finalQuestion, setFinalQuestion] = useState<string>("");
  const [drawMode, setDrawMode] = useState<DrawMode>("all");

  const [periodTab, setPeriodTab] = useState<PeriodTab>("seun");
  const [seunRange, setSeunRange] = useState<DateRangeYMD>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1, 9, 0, 0, 0);
    const end = new Date(now.getFullYear() + 9, 11, 31, 9, 0, 0, 0);
    return { startYMD: formatYMD(start), endYMD: formatYMD(end) };
  });
  const [wolunRange, setWolunRange] = useState<DateRangeYMD>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 9, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + 11);
    return { startYMD: formatYMD(start), endYMD: formatYMD(end) };
  });
  const [ilunRange, setIlunRange] = useState<DateRangeYMD>(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
    const end = addDays(start, 6);
    return { startYMD: formatYMD(start), endYMD: formatYMD(end) };
  });

  const [lines, setLines] = useState<LineDraw[]>([]);
  const [record, setRecord] = useState<DivinationRecord | null>(null);
  const [periodCards, setPeriodCards] = useState<PeriodCard[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isPeriodDrawing, setIsPeriodDrawing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement | null>(null);
  const periodCardsRef = useRef<HTMLDivElement | null>(null);
  const questionInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setQuestion(initialQuestion);
    setFinalQuestion(initialQuestion);
  }, [initialQuestion]);

  useEffect(() => {
    setPeriodCards([]);
  }, [
    periodTab,
    seunRange.startYMD,
    seunRange.endYMD,
    wolunRange.startYMD,
    wolunRange.endYMD,
    ilunRange.startYMD,
    ilunRange.endYMD,
  ]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const seunRangeEffective = useMemo<DateRangeYMD>(() => {
    const s = parseYMDStrict(seunRange.startYMD);
    if (s && s.getMonth() === 0) {
      const shifted = new Date(s.getFullYear(), 1, 1, 9, 0, 0, 0);
      return { ...seunRange, startYMD: formatYMD(shifted) };
    }
    return seunRange;
  }, [seunRange]);

  const activeTab: PeriodTab = periodTab;
  const baseDate = useMemo(() => {
    if (!activeTab) return new Date();
    const range = activeTab === "seun" ? seunRangeEffective : activeTab === "wolun" ? wolunRange : ilunRange;
    return deriveBaseDateForTab(activeTab, range);
  }, [activeTab, ilunRange, seunRangeEffective, wolunRange]);

  useEffect(() => {
    if (!onBaseDateChange) return;
    onBaseDateChange(baseDate ?? null);
  }, [baseDate, onBaseDateChange]);

  const sajuSeedPart = useMemo(() => buildStableSajuSeedPart(saju), [saju]);

  const baseSeedText = useMemo(() => {
    const q = finalQuestion.trim();
    return `${q}::${baseDate.toISOString()}`;
  }, [baseDate, finalQuestion]);

  const effectiveSeedText = useMemo(() => {
    return sajuSeedPart ? `${baseSeedText}::SAJU::${sajuSeedPart}` : baseSeedText;
  }, [baseSeedText, sajuSeedPart]);

  const rng = useMemo(() => {
    const seed = fnv1a32(effectiveSeedText);
    return mulberry32(seed);
  }, [effectiveSeedText]);

  const seunPayload = useMemo(
    () => (periodTab === "seun" ? buildPeriodPayload("seun", seunRangeEffective) : null),
    [periodTab, seunRangeEffective]
  );
  const wolunPayload = useMemo(
    () => (periodTab === "wolun" ? buildPeriodPayload("wolun", wolunRange) : null),
    [periodTab, wolunRange]
  );
  const ilunPayload = useMemo(
    () => (periodTab === "ilun" ? buildPeriodPayload("ilun", ilunRange) : null),
    [periodTab, ilunRange]
  );

  const seunStartYear = useMemo(() => {
    const d = parseYMDStrict(seunRange.startYMD);
    return d ? String(d.getFullYear()) : "";
  }, [seunRange.startYMD]);

  const seunEndYear = useMemo(() => {
    const d = parseYMDStrict(seunRange.endYMD);
    return d ? String(d.getFullYear()) : "";
  }, [seunRange.endYMD]);

  const wolunStartYM = useMemo(() => {
    const d = parseYMDStrict(wolunRange.startYMD);
    if (!d) return "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }, [wolunRange.startYMD]);

  const wolunEndYM = useMemo(() => {
    const d = parseYMDStrict(wolunRange.endYMD);
    if (!d) return "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${d.getFullYear()}-${mm}`;
  }, [wolunRange.endYMD]);

  const activePeriodLabel = useMemo(() => {
    if (periodTab === "seun") {
      const pick = seunPayload?.seun[0];
      if (!pick) return "";
      return `세운 ${pick.year} - ${pick.seun}`;
    }
    if (periodTab === "wolun") {
      const pick = wolunPayload?.wolun[0];
      if (!pick) return "";
      const mm = String(pick.month).padStart(2, "0");
      return `월운 ${pick.year}-${mm} - ${pick.seun} ${pick.wolun}`;
    }
    if (periodTab === "ilun") {
      const pick = ilunPayload?.ilun[0];
      if (!pick) return "";
      return `일운 ${pick.dateYMD} - ${pick.seun} ${pick.wolun} ${pick.ilun}`;
    }
    return "";
  }, [periodTab, seunPayload, wolunPayload, ilunPayload]);

  const onRangeChange = useCallback(
    (
      setter: Dispatch<SetStateAction<DateRangeYMD>>,
      key: "startYMD" | "endYMD",
      value: string
    ) => {
      setter((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const onSeunYearChange = useCallback((key: "startYMD" | "endYMD", value: string) => {
    if (!value) return;
    const year = Number(value);
    if (!Number.isFinite(year)) return;
    const normalized = Math.trunc(year);
    setSeunRange((prev) => ({ ...prev, [key]: `${normalized}-06-15` }));
  }, []);

  const onWolunMonthChange = useCallback((key: "startYMD" | "endYMD", value: string) => {
    if (!value) return;
    const match = /^(\d{4})-(\d{2})$/.exec(value);
    if (!match) return;
    setWolunRange((prev) => ({ ...prev, [key]: `${match[1]}-${match[2]}-15` }));
  }, []);

  const ready = lines.length === 6;

  const baseBits = useMemo(() => lines.map((l) => toYinYang(l.value)), [lines]);
  const changedBits = useMemo(() => lines.map((l) => toChangedYinYang(l.value)), [lines]);
  const changingIndexes = useMemo(() => getChangingIndexes(lines), [lines]);
  const lineValues = useMemo(() => lines.map((l) => l.value), [lines]);
  const hasSingleProgress = lines.length > 0 || Boolean(record);
  const hasPeriodProgress = periodCards.length > 0;
  const hasConfirmedQuestion = finalQuestion.trim().length > 0;
  const disableSingleDraw = !hasConfirmedQuestion || isPeriodDrawing || hasPeriodProgress || ready;
  const disablePeriodDraw = !hasConfirmedQuestion || isDrawing || hasSingleProgress || hasPeriodProgress || isPeriodDrawing;

  const scrollToResults = useCallback(() => {
    window.setTimeout(() => {
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const scrollToPeriodCards = useCallback(() => {
    window.setTimeout(() => {
      periodCardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);

  const reset = useCallback(() => {
    setLines([]);
    setRecord(null);
    setPeriodCards([]);
    setIsDrawing(false);
    setIsPeriodDrawing(false);
    setToast(null);
  }, []);

  const ensureQuestion = useCallback(() => {
    const q = finalQuestion.trim();
    if (!q) {
      alert("질문을 확정해 주세요!");
      window.setTimeout(() => {
        questionInputRef.current?.focus();
      }, 0);
      return false;
    }
    return true;
  }, [finalQuestion]);

  const drawOne = useCallback(() => {
    if (!ensureQuestion()) return;
    if (disableSingleDraw) return;
    setIsDrawing(true);
    let nextLen = 0;
    setLines((prev) => {
      if (prev.length >= 6) return prev;
      nextLen = prev.length + 1;
      return [...prev, coinTossLine(rng)];
    });
    window.setTimeout(() => {
      setIsDrawing(false);
      if (nextLen >= 6) {
        scrollToResults();
        return;
      }
      if (nextLen > 0) {
        setToast(`${nextLen}번째 효를 뽑았어요! 이제 ${nextLen + 1}번째를 뽑아볼까요?`);
      }
    }, 350);
  }, [ensureQuestion, disableSingleDraw, rng, scrollToResults]);

  const drawAll = useCallback(() => {
    if (!ensureQuestion()) return;
    if (disableSingleDraw) return;
    setIsDrawing(true);
    const next: LineDraw[] = [];
    for (let i = 0; i < 6; i += 1) next.push(coinTossLine(rng));
    setLines(next);
    window.setTimeout(() => {
      setIsDrawing(false);
      scrollToResults();
    }, 350);
  }, [ensureQuestion, disableSingleDraw, rng, scrollToResults]);

  const selectedCardText = useMemo(() => {
    if (lines.length !== 6) return "";
    const meta = deriveHexMetaFromLines(lines);
    if (typeof meta.number !== "number") return "";
    const idx = meta.number - 1;
    if (idx < 0 || idx >= ICHING_CARDS.length) return "";
    return ICHING_CARDS[idx] ?? "";
  }, [lines]);

  const onEditLine = useCallback((indexBottomUp: number) => {
    setLines((prev) => {
      if (indexBottomUp < 0 || indexBottomUp >= prev.length) return prev;
      const next = [...prev];
      const cur = next[indexBottomUp];
      next[indexBottomUp] = { value: cycleLine(cur.value), source: "manual" };
      return next;
    });
  }, []);

  const finalizeRecord = useCallback(() => {
    if (lines.length !== 6) return;

    const q = (finalQuestion.trim() || question.trim()).trim();

    const next: DivinationRecord = {
      id: makeId(),
      kind: "iching_sixyao",
      createdAtISO: safeNowISO(),
      question: q,
      seedTextUsed: effectiveSeedText,
      linesBottomUp: lines,
      changingLines: changingIndexes,
      baseBitsBottomUp: baseBits,
      changedBitsBottomUp: changedBits,
      saju: saju ?? undefined,
      viewMeta,
    };
    setRecord(next);
  }, [baseBits, changedBits, changingIndexes, effectiveSeedText, finalQuestion, lines, question, saju, viewMeta]);

  useEffect(() => {
    if (lines.length === 6) finalizeRecord();
  }, [finalizeRecord, lines.length]);

  const placeholderLines = useMemo(
    () =>
      ([{ value: 7, source: "manual" }] as LineDraw[]).concat(
        Array.from({ length: 5 }, () => ({ value: 7 as LineValue, source: "manual" as const }))
      ),
    []
  );

  const buildPeriodCards = useCallback(() => {
    if (!ensureQuestion()) return;
    if (disablePeriodDraw) return;
    setIsPeriodDrawing(true);
    const q = (finalQuestion.trim() || question.trim()).trim();
    const nextCards = buildPeriodCardsFromPayload({
      periodTab,
      seunPayload,
      wolunPayload,
      ilunPayload,
      questionText: q,
      sajuSeedPart,
      saju,
      viewMeta,
    });
    setPeriodCards(nextCards);
    window.setTimeout(() => {
      setIsPeriodDrawing(false);
      scrollToPeriodCards();
    }, 400);
  }, [
    ensureQuestion,
    disablePeriodDraw,
    finalQuestion,
    ilunPayload,
    periodTab,
    question,
    saju,
    sajuSeedPart,
    seunPayload,
    viewMeta,
    wolunPayload,
    scrollToPeriodCards
  ]);

  const promptText = useMemo(
    () =>
      buildIChingPrompt({
        selectedCardText,
        ready,
        periodCards,
        finalQuestion,
        question,
        baseBits,
        changedBits,
        changingIndexes,
        lineValues,
        lines,
        saju,
        baseDate,
        seunPayload,
        wolunPayload,
        ilunPayload,
        periodTab,
      }),
    [
      selectedCardText,
      ready,
      periodCards,
      finalQuestion,
      question,
      baseBits,
      changedBits,
      changingIndexes,
      lineValues,
      lines,
      saju,
      baseDate,
      seunPayload,
      wolunPayload,
      ilunPayload,
      periodTab,
    ]
  );

  const copyPrompt = useCallback(async () => {
    if (!promptText) return;
    try {
      await navigator.clipboard.writeText(promptText);
      alert("프롬프트 복사 완료!");
    } catch {
      alert("클립보드 복사 실패. 브라우저 권한을 확인해주세요.");
    }
  }, [promptText]);

  const autoSideSummary = useMemo(() => {
    if (!ready) return null;
    const auto = deriveSixYaoAutoSideFromLines(lines);
    const liuQin = auto.leftTopDown.join(" ");
    const zhi = auto.rightTopDown.join(" ");
    const marks = auto.markers.map((m) => `${m.text}${m.atLineTopDown}효`).join(", ");
    return { liuQin, zhi, marks };
  }, [lines, ready]);

  return {
    saju,
    question,
    setQuestion,
    finalQuestion,
    setFinalQuestion,
    questionInputRef,
    drawMode,
    setDrawMode,
    periodTab,
    setPeriodTab,
    seunRange,
    setSeunRange,
    wolunRange,
    setWolunRange,
    ilunRange,
    setIlunRange,
    seunStartYear,
    seunEndYear,
    wolunStartYM,
    wolunEndYM,
    activePeriodLabel,
    onRangeChange,
    onSeunYearChange,
    onWolunMonthChange,
    ready,
    baseBits,
    changedBits,
    changingIndexes,
    lineValues,
    autoSideSummary,
    selectedCardText,
    drawOne,
    drawAll,
    reset,
    onEditLine,
    lines,
    record,
    periodCards,
    placeholderLines,
    copyPrompt,
    isDrawing,
    isPeriodDrawing,
    toast,
    disableSingleDraw,
    disablePeriodDraw,
    resultRef,
    periodCardsRef,
    buildPeriodCards,
  };
}


