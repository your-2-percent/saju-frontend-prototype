// features/AnalysisReport/buildPromptSingle.ts

import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4, RelationTags } from "@/features/AnalysisReport/logic/relations";
import { buildAllRelationTags, buildHarmonyTags, normalizeGZ } from "@/features/AnalysisReport/logic/relations";
import { buildShinsalTags, type ShinsalBasis } from "@/features/AnalysisReport/logic/shinsal";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import { useSajuSettingsStore } from "@/shared/lib/hooks/useSajuSettingsStore";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import { getDaewoonList } from "../luck/daewoonList";
import type { ShinCategory } from "@/features/AnalysisReport/logic/shinStrength";
import { computeDeukFlags10 } from "@/features/AnalysisReport/utils/strength";
import type { LuckChain, UnifiedPowerResult } from "@/features/AnalysisReport/utils/unifiedPower";
import type { Element } from "@/features/AnalysisReport/utils/types";

import { buildTopicGuide, type MainCategoryKey, type RelationMode, type SubCategoryKey } from "./topicGuide";
import { STEM_TO_ELEMENT, getNabeum } from "./promptCore";
import { formatBirthForPrompt } from "./formatBirth";
import type { PromptSectionToggles } from "./promptSectionToggles";
import { makeOverlayByLuck } from "./promptOverlay";
import { getActivePosLabels, isUnknownTime } from "./promptPosLabels";
import { sectionJson } from "./sectionFormat";
import { elementPercentWithTenGodLabels } from "./multi/sectionUtils";
import { buildSingleGzItems, formatSingleLuckChain } from "./single/gzItems";

export type { PromptSectionToggles } from "./promptSectionToggles";

export type SinglePromptInput = {
  ms: MyeongSik;
  natal: Pillars4;
  chain: LuckChain;
  basis?: ShinsalBasis;
  includeTenGod?: boolean;
  tab: BlendTab;
  unified: UnifiedPowerResult;
  percent: number;
  category: ShinCategory;
  topic: MainCategoryKey;
  subTopic: SubCategoryKey;
  timeMode?: "single";
  relationMode?: RelationMode;
  partnerMs?: MyeongSik | null;

  // 🔥 추가
  teacherMode?: boolean;
  friendMode?: boolean;
  sections?: PromptSectionToggles;
};

/* ─────────────────────────────────────────────
 * 단일 탭용 프롬프트 (원국/대운/세운/월운/일운)
 * ──────────────────────────────────────────── */

export type ChatPromptParts = {
  header: string;
  body: string;
  guide: string;
};

