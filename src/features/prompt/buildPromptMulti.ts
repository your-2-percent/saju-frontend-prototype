// features/AnalysisReport/buildPromptMulti.ts
import type { MyeongSik } from "@/shared/lib/storage";
import type { Pillars4 } from "@/features/AnalysisReport/logic/relations";
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
import type { ShinCategory } from "@/features/AnalysisReport/logic/shinStrength";
import { computeDeukFlags10 } from "@/features/AnalysisReport/utils/strength";
import type {
  LuckChain,
  UnifiedPowerResult,
} from "@/features/AnalysisReport/utils/unifiedPower";
import type { Element } from "@/features/AnalysisReport/utils/types";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import type { DayBoundaryRule } from "@/shared/type";

import {
  ensureSolarBirthDay,
  STEM_TO_ELEMENT,
  elementToTenGod,
  getNabeum,
} from "./promptCore";
import { makeOverlayByLuck } from "./promptOverlay";
import { buildTopicGuide, type MainCategoryKey, type SubCategoryKey, type TimeMode, type RelationMode } from "./buildPrompt";

/* ===== 포지션 라벨 ===== */
function getActivePosLabels(natal: Pillars4, ms: MyeongSik): string[] {
  if (natal[3] && natal[3] !== "") {
    const hourLabel =
      !ms.birthTime || ms.birthTime === "모름" ? "시(예측)" : "시";
    return ["연", "월", "일", hourLabel];
  }
  return ["연", "월", "일"];
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);

/* ─────────────────────────────────────────────
 * 여기서부터 Multi-Luck (대운/세운/월운/일운 한 번에)
 * ──────────────────────────────────────────── */

export type DaewoonInfo = {
  gz: string;
  age: number;
  startYear: number;
  startMonth: number;
  startDay: number;
  endYear: number;
};

// 🔥 사주 해석 톤 프리셋
type ToneKey =
  | "analysis"
  | "teacher"
  | "mentor"
  | "speed"
  | "dryHumor"
  | "softWarm"
  | "pro"

type MultiPromptInput = {
  ms: MyeongSik;
  natal: Pillars4;
  basis?: ShinsalBasis;
  includeTenGod?: boolean;
  unified: UnifiedPowerResult;
  percent: number;
  category: ShinCategory;

  selectedDaeList: DaewoonInfo[];
  daeList: DaewoonInfo[];
  seYears: number[];
  wolMonths: string[];
  ilDays: string[];

  topic?: MainCategoryKey;
  subTopic?: SubCategoryKey;
  timeMode?: TimeMode;

  // 추가 👇
  relationMode?: RelationMode;
  partnerMs?: MyeongSik | null;

  // 🔥 추가
  tone?: ToneKey;
  friendMode?: boolean;
};

function getDaeStartDate(d: DaewoonInfo): Date {
  return new Date(d.startYear, (d.startMonth ?? 1) - 1, d.startDay ?? 1);
}

function getDaeEndDate(list: DaewoonInfo[], idx: number): Date {
  const cur = list[idx];
  const next = list[idx + 1];

  // 다음 대운 시작 시점까지 현재 대운 유효
  if (next) {
    return getDaeStartDate(next);
  }

  // 마지막 대운: endYear 끝까지라고 보고 +1년 지점까지
  return new Date(cur.endYear + 1, 0, 1);
}

function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart < bEnd && aEnd > bStart; // 반열린 구간
}

/**
 * 주어진 "연도 구간"과 겹치는 모든 대운 반환
 * 예: 2019~2026을 넣으면, 이 구간에 걸친 대운이 2개면 2개 다 나옴
 */
function findDaeForYearRangeMulti(
  daeList: DaewoonInfo[],
  startYear: number,
  endYear: number,
): DaewoonInfo[] {
  const rangeStart = new Date(startYear, 0, 1);
  const rangeEnd = new Date(endYear + 1, 0, 1); // endYear까지 포함

  const results: DaewoonInfo[] = [];

  for (let i = 0; i < daeList.length; i++) {
    const d = daeList[i];
    const ds = getDaeStartDate(d);
    const de = getDaeEndDate(daeList, i);

    if (overlaps(ds, de, rangeStart, rangeEnd)) {
      if (!results.some((r) => r.gz === d.gz && r.startYear === d.startYear)) {
        results.push(d);
      }
    }
  }

  return results;
}

/** "특정 연도 하나"에 걸치는 대운들 (연단위 세운용) */
function findDaeForYearMulti(
  daeList: DaewoonInfo[],
  year: number,
): DaewoonInfo[] {
  return findDaeForYearRangeMulti(daeList, year, year);
}

function findDaeForMonthMulti(
  daeList: DaewoonInfo[],
  year: number,
  month: number,
): DaewoonInfo[] {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1); // 다음달 1일

  const results: DaewoonInfo[] = [];

  for (let i = 0; i < daeList.length; i++) {
    const d = daeList[i];
    const ds = getDaeStartDate(d);
    const de = getDaeEndDate(daeList, i);

    if (overlaps(ds, de, monthStart, monthEnd)) {
      if (!results.some((r) => r.gz === d.gz && r.startYear === d.startYear)) {
        results.push(d);
      }
    }
  }

  return results;
}

