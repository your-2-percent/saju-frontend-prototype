import type { PeriodPayload, PeriodTab } from "@/iching/calc/period";
import {
  coinTossLine,
  fnv1a32,
  getChangingIndexes,
  makeId,
  mulberry32,
  safeNowISO,
  toChangedYinYang,
  toYinYang,
} from "@/iching/calc/ichingDrawerUtils";
import type { DivinationRecord, LineDraw, SajuContext } from "@/iching/calc/ichingTypes";
import type { PeriodCard } from "@/iching/calc/drawerTypes";

type BuildPeriodCardsArgs = {
  periodTab: PeriodTab;
  seunPayload: PeriodPayload | null;
  wolunPayload: PeriodPayload | null;
  ilunPayload: PeriodPayload | null;
  questionText: string;
  sajuSeedPart: string;
  saju?: SajuContext | null;
  viewMeta?: Record<string, unknown>;
};

function makeLinesFromSeed(seedText: string): LineDraw[] {
  const rngLocal = mulberry32(fnv1a32(seedText));
  const next: LineDraw[] = [];
  for (let i = 0; i < 6; i += 1) next.push(coinTossLine(rngLocal));
  return next;
}

function buildRecordFromLines(
  q: string,
  seedText: string,
  linesLocal: LineDraw[],
  saju?: SajuContext | null,
  viewMeta?: Record<string, unknown>
): DivinationRecord {
  return {
    id: makeId(),
    kind: "iching_sixyao",
    createdAtISO: safeNowISO(),
    question: q,
    seedTextUsed: seedText,
    linesBottomUp: linesLocal,
    changingLines: getChangingIndexes(linesLocal),
    baseBitsBottomUp: linesLocal.map((l) => toYinYang(l.value)),
    changedBitsBottomUp: linesLocal.map((l) => toChangedYinYang(l.value)),
    saju: saju ?? undefined,
    viewMeta,
  };
}

export function buildPeriodCardsFromPayload(args: BuildPeriodCardsArgs): PeriodCard[] {
  const { periodTab, seunPayload, wolunPayload, ilunPayload, questionText, sajuSeedPart, saju, viewMeta } = args;
  const nextCards: PeriodCard[] = [];

  if (periodTab === "seun" && seunPayload?.seun?.length) {
    seunPayload.seun.forEach((p) => {
      const title = `날짜 ${p.year} (${p.seun}`;
      const seedBase = `${questionText}::${p.refDateYMD}`;
      const seedText = sajuSeedPart ? `${seedBase}::SAJU::${sajuSeedPart}` : seedBase;
      const linesLocal = makeLinesFromSeed(seedText);
      const rec = buildRecordFromLines(questionText, seedText, linesLocal, saju, viewMeta);
      nextCards.push({
        key: `seun-${p.year}`,
        title,
        dateYMD: p.refDateYMD,
        record: rec,
      });
    });
  }

  if (periodTab === "wolun" && wolunPayload?.wolun?.length) {
    wolunPayload.wolun.forEach((p) => {
      const mm = String(p.month).padStart(2, "0");
      const title = `날짜 ${p.year}-${mm} (${p.seun} ${p.wolun}`;
      const seedBase = `${questionText}::${p.refDateYMD}`;
      const seedText = sajuSeedPart ? `${seedBase}::SAJU::${sajuSeedPart}` : seedBase;
      const linesLocal = makeLinesFromSeed(seedText);
      const rec = buildRecordFromLines(questionText, seedText, linesLocal, saju, viewMeta);
      nextCards.push({
        key: `wolun-${p.year}-${mm}`,
        title,
        dateYMD: p.refDateYMD,
        record: rec,
      });
    });
  }

  if (periodTab === "ilun" && ilunPayload?.ilun?.length) {
    ilunPayload.ilun.forEach((p) => {
      const title = `날짜 ${p.dateYMD} (${p.seun} ${p.wolun} ${p.ilun}`;
      const seedBase = `${questionText}::${p.dateYMD}`;
      const seedText = sajuSeedPart ? `${seedBase}::SAJU::${sajuSeedPart}` : seedBase;
      const linesLocal = makeLinesFromSeed(seedText);
      const rec = buildRecordFromLines(questionText, seedText, linesLocal, saju, viewMeta);
      nextCards.push({
        key: `ilun-${p.dateYMD}`,
        title,
        dateYMD: p.dateYMD,
        record: rec,
      });
    });
  }

  return nextCards;
}