export function buildChatPromptParts(input: SinglePromptInput): ChatPromptParts {
  const {
    ms,
    natal: natalRaw,
    chain,
    basis,
    tab,
    unified,
    percent,
    category,
    topic,
    subTopic,
    relationMode,
    teacherMode,
    sections,
  } = input;

  const showTenGod = sections?.tenGod ?? true;
  const showTwelveUnseong = sections?.twelveUnseong ?? true;
  const showTwelveShinsal = sections?.twelveShinsal ?? true;
  const showShinsal = sections?.shinsal ?? true;
  const showNabeum = sections?.nabeum ?? true;

  const unknownTime = isUnknownTime(ms);
  const hour = normalizeGZ(natalRaw[3] ?? "");
  const hasHour = !!hour;

  // ✅ 시주: 출생시간 모름이면 무조건 제외
  const natal: Pillars4 = [
    normalizeGZ(natalRaw[0] ?? ""),
    normalizeGZ(natalRaw[1] ?? ""),
    normalizeGZ(natalRaw[2] ?? ""),
    hour,
  ];

  const daeList = getDaewoonList(ms).slice(0, 10);

  // 형충회합(운 포함)
  const relWithLuck: RelationTags = buildAllRelationTags({
    natal,
    daewoon: tab !== "원국" ? chain?.dae ?? undefined : undefined,
    sewoon:
      tab === "세운" || tab === "월운" || tab === "일운"
        ? chain?.se ?? undefined
        : undefined,
    wolwoon: tab === "월운" || tab === "일운" ? chain?.wol ?? undefined : undefined,
    ilwoon: tab === "일운" ? chain?.il ?? undefined : undefined,
  });

  const sinsalWithLuck = buildShinsalTags({
    natal,
    daewoon: tab !== "원국" ? chain?.dae ?? undefined : undefined,
    sewoon:
      tab === "세운" || tab === "월운" || tab === "일운"
        ? chain?.se ?? undefined
        : undefined,
    wolwoon: tab === "월운" || tab === "일운" ? chain?.wol ?? undefined : undefined,
    ilwoon: tab === "일운" ? chain?.il ?? undefined : undefined,
  });

  // 십이신살(설정 반영)
  const { shinsalEra, shinsalGaehwa, shinsalBase } = useSajuSettingsStore.getState();
  const baseBranch = shinsalBase === "연지" ? natal[0]?.charAt(1) ?? "" : natal[2]?.charAt(1) ?? "";

  // 오버레이(탭 기준)
  const overlay = makeOverlayByLuck(unified, tab, chain);
  const elemPercentObj = overlay.elementPercent;
  const totalsSub = overlay.totalsSub;

  // 신강도/득령·득지·득세
  const { flags: deukFlags0 } = computeDeukFlags10(natal, unified.elementScoreRaw);
  const shinLine = `${category} (${percent.toFixed(1)}%) · ${[
    `득령 ${
      deukFlags0.비견.령 ||
      deukFlags0.겁재.령 ||
      deukFlags0.편인.령 ||
      deukFlags0.정인.령
        ? "인정"
        : "불인정"
    }`,
    `득지 ${
      deukFlags0.비견.지 ||
      deukFlags0.겁재.지 ||
      deukFlags0.편인.지 ||
      deukFlags0.정인.지
        ? "인정"
        : "불인정"
    }`,
    `득세 ${deukFlags0.비견.세 || deukFlags0.겁재.세 ? "인정" : "불인정"}`,
  ].join(", ")}`;

  const posLabels = getActivePosLabels(ms, natal);
  const dayStem = unified.dayStem; // ex) "정"
  const dayEl = (STEM_TO_ELEMENT[dayStem as keyof typeof STEM_TO_ELEMENT] ?? unified.dayElement) as Element;

  const header = [
    `📌 명식: ${ms.name ?? "이름없음"} (${formatBirthForPrompt(ms, unknownTime)}) 성별: ${ms.gender}`,
    `원국 ${natal[0]}년 ${natal[1]}월 ${natal[2]}일` + (hasHour ? ` ${natal[3]}시` : ""),
    `운: ${formatSingleLuckChain(tab, chain)}`,
  ].join("\n");

  const bodyParts: string[] = [];

  // 대운 리스트
  bodyParts.push(sectionJson("대운 리스트 (10개)", daeList));

  // 신강도
  bodyParts.push(sectionJson("신강도", shinLine));

  // 오행강약(원국 고정)
  bodyParts.push(
    sectionJson(
      "오행강약(퍼센트·원국 기준 고정)",
      elementPercentWithTenGodLabels(unified.natalFixed.elementPercent100, dayEl),
    ),
  );

  // 오행강약(현재 탭 기준) — 원국 탭이 아니면만 출력
  if (tab !== "원국") {
    bodyParts.push(
      sectionJson(
        `오행강약(퍼센트·탭=${tab})`,
        elementPercentWithTenGodLabels(elemPercentObj, dayEl),
      ),
    );
  }

  // 십신 강약
  if (showTenGod) {
    bodyParts.push(
      sectionJson(
        "십신 강약(소분류 10개·원국·합계 100)",
        unified.natalFixed.totalsSub,
      ),
    );

    if (tab !== "원국") {
      bodyParts.push(sectionJson(`십신 강약(소분류 10개·탭=${tab}·합계 100)`, totalsSub));
    }
  }

  // 원국+운 간지 아이템
  const gzItems = buildSingleGzItems({ tab, natal, posLabels, chain });

  // 십이운성(원국+운 반영)
  if (showTwelveUnseong) {
    const rows = gzItems.map(({ pos, gz }) => ({
      pos,
      gz,
      unseong: getTwelveUnseong(natal[2]?.charAt(0) ?? "", gz.charAt(1)),
    }));

    bodyParts.push(sectionJson("십이운성(원국+운 반영)", rows));
  }

  // 십이신살(원국+운 반영·설정 적용)
  if (showTwelveShinsal) {
    const rows = gzItems.map(({ pos, gz }) => ({
      pos,
      gz,
      shinsal: getTwelveShinsalBySettings({
        baseBranch,
        targetBranch: gz.charAt(1),
        era: shinsalEra,
        gaehwa: shinsalGaehwa,
      }),
    }));

    bodyParts.push(sectionJson("십이신살(원국+운 반영·설정 적용)", rows));
  }

  // 납음오행(원국+운 반영)
  if (showNabeum) {
    const rows = gzItems.flatMap((it) => {
      const info = getNabeum(it.gz);
      if (!info) {
        // 원국은 null이라도 남기고, 운은(이상치)면 빼버림
        return it.kind === "natal" ? [{ pos: it.pos, gz: it.gz, nabeum: null }] : [];
      }

      return [
        {
          pos: it.pos,
          gz: it.gz,
          nabeum: info.name,
          element: info.element,
          code: info.code,
        },
      ];
    });

    bodyParts.push(sectionJson("납음오행(원국+운 반영)", rows));
  }

  // 형충회합(원국)
  bodyParts.push(sectionJson("형충회합(원국)", buildHarmonyTags(posLabels.map((_, i) => natal[i] ?? ""))));

  // 형충회합(운 포함: 탭 연동)
  bodyParts.push(sectionJson("형충회합(운 포함: 탭 연동)", relWithLuck));

  // 신살(원국 / 운 포함)
  if (showShinsal) {
    if (tab === "원국") {
      const baseShinsal = buildShinsalTags({
        natal,
        daewoon: null,
        sewoon: null,
        wolwoon: null,
        ilwoon: null,
        basis,
      });

      bodyParts.push(
        sectionJson("신살(원국 전용)", {
          good: baseShinsal.good,
          bad: baseShinsal.bad,
          meta: baseShinsal.meta,
        }),
      );
    } else {
      bodyParts.push(sectionJson(`신살(운 포함·탭=${tab})`, sinsalWithLuck));
    }
  }

  const body = bodyParts.filter((s) => s && s.trim().length > 0).join("\n\n");

  const topicGuide = buildTopicGuide({
    topic,
    subTopic,
    timeMode: "single",
    tab,
    relationMode,
    teacherMode,
  });

  const guideParts: string[] = [
    "-----",
    "🧭 해석 가이드",
    "",
    "1. 위 데이터는 사주 원국과 현재 선택된 탭(원국/대운/세운/월운/일운)의 수치·태그 정보다.",
    "2. 해석 시, 원국 → 선택 탭 순서로 변화 포인트를 요약한다.",
  ];

  if (topicGuide) {
    guideParts.push("", "🎯 질문 포커스(카테고리 반영)", topicGuide);
  }

  const guide = guideParts.join("\n");

  return { header, body, guide };
}

export function buildChatPrompt(input: SinglePromptInput): string {
  const { header, body, guide } = buildChatPromptParts(input);
  return [header, body, guide].join("\n\n");
}