/**
 * 입춘 날짜 (간단 절기 계산, 정확한 절기 함수 있으면 그걸로 대체해도 됨)
 */
function getIpchunDate(year: number): Date {
  const solarYearMs = 31556925974.7; // 평균 태양년 ms
  const base = Date.UTC(1900, 1, 4, 7, 15, 0); // 1900-02-04 07:15(UTC) 기준
  const termIndex = 3; // 입춘

  const ms =
    base +
    (year - 1900) * solarYearMs +
    (termIndex * solarYearMs) / 24;

  const utc = new Date(ms);
  return new Date(utc.getTime() + 9 * 60 * 60 * 1000); // KST(+9)
}

/**
 * 월운용 세운 찾기 - 입춘/12월 교운기까지 포함
 */
function findSeForMonthMulti(year: number, month: number): string[] {
  const results: string[] = [];

  const monthStart = new Date(year, month - 1, 15, 0, 0, 0);
  const monthEnd = new Date(year, month, 1, 15, 0, 0);

  const ipchun = getIpchunDate(year);

  const prevGZ = getYearGanZhi(new Date(year - 1, 5, 15));
  const curGZ = getYearGanZhi(new Date(year, 5, 15));
  const nextGZ = getYearGanZhi(new Date(year + 1, 5, 15));

  // 1) 입춘 기준 세운
  if (monthEnd <= ipchun) {
    // 월 전체가 입춘 이전 (보통 1월)
    if (prevGZ) {
      results.push(normalizeGZ(prevGZ));
    }
  } else if (monthStart >= ipchun) {
    // 월 전체가 입춘 이후 (3~11월, 입춘 지난 2월 일부 포함)
    if (curGZ) {
      results.push(normalizeGZ(curGZ));
    }
  } else {
    // 이 월 안에 입춘이 끼어 있음 (보통 2월)
    if (prevGZ) {
      results.push(normalizeGZ(prevGZ));
    }
    if (curGZ) {
      const norm = normalizeGZ(curGZ);
      if (!results.includes(norm)) {
        results.push(norm);
      }
    }
  }

  // 2) 12월 → 다음 해 세운까지 미리 포함
  if (month === 12 && nextGZ) {
    const norm = normalizeGZ(nextGZ);
    if (!results.includes(norm)) {
      results.push(norm);
    }
  }

  return results;
}

function resolveSeYear(year: number, month: number): number[] {
  const ipchun = getIpchunDate(year);
  const monthStart = new Date(year, month - 1, 1);

  const years: number[] = [];

  // 1) 입춘 이전 → 전년도 세운
  if (monthStart < ipchun) {
    years.push(year - 1);
  }

  // 2) 입춘 이후 → 당해년도 세운
  if (monthStart >= ipchun) {
    years.push(year);
  }

  // 3) 12월은 다음년도 세운 포함
  if (month === 12) {
    years.push(year + 1);
  }

  return years;
}

/* =========================
 * Multi-luck용 헬퍼
 * ========================= */

type ShinsalResult = ReturnType<typeof buildShinsalTags>;
type ShinsalScope = "대운" | "세운" | "월운" | "일운";

type ShinsalGoodBad = {
  good?: ShinsalResult["good"];
  bad?: ShinsalResult["bad"];
};

const filterShinsalByScope = (
  raw: ShinsalResult | null | undefined,
  scope: ShinsalScope,
): ShinsalGoodBad => {
  if (!raw) return {};

  const targetWord = scope;

  const filterGroup = (
    group: ShinsalResult["good"] | undefined,
  ): ShinsalResult["good"] | undefined => {
    if (!group) return undefined;

    const filtered: Partial<ShinsalResult["good"]> = {};

    for (const [key, arr] of Object.entries(group) as [
      keyof ShinsalResult["good"],
      string[],
    ][]) {
      if (!Array.isArray(arr)) continue;

      const next = arr.filter(
        (tag) => typeof tag === "string" && tag.includes(targetWord),
      );

      if (next.length > 0) {
        filtered[key] = next;
      }
    }

    if (Object.keys(filtered).length === 0) return undefined;
    return filtered as ShinsalResult["good"];
  };

  const good = filterGroup(raw.good);
  const bad = filterGroup(raw.bad);

  const result: ShinsalGoodBad = {};
  if (good) result.good = good;
  if (bad) result.bad = bad;

  return result;
};

function pruneEmptyDeep<T>(value: T): T | undefined {
  if (value === null || value === undefined) return undefined;

  if (Array.isArray(value)) {
    const next = value
      .map((v) => pruneEmptyDeep(v))
      .filter((v) => v !== undefined) as unknown[];

    return (next.length > 0 ? (next as T) : undefined) as T | undefined;
  }

  if (isPlainObject(value)) {
    const next: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(value)) {
      const cleaned = pruneEmptyDeep(v as unknown);
      if (cleaned !== undefined) {
        next[k] = cleaned;
      }
    }

    return (Object.keys(next).length > 0 ? (next as T) : undefined) as
      | T
      | undefined;
  }

  return value;
}

