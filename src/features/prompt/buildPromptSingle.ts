import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import { buildAllRelationTags, buildHarmonyTags, normalizeGZ } from "@/analysisReport/calc/logic/relations";
import { buildShinsalTags, type ShinsalBasis } from "@/analysisReport/calc/logic/shinsal";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/ganji/twelve";
import { useSajuSettingsStore } from "@/saju/input/useSajuSettingsStore";
import type { BlendTab } from "@/analysisReport/calc/logic/blend";
import type { ShinCategory } from "@/analysisReport/calc/logic/shinStrength";
import { computeDeukFlags10 } from "@/analysisReport/calc/utils/strength";
import { computeUnifiedPower, type LuckChain, type UnifiedPowerResult } from "@/analysisReport/calc/utils/unifiedPower";
import type { Element } from "@/analysisReport/calc/utils/types";

import type { MainCategoryKey, RelationMode, SubCategoryKey } from "./topicGuide";
import { STEM_TO_ELEMENT, getNabeum } from "./promptCore";
import { formatBirthForPrompt } from "./formatBirth";
import type { PromptSectionToggles } from "./promptSectionToggles";
import { makeOverlayByLuck } from "./promptOverlay";
import { getActivePosLabels, isUnknownTime } from "./promptPosLabels";
import { elementPercentWithTenGodLabels } from "./multi/sectionUtils";
import { computeYinYangSummary, computeYinYangSummaryWithLuckWeights } from "./calc/yinYang";
import {
  formatGzRows,
  formatHarmonyBlock,
  formatInlineKV,
  formatShinsalBlock,
  formatYinYangLine,
  labelTenGodSubWithStems,
} from "./promptFormat";

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
  baseDate?: Date;

  teacherMode?: boolean;
  friendMode?: boolean;
  sections?: PromptSectionToggles;
};

export type ChatPromptParts = {
  header: string;
  body: string;
  guide: string;
};

