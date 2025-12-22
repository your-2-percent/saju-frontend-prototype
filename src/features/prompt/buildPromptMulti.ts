// features/AnalysisReport/buildPromptMulti.ts
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
import { buildHarmonyTags, normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import { buildShinsalTags } from "@/features/AnalysisReport/logic/shinsal";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import { useSajuSettingsStore } from "@/shared/lib/hooks/useSajuSettingsStore";
import { computeDeukFlags10 } from "@/features/AnalysisReport/utils/strength";
import type { Element } from "@/features/AnalysisReport/utils/types";
import type { DayBoundaryRule } from "@/shared/type";

import { STEM_TO_ELEMENT, elementToTenGod, getNabeum } from "./promptCore";
import { buildTopicGuide } from "./topicGuide";
import { formatBirthForPrompt } from "./formatBirth";

import { isUnknownTime, getActivePosLabels, compactNatalForLabels } from "./promptPosLabels";

import type { MultiPromptInput } from "./multi/types";
import { sectionPlain, pruneEmptyDeep } from "./multi/sectionUtils";
import { buildSelectedDaeSections } from "./multi/sections/daeSelectedSections";
import { buildSeYearSections } from "./multi/sections/seYearSections";
import { buildWolMonthSections } from "./multi/sections/wolMonthSections";
import { buildIlDaySections } from "./multi/sections/ilDaySections";

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
    topic,
    subTopic,
    timeMode,
    teacherMode,
    sections,
  } = input;

  const unknownTime = isUnknownTime(ms);
  const hour = normalizeGZ(natalRaw[3] ?? "");
  const hasHour = !!hour;
  const rule: DayBoundaryRule = (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  // ✅ 시주: 출생시간 모름이면 무조건 제외
  const natal: Pillars4 = [
    normalizeGZ(natalRaw[0] ?? ""),
    normalizeGZ(natalRaw[1] ?? ""),
    normalizeGZ(natalRaw[2] ?? ""),
    hour,
  ];

  const posLabels = getActivePosLabels(ms, natal);
  const dayStem = natal[2]?.charAt(0) ?? "";
  const dayEl = STEM_TO_ELEMENT[dayStem] ?? STEM_TO_ELEMENT[unified.dayStem] ?? "목";

  // 섹션 토글
  const showTenGod = !!includeTenGod && (sections?.tenGod ?? true);
  const showTwelveUnseong = sections?.twelveUnseong ?? true;
  const showTwelveShinsal = sections?.twelveShinsal ?? true;
  const showShinsal = sections?.shinsal ?? true;
  const showNabeum = sections?.nabeum ?? true;

  // 신살 기준
  const { shinsalBase, shinsalEra, shinsalGaehwa } = useSajuSettingsStore.getState();
  const baseBranch =
    shinsalBase === "연지" ? natal[0]?.charAt(1) ?? "" : natal[2]?.charAt(1) ?? "";

  const birthLine = formatBirthForPrompt(ms, unknownTime);
  const header = [
    `📌 명식: ${ms.name ?? "이름없음"} (${birthLine}) 성별: ${ms.gender}`,
    `원국 ${natal[0]}년 ${natal[1]}월 ${natal[2]}일` + (hasHour ? ` ${natal[3]}시` : ""),
  ].join("\n");

  const sectionModel: string[] = [];

  // 1) 원국 고정 섹션
  const { flags: deukFlags } = computeDeukFlags10(natal, unified.elementScoreRaw);
  const shinLine = `${category} (${percent.toFixed(1)}%) · ${[
    `득령 ${
      deukFlags.비견.령 || deukFlags.겁재.령 || deukFlags.편인.령 || deukFlags.정인.령
        ? "인정"
        : "불인정"
    }`,
    `득지 ${
      deukFlags.비견.지 || deukFlags.겁재.지 || deukFlags.편인.지 || deukFlags.정인.지
        ? "인정"
        : "불인정"
    }`,
    `득세 ${
      deukFlags.비견.세 || deukFlags.겁재.세 || deukFlags.편인.세 || deukFlags.정인.세
        ? "인정"
        : "불인정"
    }`,
  ].join(" · ")}`;
  sectionModel.push(sectionPlain("신강도", shinLine));

  sectionModel.push(
    sectionPlain(
      "오행강약(원국)",
      Object.fromEntries(
        Object.entries(unified.natalFixed.elementPercent100).map(([el, val]) => [
          `${el}(${elementToTenGod(dayEl, el as Element)})`,
          val,
        ]),
      ),
    ),
  );

  if (showTenGod) {
    sectionModel.push(
      sectionPlain("십신 강약(소분류 10개·원국·합계 100)", unified.natalFixed.totalsSub),
    );
  }

  if (showTwelveUnseong) {
    const twelveUnseongData = Object.fromEntries(
      posLabels.map((pos, i) => [pos, getTwelveUnseong(dayStem, (natal[i] ?? "").charAt(1))]),
    );
    sectionModel.push(sectionPlain("십이운성(원국)", twelveUnseongData));
  }

  if (showTwelveShinsal) {
    const twelveShinsalData = Object.fromEntries(
      posLabels.map((pos, i) => [
        pos,
        getTwelveShinsalBySettings({
          baseBranch,
          targetBranch: (natal[i] ?? "").charAt(1),
          era: shinsalEra,
          gaehwa: shinsalGaehwa,
        }),
      ]),
    );
    sectionModel.push(sectionPlain("십이신살(원국)", twelveShinsalData));
  }

  sectionModel.push(sectionPlain("득령/득지/득세", deukFlags));

  const harmonyTags = buildHarmonyTags(compactNatalForLabels(posLabels, natal));
  sectionModel.push(sectionPlain("형충회합(원국)", harmonyTags));

  if (showShinsal) {
    const shinsalWithNatal = buildShinsalTags({
      natal,
      daewoon: null,
      sewoon: null,
      wolwoon: null,
      ilwoon: null,
      basis,
    });
    sectionModel.push(sectionPlain("신살(원국)", shinsalWithNatal));
  }

  if (showNabeum) {
    const nabeumData = Object.fromEntries(
      posLabels.map((pos, i) => {
        const gz = natal[i] ?? "";
        const n = getNabeum(gz);
        return [pos, n ? { gz, nabeum: n.name, element: n.element, code: n.code } : null];
      }),
    );
    sectionModel.push(sectionPlain("납음오행(원국)", nabeumData));
  }

  // 2) 선택 대운
  if (daeList.length > 0 && selectedDaeList.length > 0) {
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

  // 3) 세운(연도 리스트)
  if (seYears.length > 0) {
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

  // 4) 월운(YYYY-MM)
  if (wolMonths.length > 0) {
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

  // 5) 일운(YYYY-MM-DD)
  if (ilDays.length > 0) {
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

  // 6) 가이드
  const guide = buildTopicGuide({
    topic,
    subTopic,
    timeMode,
    teacherMode,
  });

  const body = (pruneEmptyDeep(sectionModel.join("\n\n")) ?? "").toString();
  return { header, body, guide };
}

export function buildMultiLuckPrompt(input: MultiPromptInput): string {
  const { header, body, guide } = buildMultiLuckPromptParts(input);
  return [header, "", body, "", guide].join("\n");
}

