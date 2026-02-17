import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import { buildHarmonyTags, normalizeGZ } from "@/analysisReport/calc/logic/relations";
import { buildShinsalTags } from "@/analysisReport/calc/logic/shinsal";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/ganji/twelve";
import { useSajuSettingsStore } from "@/saju/input/useSajuSettingsStore";
import { computeDeukFlags10 } from "@/analysisReport/calc/utils/strength";
import type { Element } from "@/analysisReport/calc/utils/types";
import type { DayBoundaryRule } from "@/shared/type";
import { computeAlignedNatalFixed } from "@/features/prompt/calc/natalFixedAligned";

import { STEM_TO_ELEMENT, elementToTenGod, getNabeum } from "./promptCore";
import { formatBirthForPrompt } from "./formatBirth";
import { computeYinYangSummary } from "./calc/yinYang";
import { isUnknownTime, getActivePosLabels, compactNatalForLabels } from "./promptPosLabels";
import { appendTimeModeGuide } from "./topicGuide/timeModeGuide";

import type { MultiPromptInput } from "./multi/types";
import { pruneEmptyDeep } from "./multi/sectionUtils";
import { buildSelectedDaeSections } from "./multi/sections/daeSelectedSections";
import { buildSeYearSections } from "./multi/sections/seYearSections";
import { buildWolMonthSections } from "./multi/sections/wolMonthSections";
import { buildIlDaySections } from "./multi/sections/ilDaySections";
import {
  formatGzRows,
  formatHarmonyBlock,
  formatInlineKV,
  formatShinsalBlock,
  formatYinYangLine,
  labelTenGodSubWithStems,
} from "./promptFormat";

export type { DaewoonInfo } from "./multi/types";
export type { PromptSectionToggles } from "./promptSectionToggles";

export type MultiPromptParts = {
  header: string;
  body: string;
  guide: string;
};

