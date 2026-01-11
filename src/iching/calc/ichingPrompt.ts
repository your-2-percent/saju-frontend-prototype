import {
  deriveHexMetaFromBitsBottomUp,
  deriveHexMetaFromLines,
  deriveSixYaoAutoSideFromLines,
} from "@/iching/ui/SixYaoResultCard";
import type { PeriodPayload, PeriodTab } from "@/iching/calc/period";
import type { LineDraw, LineValue, SajuContext, YinYang } from "@/iching/calc/ichingTypes";
import type { PeriodCard } from "@/iching/calc/drawerTypes";

type BuildPromptArgs = {
  selectedCardText?: string;
  ready: boolean;
  periodCards: PeriodCard[];
  finalQuestion: string;
  question: string;
  baseBits: YinYang[];
  changedBits: YinYang[];
  changingIndexes: number[];
  lineValues: LineValue[];
  lines: LineDraw[];
  saju?: SajuContext | null;
  baseDate: Date;
  seunPayload: PeriodPayload | null;
  wolunPayload: PeriodPayload | null;
  ilunPayload: PeriodPayload | null;
  periodTab: PeriodTab;
};

// function formatYMD(d: Date): string {
//   const y = d.getFullYear();
//   const m = String(d.getMonth() + 1).padStart(2, "0");
//   const day = String(d.getDate()).padStart(2, "0");
//   return `${y}-${m}-${day}`;
// }

function buildSajuSummary(saju?: SajuContext | null): string {
  if (!saju) return "사주 정보 없음";
  const lines = [
    saju.name ? `이름: ${saju.name}` : "",
    saju.gender ? `성별: ${saju.gender}` : "",
    saju.pillarsText ? `원국: ${saju.pillarsText}` : "",
  ].filter(Boolean);
  return lines.length ? lines.join("\n") : "사주 정보 없음";
}

function filterLuckForTab(saju: SajuContext | null | undefined, periodTab: PeriodTab): SajuContext | null | undefined {
  if (!saju || !saju.luck) return saju;
  const { daeun, seun, wolun, ilun } = saju.luck;
  const luck =
    periodTab === "seun"
      ? { daeun, seun }
      : periodTab === "wolun"
        ? { daeun, seun, wolun }
        : { daeun, seun, wolun, ilun };
  return { ...saju, luck };
}

