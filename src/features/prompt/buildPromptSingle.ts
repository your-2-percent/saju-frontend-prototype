// features/AnalysisReport/buildPromptSingle.ts
import type { MyeongSik } from "@/shared/lib/storage";
import type {
  Pillars4,
  RelationTags,
} from "@/features/AnalysisReport/logic/relations";
import {
  buildHarmonyTags,
  buildAllRelationTags,
  normalizeGZ,
} from "@/features/AnalysisReport/logic/relations";
import {
  buildShinsalTags,
  type ShinsalBasis,
} from "@/features/AnalysisReport/logic/shinsal";
import {
  getTwelveUnseong,
  getTwelveShinsalBySettings,
} from "@/shared/domain/간지/twelve";
import { useSajuSettingsStore } from "@/shared/lib/hooks/useSajuSettingsStore";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import { getDaewoonList } from "../luck/daewoonList";
import type { ShinCategory } from "@/features/AnalysisReport/logic/shinStrength";
import { computeDeukFlags10 } from "@/features/AnalysisReport/utils/strength";
import type {
  LuckChain,
  UnifiedPowerResult,
} from "@/features/AnalysisReport/utils/unifiedPower";
import type { Element } from "@/features/AnalysisReport/utils/types";
import { buildTopicGuide, type MainCategoryKey, type SubCategoryKey, type RelationMode } from "./buildPrompt";

import {
  ensureSolarBirthDay,
  STEM_TO_ELEMENT,
  elementToTenGod,
  getNabeum,
} from "./promptCore";
import { makeOverlayByLuck } from "./promptOverlay";

/* ===== 포지션 라벨 ===== */
function getActivePosLabels(natal: Pillars4, ms: MyeongSik): string[] {
  if (natal[3] && natal[3] !== "") {
    const hourLabel =
      !ms.birthTime || ms.birthTime === "모름" ? "시(예측)" : "시";
    return ["연", "월", "일", hourLabel];
  }
  return ["연", "월", "일"];
}

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
};

/* ===========================
 * 공통 헬퍼 (buildChatPrompt용)
 * =========================== */

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

const pruneEmpty = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const arr = value
      .map(pruneEmpty)
      .filter((v) => {
        if (v === undefined || v === null) return false;
        if (Array.isArray(v) && v.length === 0) return false;
        if (isPlainObject(v) && Object.keys(v).length === 0) return false;
        return true;
      });

    return arr.length > 0 ? arr : undefined;
  }

  if (isPlainObject(value)) {
    const obj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) {
      const pruned = pruneEmpty(v);
      if (pruned === undefined) continue;
      if (Array.isArray(pruned) && pruned.length === 0) continue;
      if (isPlainObject(pruned) && Object.keys(pruned).length === 0) continue;
      obj[k] = pruned;
    }
    return Object.keys(obj).length > 0 ? obj : undefined;
  }

  if (value === undefined || value === null) return undefined;
  return value;
};

const formatJsonForPrompt = (raw: unknown): string => {
  const cleaned = pruneEmpty(raw);
  if (cleaned === undefined) return "";

  if (
    typeof cleaned === "string" ||
    typeof cleaned === "number" ||
    typeof cleaned === "boolean"
  ) {
    return String(cleaned);
  }

  return ["```json", JSON.stringify(cleaned, null, 2), "```"].join("\n");
};

const section = (title: string, raw: unknown): string => {
  const formatted = formatJsonForPrompt(raw);
  if (!formatted) return "";
  return `## ${title}\n${formatted}`;
};

/* ─────────────────────────────────────────────
 * 단일 탭용 프롬프트 (원국/대운/세운/월운/일운)
 * ──────────────────────────────────────────── */