export function buildMultiLuckPromptParts(input: MultiPromptInput): MultiPromptParts {
  const {
    ms,
    natal: natalRaw,
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
    sections,
  } = input;

  const unknownTime = isUnknownTime(ms);
  const hour = normalizeGZ(natalRaw[3] ?? "");
  const rule: DayBoundaryRule = (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  const natal: Pillars4 = [
    normalizeGZ(natalRaw[0] ?? ""),
    normalizeGZ(natalRaw[1] ?? ""),
    normalizeGZ(natalRaw[2] ?? ""),
    hour,
  ];

  const posLabels = getActivePosLabels(ms, natal);
  const dayStem = natal[2]?.charAt(0) ?? "";
  const dayEl = STEM_TO_ELEMENT[dayStem] ?? STEM_TO_ELEMENT[unified.dayStem] ?? "목";
  const natalFixedAligned = computeAlignedNatalFixed({
    natal,
    dayStem,
    perStemSource:
      unified.natalFixed.overlay.perStemAugFull ?? unified.natalFixed.overlay.perStemAugBare,
  });

  const showTenGod = !!includeTenGod && (sections?.tenGod ?? true);
  const showTwelveUnseong = sections?.twelveUnseong ?? true;
  const showTwelveShinsal = sections?.twelveShinsal ?? true;
  const showShinsal = sections?.shinsal ?? true;
  const showNabeum = sections?.nabeum ?? true;

  const { shinsalBase, shinsalEra, shinsalGaehwa } = useSajuSettingsStore.getState();
  const baseBranch = shinsalBase === "연지" ? natal[0]?.charAt(1) ?? "" : natal[2]?.charAt(1) ?? "";

  const header = `명식: ${ms.name ?? "이름없음"}  (${formatBirthForPrompt(ms, unknownTime)}) 
${ms.ganjiText} / 성별: ${ms.gender}`;

  const section = (title: string, content: string): string => {
    const body = (content ?? "").trim();
    if (!body) return "";
    return `## ${title}\n${body}`;
  };

  const sectionModel: string[] = [];

  const { flags: deukFlags } = computeDeukFlags10(natal, unified.natalFixed.elementScoreRaw);
  const shinLine = `${category} (${percent.toFixed(1)}%) · ${[
    `득령 ${
      deukFlags.비견.령 || deukFlags.겁재.령 || deukFlags.정인.령 || deukFlags.편인.령
        ? "인정"
        : "불인정"
    }`,
    `득지 ${
      deukFlags.비견.지 || deukFlags.겁재.지 || deukFlags.정인.지 || deukFlags.편인.지
        ? "인정"
        : "불인정"
    }`,
    `득세 ${deukFlags.비견.세 || deukFlags.겁재.세 ? "인정" : "불인정"}`,
  ].join(" · ")}`;

  const natalParts: string[] = [];
  natalParts.push("원국 ver.");
  natalParts.push(section("신강도", shinLine));

  const yinYang = computeYinYangSummary({
    natal,
    perStemElementScaled:
      unified.natalFixed.overlay.perStemAugFull ?? unified.natalFixed.overlay.perStemAugBare,
    mode: "natal",
  });
  if (yinYang) natalParts.push(section("음양수치(원국)", formatYinYangLine(yinYang)));

  natalParts.push(
    section(
      "오행강약(퍼센트·원국 기준 고정)",
      formatInlineKV(
        Object.fromEntries(
          Object.entries(natalFixedAligned.elementPercent100).map(([el, val]) => [
            `${el}(${elementToTenGod(dayEl, el as Element)})`,
            val,
          ]),
        ),
      ),
    ),
  );

  if (showTenGod) {
    const labeled = labelTenGodSubWithStems(natalFixedAligned.totalsSub100, dayStem);
    natalParts.push(section("십신 강약(소분류 10개·원국·합계 100)", formatInlineKV(labeled)));
  }

  if (showTwelveUnseong) {
    const rows = posLabels
      .map((pos, i) => {
        const gz = natal[i] ?? "";
        if (!gz) return null;
        return { pos, gz, value: getTwelveUnseong(dayStem, gz.charAt(1)) };
      })
      .filter(Boolean) as { pos: string; gz: string; value: string }[];
    if (rows.length > 0) natalParts.push(section("십이운성(원국)", formatGzRows(rows)));
  }

  if (showTwelveShinsal) {
    const rows = posLabels
      .map((pos, i) => {
        const gz = natal[i] ?? "";
        if (!gz) return null;
        return {
          pos,
          gz,
          value: getTwelveShinsalBySettings({
            baseBranch,
            targetBranch: gz.charAt(1),
            era: shinsalEra,
            gaehwa: shinsalGaehwa,
          }),
        };
      })
      .filter(Boolean) as { pos: string; gz: string; value: string }[];
    if (rows.length > 0) natalParts.push(section("십이신살(원국)", formatGzRows(rows)));
  }

  if (showNabeum) {
    const rows = posLabels
      .map((pos, i) => {
        const gz = natal[i] ?? "";
        if (!gz) return null;
        const n = getNabeum(gz);
        if (!n) return null;
        return { pos, gz, value: n.name };
      })
      .filter(Boolean) as { pos: string; gz: string; value: string }[];
    if (rows.length > 0) natalParts.push(section("납음오행", formatGzRows(rows)));
  }

  const harmonyTags = buildHarmonyTags(compactNatalForLabels(posLabels, natal));
  natalParts.push(section("형충회합(원국)", formatHarmonyBlock(harmonyTags)));

  if (showShinsal) {
    const shinsalWithNatal = buildShinsalTags({
      natal,
      daewoon: null,
      sewoon: null,
      wolwoon: null,
      ilwoon: null,
      basis,
    });
    natalParts.push(section("신살(원국)", formatShinsalBlock(shinsalWithNatal)));
  }

  const natalBlock = natalParts.filter(Boolean).join("\n\n");
  if (natalBlock) sectionModel.push(natalBlock);

  if (daeList.length > 0 && selectedDaeList.length > 0) {
    sectionModel.push("대운 ver.");
    sectionModel.push(
      ...buildSelectedDaeSections({
        selectedDaeList,
        daeList,
        natal,
        basis,
        unified,
        dayEl,
        baseDayStem: dayStem,
        show: {
          tenGod: showTenGod,
          twelveUnseong: showTwelveUnseong,
          twelveShinsal: showTwelveShinsal,
          shinsal: showShinsal,
          nabeum: showNabeum,
        },
        shinsalSettings: { baseBranch, era: shinsalEra, gaehwa: shinsalGaehwa },
      }),
    );
  }

  if (seYears.length > 0) {
    sectionModel.push("세운 ver.");
    sectionModel.push(
      ...buildSeYearSections({
        seYears,
        daeList,
        natal,
        basis,
        unified,
        dayEl,
        baseDayStem: dayStem,
        show: {
          tenGod: showTenGod,
          twelveUnseong: showTwelveUnseong,
          twelveShinsal: showTwelveShinsal,
          shinsal: showShinsal,
          nabeum: showNabeum,
        },
        shinsalSettings: { baseBranch, era: shinsalEra, gaehwa: shinsalGaehwa },
      }),
    );
  }

  if (wolMonths.length > 0) {
    sectionModel.push("월운 ver.");
    sectionModel.push(
      ...buildWolMonthSections({
        wolMonths,
        daeList,
        natal,
        basis,
        unified,
        dayEl,
        baseDayStem: dayStem,
        show: {
          tenGod: showTenGod,
          twelveUnseong: showTwelveUnseong,
          twelveShinsal: showTwelveShinsal,
          shinsal: showShinsal,
          nabeum: showNabeum,
        },
        shinsalSettings: { baseBranch, era: shinsalEra, gaehwa: shinsalGaehwa },
      }),
    );
  }

  if (ilDays.length > 0) {
    sectionModel.push("일운 ver.");
    sectionModel.push(
      ...buildIlDaySections({
        ilDays,
        daeList,
        natal,
        basis,
        unified,
        dayEl,
        baseDayStem: dayStem,
        show: {
          tenGod: showTenGod,
          twelveUnseong: showTwelveUnseong,
          twelveShinsal: showTwelveShinsal,
          shinsal: showShinsal,
          nabeum: showNabeum,
        },
        shinsalSettings: { baseBranch, era: shinsalEra, gaehwa: shinsalGaehwa },
        dayBoundaryRule: rule,
      }),
    );
  }

  const body = (pruneEmptyDeep(sectionModel.join("\n\n")) ?? "").toString();
  const guideLines: string[] = [];
  appendTimeModeGuide(guideLines, {
    mode: "multi",
    isStudyTone: input.teacherMode === true,
  });
  const guide = guideLines.join("\n").trim();

  return { header, body, guide };
}

export function buildMultiLuckPrompt(input: MultiPromptInput): string {
  const { header, body, guide } = buildMultiLuckPromptParts(input);
  return [header, body, guide].filter((v) => v && v.trim().length > 0).join("\n\n");
}