const formatJsonForPromptPlain = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value, null, 2);
};

const sectionPlain = (title: string, raw: unknown): string => {
  const cleaned = pruneEmptyDeep(raw);
  if (cleaned === undefined) return "";

  const body = formatJsonForPromptPlain(cleaned);
  if (!body.trim()) return "";

  return `## ${title}\n${body}`;
};

const filterHarmonyTagsByScope = (
  rel: unknown,
  scope: "대운" | "세운" | "월운" | "일운",
) => {
  const result: Record<string, string[]> = {};

  if (!rel || typeof rel !== "object") return result;

  for (const [key, value] of Object.entries(rel)) {
    if (!Array.isArray(value)) continue;

    const filtered = Array.from(
      new Set(
        value.filter(
          (tag) => typeof tag === "string" && tag.includes(scope),
        ),
      ),
    );

    if (filtered.length > 0) {
      result[key] = filtered;
    }
  }

  return result;
};

/* ─────────────────────────────────────────────
 * Multi-luck 프롬프트 빌더
 * ──────────────────────────────────────────── */
export function buildMultiLuckPrompt(input: MultiPromptInput): string {
  const {
    ms,
    natal: natalRaw,
    basis,
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
    tone
  } = input;

  const natal: Pillars4 = [
    normalizeGZ(natalRaw[0] ?? ""),
    normalizeGZ(natalRaw[1] ?? ""),
    normalizeGZ(natalRaw[2] ?? ""),
    normalizeGZ(natalRaw[3] ?? ""),
  ];

  const isUnknownTime = !ms.birthTime || ms.birthTime === "모름";
  const posLabels = getActivePosLabels(natal, ms);
  const dayStem = unified.dayStem;
  const dayEl = STEM_TO_ELEMENT[dayStem as keyof typeof STEM_TO_ELEMENT];

  const { shinsalEra, shinsalGaehwa, shinsalBase } =
    useSajuSettingsStore.getState();
  const baseBranch =
    shinsalBase === "연지"
      ? natal[0]?.charAt(1) ?? ""
      : natal[2]?.charAt(1) ?? "";

  // 신강도
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
  ].join("\n");

  const sections: string[] = [];

  // 1) 원국 고정 섹션

  // 신강도
  sections.push(sectionPlain("신강도", shinLine));

  // 오행강약(원국)
  sections.push(
    sectionPlain(
      "오행강약(원국)",
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

  // 십신 강약(원국)
  sections.push(
    sectionPlain(
      "십신 강약(소분류 10개·원국·합계 100)",
      unified.natalFixed.totalsSub,
    ),
  );

  // 형충회합(원국)
  sections.push(
    sectionPlain(
      "형충회합(원국)",
      buildHarmonyTags(
        natal.filter((_, i) => i < posLabels.length) as Pillars4,
      ),
    ),
  );

  // 신살(원국)
  const shinsalNatal = buildShinsalTags({
    natal,
    daewoon: null,
    sewoon: null,
    wolwoon: null,
    ilwoon: null,
    basis,
  });

  sections.push(
    sectionPlain("신살(원국)", {
      good: shinsalNatal.good,
      bad: shinsalNatal.bad,
      meta: shinsalNatal.meta,
    }),
  );

  // 납음오행(원국)
  sections.push(
    sectionPlain(
      "납음오행(원국)",
      natal
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
    ),
  );

  // 십이운성(원국)
  sections.push(
    sectionPlain(
      "십이운성(원국)",
      natal
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
    ),
  );

  // 십이신살(원국)
  sections.push(
    sectionPlain(
      "십이신살(원국)",
      natal
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
    ),
  );

  // 2) 대운 개별 섹션 (선택된 리스트)

  if (daeList.length > 0) {
    for (const dae of selectedDaeList) {
      const chain: LuckChain = { dae: dae.gz, se: null, wol: null, il: null };
      const overlay = makeOverlayByLuck(unified, "대운", chain);

      const relWithDae = buildAllRelationTags({
        natal,
        daewoon: dae.gz,
        sewoon: undefined,
        wolwoon: undefined,
        ilwoon: undefined,
      });

      const shinsalWithDae = buildShinsalTags({
        natal,
        daewoon: dae.gz,
        sewoon: undefined,
        wolwoon: undefined,
        ilwoon: undefined,
        basis,
      });

      const daeNabeum = getNabeum(dae.gz);
      const daeUnseong = getTwelveUnseong(
        natal[2]?.charAt(0) ?? "",
        dae.gz.charAt(1),
      );
      const daeShinsal = getTwelveShinsalBySettings({
        baseBranch,
        targetBranch: dae.gz.charAt(1),
        era: shinsalEra,
        gaehwa: shinsalGaehwa,
      });

      sections.push(
        sectionPlain(`${dae.age}대운 ${dae.gz} (${dae.startYear}~${dae.endYear})`, {
          오행강약: Object.fromEntries(
            Object.entries(overlay.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: overlay.totalsSub,
          형충회합: relWithDae,
          신살: filterShinsalByScope(shinsalWithDae, "대운"),
          납음오행: daeNabeum
            ? {
                gz: dae.gz,
                nabeum: daeNabeum.name,
                element: daeNabeum.element,
                code: daeNabeum.code,
              }
            : null,
          십이운성: { pos: "대운", gz: dae.gz, unseong: daeUnseong },
          십이신살: { pos: "대운", gz: dae.gz, shinsal: daeShinsal },
        }),
      );
    }
  }

  // 3) 세운 탭 섹션

  if (seYears.length > 0) {
    const rangeStartYear = seYears[0];
    const rangeEndYear = seYears[seYears.length - 1];

    const daesForRange = findDaeForYearRangeMulti(
      daeList,
      rangeStartYear,
      rangeEndYear,
    );

    // (3-1) 세운 탭 상단: 대운 요약
    if (daesForRange.length > 0) {
      const refYear = rangeStartYear;
      const seGZRef = getYearGanZhi(new Date(refYear, 5, 15));
      const seNormRef = normalizeGZ(seGZRef || "");

      const daeSectionData = {
        대운: daesForRange.map((daa) => {
          const daeChain: LuckChain = {
            dae: daa.gz,
            se: seNormRef || null,
            wol: null,
            il: null,
          };

          const daeOverlay = makeOverlayByLuck(unified, "대운", daeChain);
          const relWithDae = buildAllRelationTags({
            natal,
            daewoon: daa.gz,
            sewoon: seNormRef || undefined,
            wolwoon: undefined,
            ilwoon: undefined,
          });
          const shinsalWithDae = buildShinsalTags({
            natal,
            daewoon: daa.gz,
            sewoon: seNormRef || undefined,
            wolwoon: undefined,
            ilwoon: undefined,
            basis,
          });

          const daeNabeum = getNabeum(daa.gz);
          const daeUnseong = getTwelveUnseong(
            natal[2]?.charAt(0) ?? "",
            daa.gz.charAt(1),
          );
          const daeShinsal12 = getTwelveShinsalBySettings({
            baseBranch,
            targetBranch: daa.gz.charAt(1),
            era: shinsalEra,
            gaehwa: shinsalGaehwa,
          });

          return {
            기본정보: `${daa.age}대운 ${daa.gz} (${daa.startYear}~${daa.endYear})`,
            간지: daa.gz,
            오행강약: Object.fromEntries(
              Object.entries(daeOverlay.elementPercent).map(
                ([el, val]) => [
                  `${el}(${elementToTenGod(dayEl, el as Element)})`,
                  val,
                ],
              ),
            ),
            십신강약: daeOverlay.totalsSub,
            형충회합: filterHarmonyTagsByScope(relWithDae, "대운"),
            신살: filterShinsalByScope(shinsalWithDae, "대운"),
            납음오행: daeNabeum
              ? {
                  gz: daa.gz,
                  nabeum: daeNabeum.name,
                  element: daeNabeum.element,
                  code: daeNabeum.code,
                }
              : null,
            십이운성: { pos: "대운", gz: daa.gz, unseong: daeUnseong },
            십이신살: {
              pos: "대운",
              gz: daa.gz,
              shinsal: daeShinsal12,
            },
          };
        }),
      };

      sections.push(sectionPlain("대운", daeSectionData));
    }

    // (3-2) 세운 연도별 리스트
    for (const year of seYears) {
      const seGZ = getYearGanZhi(new Date(year, 5, 15));
      const daesAtYear = findDaeForYearMulti(daeList, year);
      const mainDaeForYear = daesAtYear.length > 0 ? daesAtYear[0] : null;

      const chain: LuckChain = {
        dae: mainDaeForYear ? mainDaeForYear.gz : null,
        se: normalizeGZ(seGZ || ""),
        wol: null,
        il: null,
      };

      const overlay = makeOverlayByLuck(unified, "세운", chain);
      const relWithSe = buildAllRelationTags({
        natal,
        daewoon: mainDaeForYear?.gz,
        sewoon: normalizeGZ(seGZ || ""),
        wolwoon: undefined,
        ilwoon: undefined,
      });
      const shinsalWithSe = buildShinsalTags({
        natal,
        daewoon: mainDaeForYear?.gz,
        sewoon: normalizeGZ(seGZ || ""),
        wolwoon: undefined,
        ilwoon: undefined,
        basis,
      });

      const seNabeum = getNabeum(normalizeGZ(seGZ || ""));
      const seUnseong = getTwelveUnseong(
        natal[2]?.charAt(0) ?? "",
        (seGZ || "").charAt(1),
      );
      const seShinsal = getTwelveShinsalBySettings({
        baseBranch,
        targetBranch: (seGZ || "").charAt(1),
        era: shinsalEra,
        gaehwa: shinsalGaehwa,
      });

      const sectionData: Record<string, unknown> = {
        세운: {
          기본정보: `${year}년 ${normalizeGZ(seGZ || "")}`,
          간지: normalizeGZ(seGZ || ""),
          오행강약: Object.fromEntries(
            Object.entries(overlay.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: overlay.totalsSub,
          형충회합: filterHarmonyTagsByScope(relWithSe, "세운"),
          신살: filterShinsalByScope(shinsalWithSe, "세운"),
          납음오행: seNabeum
            ? {
                gz: normalizeGZ(seGZ || ""),
                nabeum: seNabeum.name,
                element: seNabeum.element,
                code: seNabeum.code,
              }
            : null,
          십이운성: {
            pos: "세운",
            gz: normalizeGZ(seGZ || ""),
            unseong: seUnseong,
          },
          십이신살: {
            pos: "세운",
            gz: normalizeGZ(seGZ || ""),
            shinsal: seShinsal,
          },
        },
      };

      sections.push(sectionPlain(`세운 ${year}`, sectionData));
    }
  }

  // 4) 월운 탭 섹션

  if (wolMonths.length > 0) {
    const daeUnion: DaewoonInfo[] = [];
    const seRepMap = new Map<string, { year: number; month: number }>();

    for (const ym of wolMonths) {
      const [y, m] = ym.split("-").map(Number);

      const daes = findDaeForMonthMulti(daeList, y, m);
      daes.forEach((d) => {
        if (!daeUnion.some((x) => x.gz === d.gz && x.startYear === d.startYear)) {
          daeUnion.push(d);
        }
      });

      const seYearsArr = resolveSeYear(y, m);
      const ses = findSeForMonthMulti(y, m);

      ses.forEach((se, idx) => {
        const seYear = seYearsArr[idx] ?? seYearsArr[seYearsArr.length - 1];
        if (!seRepMap.has(se)) {
          seRepMap.set(se, { year: seYear, month: m });
        }
      });
    }

    const [refYear] = wolMonths[0].split("-").map(Number);
    const seGZRef = getYearGanZhi(new Date(refYear, 5, 15));
    const seNormRef = normalizeGZ(seGZRef || "");

    // (4-1) 월운 탭 상단: 대운 요약
    if (daeUnion.length > 0) {
      const daeSectionData = {
        대운: daeUnion.map((daa) => {
          const daeChain: LuckChain = {
            dae: daa.gz,
            se: seNormRef || null,
            wol: null,
            il: null,
          };

          const daeOverlay = makeOverlayByLuck(unified, "대운", daeChain);
          const relWithDae = buildAllRelationTags({
            natal,
            daewoon: daa.gz,
            sewoon: seNormRef || undefined,
            wolwoon: undefined,
            ilwoon: undefined,
          });
          const shinsalWithDae = buildShinsalTags({
            natal,
            daewoon: daa.gz,
            sewoon: seNormRef || undefined,
            wolwoon: undefined,
            ilwoon: undefined,
            basis,
          });

          const daeNabeum = getNabeum(daa.gz);
          const daeUnseong = getTwelveUnseong(
            natal[2]?.charAt(0) ?? "",
            daa.gz.charAt(1),
          );
          const daeShinsal12 = getTwelveShinsalBySettings({
            baseBranch,
            targetBranch: daa.gz.charAt(1),
            era: shinsalEra,
            gaehwa: shinsalGaehwa,
          });

          return {
            기본정보: `${daa.age}대운 ${daa.gz} (${daa.startYear}~${daa.endYear})`,
            간지: daa.gz,
            오행강약: Object.fromEntries(
              Object.entries(daeOverlay.elementPercent).map(
                ([el, val]) => [
                  `${el}(${elementToTenGod(dayEl, el as Element)})`,
                  val,
                ],
              ),
            ),
            십신강약: daeOverlay.totalsSub,
            형충회합: filterHarmonyTagsByScope(relWithDae, "대운"),
            신살: filterShinsalByScope(shinsalWithDae, "대운"),
            납음오행: daeNabeum
              ? {
                  gz: daa.gz,
                  nabeum: daeNabeum.name,
                  element: daeNabeum.element,
                  code: daeNabeum.code,
                }
              : null,
            십이운성: {
              pos: "대운",
              gz: daa.gz,
              unseong: daeUnseong,
            },
            십이신살: {
              pos: "대운",
              gz: daa.gz,
              shinsal: daeShinsal12,
            },
          };
        }),
      };

      sections.push(sectionPlain("대운", daeSectionData));
    }

    // (4-2) 월운 탭 상단: 세운 요약
    const seKeys = Array.from(seRepMap.keys());
    if (seKeys.length > 0) {
      const seSectionData = {
        세운: seKeys.map((se) => {
          const rep = seRepMap.get(se)!;
          const y = rep.year;

          const daesForSeYear = findDaeForYearMulti(daeList, y);
          const mainDaeForSe = daesForSeYear[0] ?? daeUnion[0] ?? null;

          const seChain: LuckChain = {
            dae: mainDaeForSe ? mainDaeForSe.gz : null,
            se,
            wol: null,
            il: null,
          };

          const seOverlay = makeOverlayByLuck(unified, "세운", seChain);
          const relWithSeTop = buildAllRelationTags({
            natal,
            daewoon: mainDaeForSe?.gz,
            sewoon: se,
            wolwoon: undefined,
            ilwoon: undefined,
          });
          const shinsalWithSeTop = buildShinsalTags({
            natal,
            daewoon: mainDaeForSe?.gz,
            sewoon: se,
            wolwoon: undefined,
            ilwoon: undefined,
            basis,
          });

          const seNabeum = getNabeum(se);
          const seUnseong = getTwelveUnseong(
            natal[2]?.charAt(0) ?? "",
            se.charAt(1),
          );
          const seShinsal12 = getTwelveShinsalBySettings({
            baseBranch,
            targetBranch: se.charAt(1),
            era: shinsalEra,
            gaehwa: shinsalGaehwa,
          });

          return {
            기본정보: `${y}년 ${se}`,
            간지: se,
            오행강약: Object.fromEntries(
              Object.entries(seOverlay.elementPercent).map(
                ([el, val]) => [
                  `${el}(${elementToTenGod(dayEl, el as Element)})`,
                  val,
                ],
              ),
            ),
            십신강약: seOverlay.totalsSub,
            형충회합: filterHarmonyTagsByScope(relWithSeTop, "세운"),
            신살: filterShinsalByScope(shinsalWithSeTop, "세운"),
            납음오행: seNabeum
              ? {
                  gz: se,
                  nabeum: seNabeum.name,
                  element: seNabeum.element,
                  code: seNabeum.code,
                }
              : null,
            십이운성: {
              pos: "세운",
              gz: se,
              unseong: seUnseong,
            },
            십이신살: {
              pos: "세운",
              gz: se,
              shinsal: seShinsal12,
            },
          };
        }),
      };

      sections.push(sectionPlain("세운", seSectionData));
    }

    // (4-3) 월운 리스트 (각 월별)
    for (const ym of wolMonths) {
      const [y, m] = ym.split("-").map(Number);
      const date = new Date(y, m - 1, 15);
      const wolGZ = getMonthGanZhi(date);

      const daes = findDaeForMonthMulti(daeList, y, m);
      const mainDae = daes.length > 0 ? daes[0] : null;

      const ses = findSeForMonthMulti(y, m);
      const mainSe = ses.length > 0 ? ses[ses.length - 1] : "";

      const chain: LuckChain = {
        dae: mainDae ? mainDae.gz : null,
        se: mainSe || null,
        wol: normalizeGZ(wolGZ || ""),
        il: null,
      };

      const overlay = makeOverlayByLuck(unified, "월운", chain);
      const relWithWol = buildAllRelationTags({
        natal,
        daewoon: mainDae?.gz,
        sewoon: mainSe || undefined,
        wolwoon: normalizeGZ(wolGZ || ""),
        ilwoon: undefined,
      });
      const shinsalWithWol = buildShinsalTags({
        natal,
        daewoon: mainDae?.gz,
        sewoon: mainSe || undefined,
        wolwoon: normalizeGZ(wolGZ || ""),
        ilwoon: undefined,
        basis,
      });

      const wolNabeum = getNabeum(normalizeGZ(wolGZ || ""));
      const wolUnseong = getTwelveUnseong(
        natal[2]?.charAt(0) ?? "",
        (wolGZ || "").charAt(1),
      );
      const wolShinsal = getTwelveShinsalBySettings({
        baseBranch,
        targetBranch: (wolGZ || "").charAt(1),
        era: shinsalEra,
        gaehwa: shinsalGaehwa,
      });

      const sectionData: Record<string, unknown> = {
        월운: {
          기본정보: `${ym} ${normalizeGZ(wolGZ || "")}`,
          간지: normalizeGZ(wolGZ || ""),
          오행강약: Object.fromEntries(
            Object.entries(overlay.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: overlay.totalsSub,
          형충회합: filterHarmonyTagsByScope(relWithWol, "월운"),
          신살: filterShinsalByScope(shinsalWithWol, "월운"),
          납음오행: wolNabeum
            ? {
                gz: normalizeGZ(wolGZ || ""),
                nabeum: wolNabeum.name,
                element: wolNabeum.element,
                code: wolNabeum.code,
              }
            : null,
          십이운성: {
            pos: "월운",
            gz: normalizeGZ(wolGZ || ""),
            unseong: wolUnseong,
          },
          십이신살: {
            pos: "월운",
            gz: normalizeGZ(wolGZ || ""),
            shinsal: wolShinsal,
          },
        },
      };

      sections.push(sectionPlain(`월운 ${ym}`, sectionData));
    }
  }

  // 5) 일운 탭 섹션

  if (ilDays.length > 0) {
    const rule: DayBoundaryRule =
      (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

    // (5-1) 기준일(첫날)에서 상단 대운/세운/월운 요약
    const [y0, m0, d0] = ilDays[0].split("-").map(Number);
    const baseDate0 = new Date(y0, m0 - 1, d0, 4, 0);

    if (!isNaN(baseDate0.getTime())) {
      const daes0 = findDaeForMonthMulti(daeList, y0, m0);
      const mainDae0 = daes0.length > 0 ? daes0[0] : null;

      const ses0 = findSeForMonthMulti(y0, m0);
      const mainSe0 = ses0.length > 0 ? ses0[ses0.length - 1] : "";

      const wolGZ0 = getMonthGanZhi(new Date(y0, m0 - 1, 15));
      const ilGZ0 = getDayGanZhi(baseDate0, rule);

      const normWol0 = normalizeGZ(wolGZ0 || "");
      const normSe0 = normalizeGZ(mainSe0 || "");
      const normIl0 = normalizeGZ(ilGZ0 || "");

      // (5-1-a) 상단 대운
      if (mainDae0) {
        const daeChain0: LuckChain = {
          dae: mainDae0.gz,
          se: normSe0,
          wol: normWol0,
          il: normIl0,
        };
        const daeOverlay0 = makeOverlayByLuck(unified, "대운", daeChain0);
        const relWithDae0 = buildAllRelationTags({
          natal,
          daewoon: mainDae0.gz,
          sewoon: normSe0,
          wolwoon: normWol0,
          ilwoon: normIl0,
        });
        const shinsalWithDae0 = buildShinsalTags({
          natal,
          daewoon: mainDae0.gz,
          sewoon: normSe0,
          wolwoon: normWol0,
          ilwoon: normIl0,
          basis,
        });

        const daeNabeum0 = getNabeum(mainDae0.gz);
        const daeUnseong0 = getTwelveUnseong(
          natal[2]?.charAt(0) ?? "",
          mainDae0.gz.charAt(1),
        );
        const daeShinsal12_0 = getTwelveShinsalBySettings({
          baseBranch,
          targetBranch: mainDae0.gz.charAt(1),
          era: shinsalEra,
          gaehwa: shinsalGaehwa,
        });

        sections.push(
          sectionPlain("대운", {
            기본정보: `${mainDae0.age}대운 ${mainDae0.gz} (${mainDae0.startYear}~${mainDae0.endYear})`,
            간지: mainDae0.gz,
            오행강약: Object.fromEntries(
              Object.entries(daeOverlay0.elementPercent).map(
                ([el, val]) => [
                  `${el}(${elementToTenGod(dayEl, el as Element)})`,
                  val,
                ],
              ),
            ),
            십신강약: daeOverlay0.totalsSub,
            형충회합: filterHarmonyTagsByScope(relWithDae0, "대운"),
            신살: filterShinsalByScope(shinsalWithDae0, "대운"),
            납음오행: daeNabeum0
              ? {
                  gz: mainDae0.gz,
                  nabeum: daeNabeum0.name,
                  element: daeNabeum0.element,
                  code: daeNabeum0.code,
                }
              : null,
            십이운성: {
              pos: "대운",
              gz: mainDae0.gz,
              unseong: daeUnseong0,
            },
            십이신살: {
              pos: "대운",
              gz: mainDae0.gz,
              shinsal: daeShinsal12_0,
            },
          }),
        );
      }

      // (5-1-b) 상단 세운
      if (normSe0) {
        const seChain0: LuckChain = {
          dae: mainDae0 ? mainDae0.gz : null,
          se: normSe0,
          wol: normWol0,
          il: normIl0,
        };
        const seOverlay0 = makeOverlayByLuck(unified, "세운", seChain0);
        const relWithSe0 = buildAllRelationTags({
          natal,
          daewoon: mainDae0?.gz,
          sewoon: normSe0,
          wolwoon: normWol0,
          ilwoon: normIl0,
        });
        const shinsalWithSe0 = buildShinsalTags({
          natal,
          daewoon: mainDae0?.gz,
          sewoon: normSe0,
          wolwoon: normWol0,
          ilwoon: normIl0,
          basis,
        });

        const seNabeum0 = getNabeum(normSe0);
        const seUnseong0 = getTwelveUnseong(
          natal[2]?.charAt(0) ?? "",
          normSe0.charAt(1),
        );
        const seShinsal12_0 = getTwelveShinsalBySettings({
          baseBranch,
          targetBranch: normSe0.charAt(1),
          era: shinsalEra,
          gaehwa: shinsalGaehwa,
        });

        sections.push(
          sectionPlain("세운", {
            기본정보: `${y0}년 ${normSe0}`,
            간지: normSe0,
            오행강약: Object.fromEntries(
              Object.entries(seOverlay0.elementPercent).map(
                ([el, val]) => [
                  `${el}(${elementToTenGod(dayEl, el as Element)})`,
                  val,
                ],
              ),
            ),
            십신강약: seOverlay0.totalsSub,
            형충회합: filterHarmonyTagsByScope(relWithSe0, "세운"),
            신살: filterShinsalByScope(shinsalWithSe0, "세운"),
            납음오행: seNabeum0
              ? {
                  gz: normSe0,
                  nabeum: seNabeum0.name,
                  element: seNabeum0.element,
                  code: seNabeum0.code,
                }
              : null,
            십이운성: { pos: "세운", gz: normSe0, unseong: seUnseong0 },
            십이신살: {
              pos: "세운",
              gz: normSe0,
              shinsal: seShinsal12_0,
            },
          }),
        );
      }

      // (5-1-c) 상단 월운
      if (normWol0) {
        const wolChain0: LuckChain = {
          dae: mainDae0 ? mainDae0.gz : null,
          se: normSe0,
          wol: normWol0,
          il: normIl0,
        };
        const wolOverlay0 = makeOverlayByLuck(unified, "월운", wolChain0);
        const relWithWol0 = buildAllRelationTags({
          natal,
          daewoon: mainDae0?.gz,
          sewoon: normSe0,
          wolwoon: normWol0,
          ilwoon: normIl0,
        });
        const shinsalWithWol0 = buildShinsalTags({
          natal,
          daewoon: mainDae0?.gz,
          sewoon: normSe0,
          wolwoon: normWol0,
          ilwoon: normIl0,
          basis,
        });

        const wolNabeum0 = getNabeum(normWol0);
        const wolUnseong0 = getTwelveUnseong(
          natal[2]?.charAt(0) ?? "",
          normWol0.charAt(1),
        );
        const wolShinsal12_0 = getTwelveShinsalBySettings({
          baseBranch,
          targetBranch: normWol0.charAt(1),
          era: shinsalEra,
          gaehwa: shinsalGaehwa,
        });

        sections.push(
          sectionPlain("월운", {
            기본정보: `${y0}-${String(m0).padStart(2, "0")} ${normWol0}`,
            간지: normWol0,
            오행강약: Object.fromEntries(
              Object.entries(wolOverlay0.elementPercent).map(
                ([el, val]) => [
                  `${el}(${elementToTenGod(dayEl, el as Element)})`,
                  val,
                ],
              ),
            ),
            십신강약: wolOverlay0.totalsSub,
            형충회합: filterHarmonyTagsByScope(relWithWol0, "월운"),
            신살: filterShinsalByScope(shinsalWithWol0, "월운"),
            납음오행: wolNabeum0
              ? {
                  gz: normWol0,
                  nabeum: wolNabeum0.name,
                  element: wolNabeum0.element,
                  code: wolNabeum0.code,
                }
              : null,
            십이운성: { pos: "월운", gz: normWol0, unseong: wolUnseong0 },
            십이신살: {
              pos: "월운",
              gz: normWol0,
              shinsal: wolShinsal12_0,
            },
          }),
        );
      }
    }

    // (5-2) 날짜별 일운 상세섹션
    for (const dateStr of ilDays) {
      const [y, m, d] = dateStr.split("-").map(Number);
      const baseDate = new Date(y, m - 1, d, 4, 0);
      if (isNaN(baseDate.getTime())) continue;

      const daes = findDaeForMonthMulti(daeList, y, m);
      const mainDae = daes.length > 0 ? daes[0] : null;

      const ses = findSeForMonthMulti(y, m);
      const mainSe = ses.length > 0 ? ses[ses.length - 1] : "";

      const wolGZ = getMonthGanZhi(new Date(y, m - 1, 15));
      const ilGZ = getDayGanZhi(baseDate, rule);

      const normWol = normalizeGZ(wolGZ || "");
      const normSe = normalizeGZ(mainSe || "");
      const normIl = normalizeGZ(ilGZ || "");

      const chain: LuckChain = {
        dae: mainDae ? mainDae.gz : null,
        se: normSe || null,
        wol: normWol,
        il: normIl,
      };

      const overlay = makeOverlayByLuck(unified, "일운", chain);
      const relWithIl = buildAllRelationTags({
        natal,
        daewoon: mainDae?.gz,
        sewoon: normSe || undefined,
        wolwoon: normWol || undefined,
        ilwoon: normIl || undefined,
      });
      const shinsalWithIl = buildShinsalTags({
        natal,
        daewoon: mainDae?.gz,
        sewoon: normSe || undefined,
        wolwoon: normWol || undefined,
        ilwoon: normIl || undefined,
        basis,
      });

      const ilNabeum = getNabeum(normIl);
      const ilUnseong = getTwelveUnseong(
        natal[2]?.charAt(0) ?? "",
        normIl.charAt(1),
      );
      const ilShinsal12 = getTwelveShinsalBySettings({
        baseBranch,
        targetBranch: normIl.charAt(1),
        era: shinsalEra,
        gaehwa: shinsalGaehwa,
      });

      const sectionData: Record<string, unknown> = {
        일운: {
          기본정보: `${dateStr} ${normIl}`,
          간지: normIl,
          오행강약: Object.fromEntries(
            Object.entries(overlay.elementPercent).map(([el, val]) => [
              `${el}(${elementToTenGod(dayEl, el as Element)})`,
              val,
            ]),
          ),
          십신강약: overlay.totalsSub,
          형충회합: filterHarmonyTagsByScope(relWithIl, "일운"),
          신살: filterShinsalByScope(shinsalWithIl, "일운"),
          납음오행: ilNabeum
            ? {
                gz: normIl,
                nabeum: ilNabeum.name,
                element: ilNabeum.element,
                code: ilNabeum.code,
              }
            : null,
          십이운성: {
            pos: "일운",
            gz: normIl,
            unseong: ilUnseong,
          },
          십이신살: {
            pos: "일운",
            gz: normIl,
            shinsal: ilShinsal12,
          },
        },
      };

      sections.push(sectionPlain(`일운 ${dateStr}`, sectionData));
    }
  }

  const body = sections.filter((s) => s.trim().length > 0).join("\n\n");
  const topicGuide = buildTopicGuide({
    topic,
    subTopic,
    timeMode: "single",
    tone,          // 🔥 추가
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