export function buildChatPromptParts(input: SinglePromptInput): ChatPromptParts {
  const { ms, natal: natalRaw, chain, basis, tab, unified, percent, category, sections } = input;

  const showTenGod = sections?.tenGod ?? true;
  const showTwelveUnseong = sections?.twelveUnseong ?? true;
  const showTwelveShinsal = sections?.twelveShinsal ?? true;
  const showShinsal = sections?.shinsal ?? true;
  const showNabeum = sections?.nabeum ?? true;

  const unknownTime = isUnknownTime(ms);
  const hour = normalizeGZ(natalRaw[3] ?? "");

  const natal: Pillars4 = [
    normalizeGZ(natalRaw[0] ?? ""),
    normalizeGZ(natalRaw[1] ?? ""),
    normalizeGZ(natalRaw[2] ?? ""),
    hour,
  ];

  const { shinsalEra, shinsalGaehwa, shinsalBase } = useSajuSettingsStore.getState();
  const baseBranch = shinsalBase === "연지" ? natal[0]?.charAt(1) ?? "" : natal[2]?.charAt(1) ?? "";

  const { flags: deukFlags0 } = computeDeukFlags10(natal, unified.natalFixed.elementScoreRaw);
  const shinLine = `${category} (${percent.toFixed(1)}%) · ${[
    `득령 ${
      deukFlags0.비견.령 || deukFlags0.겁재.령 || deukFlags0.정인.령 || deukFlags0.편인.령
        ? "인정"
        : "불인정"
    }`,
    `득지 ${
      deukFlags0.비견.지 || deukFlags0.겁재.지 || deukFlags0.정인.지 || deukFlags0.편인.지
        ? "인정"
        : "불인정"
    }`,
    `득세 ${deukFlags0.비견.세 || deukFlags0.겁재.세 ? "인정" : "불인정"}`,
  ].join(", ")}`;

  const posLabels = getActivePosLabels(ms, natal);
  const dayStem = unified.dayStem;
  const dayEl =
    (STEM_TO_ELEMENT[dayStem as keyof typeof STEM_TO_ELEMENT] ??
      STEM_TO_ELEMENT[unified.dayStem as keyof typeof STEM_TO_ELEMENT] ??
      "목") as Element;

  const header = `명식: ${ms.name ?? "이름없음"}  (${formatBirthForPrompt(ms, unknownTime)}) 
${ms.ganjiText} / 성별: ${ms.gender}`;

  const section = (title: string, content: string): string => {
    const body = (content ?? "").trim();
    if (!body) return "";
    return `## ${title}\n${body}`;
  };

  const bodyParts: string[] = [];

  const natalParts: string[] = [];
  natalParts.push("원국 ver.");
  natalParts.push(section("신강도", shinLine));

  const yinYangNatal = computeYinYangSummary({
    natal,
    perStemElementScaled:
      unified.natalFixed.overlay.perStemAugFull ?? unified.natalFixed.overlay.perStemAugBare,
    mode: "natal",
  });
  if (yinYangNatal) natalParts.push(section("음양수치(원국)", formatYinYangLine(yinYangNatal)));

  natalParts.push(
    section(
      "오행강약(퍼센트·원국 기준 고정)",
      formatInlineKV(elementPercentWithTenGodLabels(unified.natalFixed.elementPercent100, dayEl)),
    ),
  );

  if (showTenGod) {
    const labeled = labelTenGodSubWithStems(unified.natalFixed.totalsSub, dayStem);
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
        const info = getNabeum(gz);
        if (!info) return null;
        return { pos, gz, value: info.name };
      })
      .filter(Boolean) as { pos: string; gz: string; value: string }[];
    if (rows.length > 0) natalParts.push(section("납음오행", formatGzRows(rows)));
  }

  natalParts.push(
    section(
      "형충회합(원국)",
      formatHarmonyBlock(buildHarmonyTags(posLabels.map((_, i) => natal[i] ?? ""))),
    ),
  );

  if (showShinsal) {
    const baseShinsal = buildShinsalTags({
      natal,
      daewoon: null,
      sewoon: null,
      wolwoon: null,
      ilwoon: null,
      basis,
    });
    natalParts.push(section("신살(원국)", formatShinsalBlock(baseShinsal)));
  }

  const natalBlock = natalParts.filter(Boolean).join("\n\n");
  if (natalBlock) bodyParts.push(natalBlock);

  const yinYangWeightsByTab: Record<BlendTab, { natal: number; dae?: number; se?: number; wol?: number; il?: number }> = {
    원국: { natal: 100 },
    대운: { natal: 70, dae: 30 },
    세운: { natal: 60, dae: 25, se: 15 },
    월운: { natal: 55, dae: 20, se: 15, wol: 10 },
    일운: { natal: 50, dae: 20, se: 15, wol: 10, il: 5 },
  };

  const buildLuckBlock = (luckTab: BlendTab, baseUnified?: UnifiedPowerResult): string => {
    if (luckTab === "원국") return "";

    const u =
      baseUnified ??
      computeUnifiedPower({
        natal,
        tab: luckTab,
        chain,
        hourKey: "prompt",
      });

    const overlayLuck = makeOverlayByLuck(u, luckTab, chain);
    const elemPercent = overlayLuck.elementPercent;
    const totalsSubLuck = overlayLuck.totalsSub;

    const luckParts: string[] = [];
    luckParts.push(`${luckTab} ver.`);

    // 단일 모드에서는 대운/세운/월운 리스트를 출력하지 않음

    const normChain = {
      dae: chain?.dae ? normalizeGZ(chain.dae) : null,
      se: chain?.se ? normalizeGZ(chain.se) : null,
      wol: chain?.wol ? normalizeGZ(chain.wol) : null,
      il: chain?.il ? normalizeGZ(chain.il) : null,
    };

    const yinYangLuck = computeYinYangSummaryWithLuckWeights({
      natal,
      natalScaled: unified.natalFixed.overlay.perStemAugFull ?? unified.natalFixed.overlay.perStemAugBare,
      chain: normChain,
      weights: yinYangWeightsByTab[luckTab],
    });
    if (yinYangLuck) luckParts.push(section(`음양수치(원국 + ${luckTab})`, formatYinYangLine(yinYangLuck)));

    luckParts.push(
      section(`오행강약(원국 + ${luckTab})`, formatInlineKV(elementPercentWithTenGodLabels(elemPercent, dayEl))),
    );

    if (showTenGod) {
      const labeled = labelTenGodSubWithStems(totalsSubLuck, dayStem);
      luckParts.push(section(`십신 강약(원국 + ${luckTab})`, formatInlineKV(labeled)));
    }

    const luckGz =
      luckTab === "대운"
        ? chain?.dae
        : luckTab === "세운"
          ? chain?.se
          : luckTab === "월운"
            ? chain?.wol
            : luckTab === "일운"
              ? chain?.il
              : null;
    const luckGzNorm = luckGz ? normalizeGZ(luckGz) : "";
    if (luckGzNorm) {
      luckParts[0] = `${luckTab} ver. 간지 : ${luckGzNorm}`;
    }

    if (luckGzNorm && showTwelveUnseong) {
      const unseong = getTwelveUnseong(dayStem, luckGzNorm.charAt(1));
      luckParts.push(section(`십이운성(${luckTab})`, formatGzRows([{ pos: luckTab, gz: luckGzNorm, value: unseong }])));
    }

    if (luckGzNorm && showTwelveShinsal) {
      const shinsal = getTwelveShinsalBySettings({
        baseBranch,
        targetBranch: luckGzNorm.charAt(1),
        era: shinsalEra,
        gaehwa: shinsalGaehwa,
      });
      luckParts.push(section(`십이신살(${luckTab})`, formatGzRows([{ pos: luckTab, gz: luckGzNorm, value: shinsal }])));
    }

    if (luckGzNorm && showNabeum) {
      const info = getNabeum(luckGzNorm);
      if (info) {
        luckParts.push(section("납음오행", formatGzRows([{ pos: luckTab, gz: luckGzNorm, value: info.name }])));
      }
    }

    const relByTab = buildAllRelationTags({
      natal,
      daewoon: luckTab !== "대운" ? chain?.dae ?? undefined : undefined,
      sewoon: luckTab === "세운" || luckTab === "월운" || luckTab === "일운" ? chain?.se ?? undefined : undefined,
      wolwoon: luckTab === "월운" || luckTab === "일운" ? chain?.wol ?? undefined : undefined,
      ilwoon: luckTab === "일운" ? chain?.il ?? undefined : undefined,
    });
    luckParts.push(section(`형충회합(${luckTab})`, formatHarmonyBlock(relByTab)));

    return luckParts.filter(Boolean).join("\n\n");
  };

  if (tab !== "원국") {
    const order: BlendTab[] =
      tab === "대운"
        ? ["대운"]
        : tab === "세운"
          ? ["대운", "세운"]
          : tab === "월운"
            ? ["대운", "세운", "월운"]
            : tab === "일운"
              ? ["대운", "세운", "월운", "일운"]
              : [];

    for (const t of order) {
      const block = buildLuckBlock(t, t === tab ? unified : undefined);
      if (block) bodyParts.push(block);
    }
  }

  const body = bodyParts.filter((s) => s && s.trim().length > 0).join("\n\n");

  return { header, body, guide: "" };
}

export function buildChatPrompt(input: SinglePromptInput): string {
  const { header, body, guide } = buildChatPromptParts(input);
  return [header, body, guide].filter((v) => v && v.trim().length > 0).join("\n\n");
}