export function buildChatPrompt(input: SinglePromptInput): string {
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
    teacherMode
  } = input;

  const natal: Pillars4 = [
    normalizeGZ(natalRaw[0] ?? ""),
    normalizeGZ(natalRaw[1] ?? ""),
    normalizeGZ(natalRaw[2] ?? ""),
    normalizeGZ(natalRaw[3] ?? ""),
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
    wolwoon:
      tab === "월운" || tab === "일운" ? chain?.wol ?? undefined : undefined,
    ilwoon: tab === "일운" ? chain?.il ?? undefined : undefined,
  });

  const sinsalWithLuck = buildShinsalTags({
    natal,
    daewoon: tab !== "원국" ? chain?.dae ?? undefined : undefined,
    sewoon:
      tab === "세운" || tab === "월운" || tab === "일운"
        ? chain?.se ?? undefined
        : undefined,
    wolwoon:
      tab === "월운" || tab === "일운" ? chain?.wol ?? undefined : undefined,
    ilwoon: tab === "일운" ? chain?.il ?? undefined : undefined,
  });

  // 십이신살(설정 반영)
  const { shinsalEra, shinsalGaehwa, shinsalBase } =
    useSajuSettingsStore.getState();
  const baseBranch =
    shinsalBase === "연지"
      ? natal[0]?.charAt(1) ?? ""
      : natal[2]?.charAt(1) ?? "";

  // 오버레이
  const overlay = makeOverlayByLuck(unified, tab, chain);
  const elemPercentObj = overlay.elementPercent;
  const totalsSub = overlay.totalsSub;

  // 신강도/득령·득지·득세
  const { flags: deukFlags0 } = computeDeukFlags10(
    natal,
    unified.elementScoreRaw,
  );
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

  const isUnknownTime = !ms.birthTime || ms.birthTime === "모름";

  function formatBirth(inner: MyeongSik): string {
    const ensured = ensureSolarBirthDay(inner);
    const rawDay = ensured.birthDay ?? "";
    const year = rawDay.slice(0, 4);
    const month = rawDay.slice(4, 6);
    const day = rawDay.slice(6, 8);
    let correctedTime = "";
    if (inner.corrected instanceof Date && !isNaN(inner.corrected.getTime())) {
      const hh = String(inner.corrected.getHours()).padStart(2, "0");
      const mm = String(inner.corrected.getMinutes()).padStart(2, "0");
      correctedTime = isUnknownTime ? "모름" : `${hh}:${mm}`;
    }
    return `${year}년 ${month}월 ${day}일 보정시 ${correctedTime}`;
  }

  function formatLuckChain(tab: BlendTab, chain?: LuckChain): string {
    if (!chain) return "(없음)";
    const parts: string[] = [];
    if (tab === "대운" || tab === "세운" || tab === "월운" || tab === "일운") {
      if (chain.dae) parts.push(`대운:${normalizeGZ(chain.dae)}`);
    }
    if (tab === "세운" || tab === "월운" || tab === "일운") {
      if (chain.se) parts.push(`세운:${normalizeGZ(chain.se)}`);
    }
    if (tab === "월운" || tab === "일운") {
      if (chain.wol) parts.push(`월운:${normalizeGZ(chain.wol)}`);
    }
    if (tab === "일운") {
      if (chain.il) parts.push(`일운:${normalizeGZ(chain.il)}`);
    }
    return parts.length > 0 ? parts.join(" / ") : "(없음)";
  }

  const posLabels = getActivePosLabels(natal, ms);
  const dayStem = unified.dayStem; // ex) "정"
  const dayEl = STEM_TO_ELEMENT[dayStem as keyof typeof STEM_TO_ELEMENT];

  const header = [
    `📌 명식: ${ms.name ?? "이름없음"} (${formatBirth(ms)}) 성별: ${
      ms.gender
    }`,
    `원국 ${natal[0]}년 ${natal[1]}월 ${natal[2]}일` +
      (natal[3]
        ? ` ${natal[3]}시${
            !ms.birthTime || ms.birthTime === "모름" ? "(시주예측)" : ""
          }`
        : ""),
    `운: ${formatLuckChain(tab, chain)}`,
  ].join("\n");

  const bodyParts: string[] = [];

  // 대운 리스트
  bodyParts.push(section("대운 리스트 (10개)", daeList));

  // 신강도
  bodyParts.push(section("신강도", shinLine));

  // 오행강약(원국 고정)
  bodyParts.push(
    section(
      "오행강약(퍼센트·원국 기준 고정)",
      Object.fromEntries(
        Object.entries(unified.natalFixed.elementPercent100).map(
          ([el, val]) => [
            `${el}(${elementToTenGod(dayEl, el as Element)})`,
            val,
          ],
        ),
      ),
    ),
  );

  // 오행강약(현재 탭 기준) — 원국 탭이 아니면만 출력
  if (tab !== "원국") {
    bodyParts.push(
      section(
        `오행강약(퍼센트·탭=${tab})`,
        Object.fromEntries(
          Object.entries(elemPercentObj).map(([el, val]) => [
            `${el}(${elementToTenGod(dayEl, el as Element)})`,
            val,
          ]),
        ),
      ),
    );
  }

  // 십신 강약(원국 고정)
  bodyParts.push(
    section(
      "십신 강약(소분류 10개·원국·합계 100)",
      unified.natalFixed.totalsSub,
    ),
  );

  // 십신 강약(현재 탭 기준) — 원국 탭이 아니면만 출력
  if (tab !== "원국") {
    bodyParts.push(
      section(
        `십신 강약(소분류 10개·탭=${tab}·합계 100)`,
        totalsSub,
      ),
    );
  }

  // 십이운성(원국+운 반영)
  bodyParts.push(
    section(
      "십이운성(원국+운 반영)",
      tab === "원국"
        ? natal
            .map((gz, i) => {
              if (!gz || i >= posLabels.length) return null;
              return {
                pos: posLabels[i],
                gz,
                unseong: getTwelveUnseong(
                  natal[2]?.charAt(0) ?? "",
                  gz.charAt(1),
                ),
              };
            })
            .filter(Boolean)
        : [
            ...natal
              .map((gz, i) => {
                if (!gz || i >= posLabels.length) return null;
                return {
                  pos: posLabels[i],
                  gz,
                  unseong: getTwelveUnseong(
                    natal[2]?.charAt(0) ?? "",
                    gz.charAt(1),
                  ),
                };
              })
              .filter(Boolean),
            ...(chain?.dae
              ? [
                  {
                    pos: "대운",
                    gz: chain.dae,
                    unseong: getTwelveUnseong(
                      natal[2]?.charAt(0) ?? "",
                      chain.dae.charAt(1),
                    ),
                  },
                ]
              : []),
            ...((tab === "세운" || tab === "월운" || tab === "일운") &&
            chain?.se
              ? [
                  {
                    pos: "세운",
                    gz: chain.se,
                    unseong: getTwelveUnseong(
                      natal[2]?.charAt(0) ?? "",
                      chain.se.charAt(1),
                    ),
                  },
                ]
              : []),
            ...((tab === "월운" || tab === "일운") && chain?.wol
              ? [
                  {
                    pos: "월운",
                    gz: chain.wol,
                    unseong: getTwelveUnseong(
                      natal[2]?.charAt(0) ?? "",
                      chain.wol.charAt(1),
                    ),
                  },
                ]
              : []),
            ...(tab === "일운" && chain?.il
              ? [
                  {
                    pos: "일운",
                    gz: chain.il,
                    unseong: getTwelveUnseong(
                      natal[2]?.charAt(0) ?? "",
                      chain.il.charAt(1),
                    ),
                  },
                ]
              : []),
          ].filter(Boolean),
    ),
  );

  // 십이신살(원국+운 반영·설정 적용)
  bodyParts.push(
    section(
      "십이신살(원국+운 반영·설정 적용)",
      tab === "원국"
        ? natal
            .map((gz, i) => {
              if (!gz || i >= posLabels.length) return null;
              return {
                pos: posLabels[i],
                gz,
                shinsal: getTwelveShinsalBySettings({
                  baseBranch,
                  targetBranch: gz.charAt(1),
                  era: shinsalEra,
                  gaehwa: shinsalGaehwa,
                }),
              };
            })
            .filter(Boolean)
        : [
            ...natal
              .map((gz, i) => {
                if (!gz || i >= posLabels.length) return null;
                return {
                  pos: posLabels[i],
                  gz,
                  shinsal: getTwelveShinsalBySettings({
                    baseBranch,
                    targetBranch: gz.charAt(1),
                    era: shinsalEra,
                    gaehwa: shinsalGaehwa,
                  }),
                };
              })
              .filter(Boolean),
            ...(chain?.dae
              ? [
                  {
                    pos: "대운",
                    gz: chain.dae,
                    shinsal: getTwelveShinsalBySettings({
                      baseBranch,
                      targetBranch: chain.dae.charAt(1),
                      era: shinsalEra,
                      gaehwa: shinsalGaehwa,
                    }),
                  },
                ]
              : []),
            ...((tab === "세운" || tab === "월운" || tab === "일운") &&
            chain?.se
              ? [
                  {
                    pos: "세운",
                    gz: chain.se,
                    shinsal: getTwelveShinsalBySettings({
                      baseBranch,
                      targetBranch: chain.se.charAt(1),
                      era: shinsalEra,
                      gaehwa: shinsalGaehwa,
                    }),
                  },
                ]
              : []),
            ...((tab === "월운" || tab === "일운") && chain?.wol
              ? [
                  {
                    pos: "월운",
                    gz: chain.wol,
                    shinsal: getTwelveShinsalBySettings({
                      baseBranch,
                      targetBranch: chain.wol.charAt(1),
                      era: shinsalEra,
                      gaehwa: shinsalGaehwa,
                    }),
                  },
                ]
              : []),
            ...(tab === "일운" && chain?.il
              ? [
                  {
                    pos: "일운",
                    gz: chain.il,
                    shinsal: getTwelveShinsalBySettings({
                      baseBranch,
                      targetBranch: chain.il.charAt(1),
                      era: shinsalEra,
                      gaehwa: shinsalGaehwa,
                    }),
                  },
                ]
              : []),
          ].filter(Boolean),
    ),
  );

  // 납음오행(원국+운 반영)
  bodyParts.push(
    section(
      "납음오행(원국+운 반영)",
      tab === "원국"
        ? natal
            .map((gz, i) => {
              if (!gz || i >= posLabels.length) return null;
              const info = getNabeum(gz);
              return info
                ? {
                    pos: posLabels[i],
                    gz,
                    nabeum: info.name,
                    element: info.element,
                    code: info.code,
                  }
                : { pos: posLabels[i], gz, nabeum: null };
            })
            .filter(Boolean)
        : [
            ...natal
              .map((gz, i) => {
                if (!gz || i >= posLabels.length) return null;
                const info = getNabeum(gz);
                return info
                  ? {
                      pos: posLabels[i],
                      gz,
                      nabeum: info.name,
                      element: info.element,
                      code: info.code,
                    }
                  : { pos: posLabels[i], gz, nabeum: null };
              })
              .filter(Boolean),
            ...(chain?.dae
              ? (() => {
                  const info = getNabeum(chain.dae);
                  return info
                    ? [
                        {
                          pos: "대운",
                          gz: chain.dae,
                          nabeum: info.name,
                          element: info.element,
                          code: info.code,
                        },
                      ]
                    : [];
                })()
              : []),
            ...(((tab === "세운" || tab === "월운" || tab === "일운") &&
              chain?.se)
              ? (() => {
                  const info = getNabeum(chain.se!);
                  return info
                    ? [
                        {
                          pos: "세운",
                          gz: chain.se!,
                          nabeum: info.name,
                          element: info.element,
                          code: info.code,
                        },
                      ]
                    : [];
                })()
              : []),
            ...(((tab === "월운" || tab === "일운") && chain?.wol)
              ? (() => {
                  const info = getNabeum(chain.wol!);
                  return info
                    ? [
                        {
                          pos: "월운",
                          gz: chain.wol!,
                          nabeum: info.name,
                          element: info.element,
                          code: info.code,
                        },
                      ]
                    : [];
                })()
              : []),
            ...((tab === "일운" && chain?.il)
              ? (() => {
                  const info = getNabeum(chain.il!);
                  return info
                    ? [
                        {
                          pos: "일운",
                          gz: chain.il!,
                          nabeum: info.name,
                          element: info.element,
                          code: info.code,
                        },
                      ]
                    : [];
                })()
              : []),
          ].filter(Boolean),
    ),
  );

  // 형충회합(원국)
  bodyParts.push(
    section(
      "형충회합(원국)",
      buildHarmonyTags(
        natal.filter((_, i) => i < posLabels.length) as Pillars4,
      ),
    ),
  );

  // 형충회합(운 포함: 탭 연동)
  bodyParts.push(section("형충회합(운 포함: 탭 연동)", relWithLuck));

  // 신살(원국 / 운 포함)
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
      section("신살(원국 전용)", {
        good: baseShinsal.good,
        bad: baseShinsal.bad,
        meta: baseShinsal.meta,
      }),
    );
  } else {
    bodyParts.push(
      section(`신살(운 포함·탭=${tab})`, sinsalWithLuck),
    );
  }

  const body = bodyParts
    .filter((s) => s && s.trim().length > 0)
    .join("\n\n");

  const topicGuide = buildTopicGuide({
    topic,
    subTopic,
    timeMode: "single",
    tab,
    relationMode,
    teacherMode,          // 🔥 추가
  });

  const guideParts: string[] = [
    "-----",
    "🧭 해석 가이드",
    "",
    "1. 위 데이터는 사주 원국과 현재 선택된 탭(원국/대운/세운/월운/일운)의 수치·태그 정보다.",
    "2. 해석 시, 원국 → 선택 탭 순서로 변화 포인트를 요약한다.",
  ];

  if (topicGuide) {
    guideParts.push(
      "",
      "🎯 질문 포커스(카테고리 반영)",
      topicGuide,
    );
  }

  const guide = guideParts.join("\n");

  return [header, body, guide].join("\n\n");
}