export function buildIChingPrompt(args: BuildPromptArgs): string {
  const {
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
    //baseDate,
    periodTab,
  } = args;

  const q = (finalQuestion.trim() || question.trim()).trim();
  const questionText = q ? q : "(질문 없음)";

  if (selectedCardText && selectedCardText.trim()) {
    return [`질문 : ${questionText}`, "카드", selectedCardText.trim()].join("\n");
  }

  if (!ready && periodCards.length === 0) return "";

  const baseBitsText = baseBits.join("");
  const changedBitsText = changedBits.join("");
  const changingText = changingIndexes.length ? changingIndexes.join(", ") : "없음";
  const lineValuesText = lineValues.join(", ");

  const baseHexMeta = deriveHexMetaFromLines(lines);
  const changedHexMeta = deriveHexMetaFromBitsBottomUp(changedBits);

  const baseHexNumberText = typeof baseHexMeta.number === "number" ? String(baseHexMeta.number) : "미상";
  const baseHexTitle = baseHexMeta.titleKo || "미상";
  const baseHexTitleHanja = baseHexMeta.titleHanja || "?";
  const baseHexNameHanja = baseHexMeta.nameHanja || "?";
  const baseUpperLower =
    baseHexMeta.upperKo && baseHexMeta.lowerKo ? `${baseHexMeta.upperKo}/${baseHexMeta.lowerKo}` : "미상";
  const baseUpperLowerHanja =
    baseHexMeta.upperHanja && baseHexMeta.lowerHanja
      ? `${baseHexMeta.upperHanja}/${baseHexMeta.lowerHanja}`
      : "미상";

  const changedHexNumberText = typeof changedHexMeta.number === "number" ? String(changedHexMeta.number) : "미상";
  const changedUpperLower =
    changedHexMeta.upperKo && changedHexMeta.lowerKo
      ? `${changedHexMeta.upperKo}/${changedHexMeta.lowerKo}`
      : "미상";
  const changedUpperLowerHanja =
    changedHexMeta.upperHanja && changedHexMeta.lowerHanja
      ? `${changedHexMeta.upperHanja}/${changedHexMeta.lowerHanja}`
      : "미상";

  const autoSide = deriveSixYaoAutoSideFromLines(lines);

  const liuQinText = autoSide.leftTopDown.length ? autoSide.leftTopDown.join(" ") : "(미상)";
  const branchesText = autoSide.rightTopDown.length ? autoSide.rightTopDown.join(" ") : "(미상)";

  const markerText = autoSide.markers.length
    ? autoSide.markers.map((m) => `${m.text}${m.atLineTopDown}효`).join(", ")
    : "(없음)";

  const sajuSummary = buildSajuSummary(saju);

  const periodCardBlock =
    periodCards.length > 0
      ? [
          "기간별 카드(각각 뽑은 결과)",
          ...periodCards.flatMap((card, idx) => {
            const meta = deriveHexMetaFromLines(card.record.linesBottomUp);
            const auto = deriveSixYaoAutoSideFromLines(card.record.linesBottomUp);
            const baseBitsTextLocal = card.record.baseBitsBottomUp.join("");
            const changedBitsTextLocal = card.record.changedBitsBottomUp.join("");
            const changingTextLocal = card.record.changingLines.length
              ? card.record.changingLines.join(", ")
              : "없음";
            const lineValuesLocal = card.record.linesBottomUp.map((l) => l.value).join(", ");
            const hexTitle = meta.titleKo || "미상";
            const hexNum = typeof meta.number === "number" ? String(meta.number) : "미상";
            const liuQinLocal = auto.leftTopDown.length ? auto.leftTopDown.join(" ") : "(미상)";
            const branchesLocal = auto.rightTopDown.length ? auto.rightTopDown.join(" ") : "(미상)";
            const markersLocal = auto.markers.length
              ? auto.markers.map((m) => `${m.text}${m.atLineTopDown}효`).join(", ")
              : "(없음)";
            return [
              `${idx + 1}. ${card.title}`,
              //`- 기준일: ${card.dateYMD}`,
              `- 괘 번호/명: ${hexNum} · ${hexTitle}`,
              `- 본괘 비트(하→상): ${baseBitsTextLocal}`,
              `- 지괘 비트(하→상): ${changedBitsTextLocal}`,
              `- 동효: ${changingTextLocal}효`,
              `- 효값(하→상): ${lineValuesLocal}`,
              `- 육친(상→하): ${liuQinLocal}`,
              `- 지지(상→하): ${branchesLocal}`,
              `- 命/身/世/應: ${markersLocal}`,
            ];
          }),
          "",
        ]
      : [];

  const baseBlock =
    ready && lines.length === 6
      ? [
          "괘 정보(본괘)",
          `- 괘 번호: ${baseHexNumberText}`,
          `- 괘명(한글): ${baseHexTitle}`,
          `- 괘명(한자): ${baseHexTitleHanja} (${baseHexNameHanja})`,
          `- 상/하 괘: ${baseUpperLower} (${baseUpperLowerHanja})`,
          "",
          "괘 정보(지괘)",
          `- 괘 번호: ${changedHexNumberText}`,
          `- 상/하 괘: ${changedUpperLower} (${changedUpperLowerHanja})`,
          "",
          "육효 결과",
          `- 본괘 비트(하→상): ${baseBitsText}`,
          `- 지괘 비트(하→상): ${changedBitsText}`,
          `- 동효: ${changingText}효`,
          `- 효값(하→상): ${lineValuesText}`,
          `- 육친(상→하): ${liuQinText}`,
          `- 지지(상→하): ${branchesText}`,
          `- 命/身/世/應: ${markerText}`,
          "",
        ]
      : ["육효 결과", "- 본괘/지괘는 기간별 카드 참고", ""];

  const includeSajuJson = ready && periodCards.length === 0;
  const sajuForJson = includeSajuJson ? filterLuckForTab(saju ?? null, periodTab) : null;

  return [
    "너는 주역/육효 전문가다. 아래 정보를 바탕으로 상담용 해석을 간결하고 명확하게 써줘.",
    "",
    `질문: ${questionText}`,
    "",
    ...baseBlock,
    "사주 요약",
    sajuSummary,
    "",
    ...(includeSajuJson
      ? [
          "명식데이터(JSON)",
          JSON.stringify(sajuForJson ?? {}, null, 2),
          "",
        ]
      : []),
    //"기준",
    //`- 기준일(대표): ${formatYMD(baseDate)}`,
    "",
    ...periodCardBlock,
    "요청사항",
    "- 본괘와 지괘의 흐름을 먼저 요약",
    "- 동효가 있으면 해당 효 중심으로 변화 포인트 설명",
    "- 말투는 친절하고 과장 없이",
  ].join("\n");
}
