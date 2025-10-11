// features/AnalysisReport/GyeokgukTagPanel.tsx
import React from "react";
import type { BlendTab } from "./logic/blend";
import { computeNaegyeok, detectMulsangTerms, detectStructureTags } from "./logic/gyeokguk";
import { UnifiedPowerResult } from "@/features/AnalysisReport/utils/unifiedPower";

/**
 * 격국 · 물상 태그 패널
 * 레이아웃:
 *  [ [월령] [사령] [진신] [가신] ]
 *  [ [내격] ]
 *  [ [외격 ...다중] ]
 *  [ [물상 & 사주용어] ]
 */
export default function GyeokgukTagPanel(props: {
  /** [연, 월, 일, 시] — 각 항목은 "갑자" 형태(천간1글자 + 지지1글자)가 이상적 */
  pillars: [string, string, string, string];
  /** 현재 선택된 운 탭 (표시용/키용) */
  tab: BlendTab;
  /** (선택) 실제 출생 일시 — 절입일(+12) 판정에 사용, 없으면 현재 시각 */
  birthDate?: Date;
  /** (선택) 연/월/일/시 천간 투출 목록 (예: ["병","경","계"]) — 생지 사령 우선 판단 */
  emittedStems?: string[];
  /** (선택) 월지 외의 지지들(연/일/시) — 고지 삼합 성립 확인용 */
  otherBranches?: string[];
  /** (선택) 격 후보 무력화(합/충 등) 여부 판단 콜백 */
  isNeutralized?: (stemKo: string) => boolean;
  mapping: string;
  unified: UnifiedPowerResult;
}) {
  const {
    pillars,
    tab,
    birthDate,
    emittedStems,
    otherBranches,
    isNeutralized,
    mapping,
    unified
  } = props;

  const [yearGZ, monthGZ, dayGZ, hourGZ] = pillars;

  // 안전 파서
  const safeStem = (gz: string): string => (gz && gz.length >= 1 ? gz.charAt(0) : "");
  const safeBranch = (gz: string): string => (gz && gz.length >= 2 ? gz.charAt(1) : "");

  const monthBranch = safeBranch(monthGZ);
  const dayStem = safeStem(dayGZ);

  // 절입일 판단 기준일
  const date = birthDate instanceof Date && !Number.isNaN(birthDate.getTime()) ? birthDate : new Date();

  // 기본 유도값
  const inferredEmitted: string[] = [
    safeStem(yearGZ),
    safeStem(monthGZ),
    safeStem(dayGZ),
    safeStem(hourGZ),
  ].filter((s): s is string => Boolean(s && s.length === 1));

  const inferredBranches: string[] = [
    safeBranch(yearGZ),
    safeBranch(dayGZ),
    safeBranch(hourGZ),
  ].filter((b): b is string => Boolean(b && b.length === 1));

  const result = computeNaegyeok({
    dayStem,
    monthBranch,
    date,
    pillars,
    emittedStems: emittedStems ?? inferredEmitted,
    otherBranches: otherBranches ?? inferredBranches,
    isNeutralized,
    mapping
  });

  // UI 행 구성
  const row1: string[] = [
    `월령 : ${result.월령 || "-"}`,
    `사령 : ${result.사령 || "-"}`,
    `진신 : ${result.진신 || "-"}`,
    `가신 : ${result.가신 || "-"}`,
  ];
  const row2: string[] = [`내격 : ${result.내격 || "-"}`];

  // 외격 다중 칩
  const row3: string[] =
    Array.isArray(result.외격) && result.외격.length > 0
      ? result.외격.map((x) => `외격 : ${x}`)
      : ["외격 : -"];

  // 물상 조합 탐색
  const mulsangTags = detectMulsangTerms(pillars);

  // 기존 row4 만들기
  const row4: string[] = [
    ...(mulsangTags.length ? mulsangTags.map(t => `${t}`) : []),
  ];

  const structureTags = detectStructureTags(pillars, mapping, unified);

  const row5: string[] = [
    ...structureTags,
  ];

  const Chip: React.FC<{ text: string; color: "violet" | "amber" | "blue" | "green" | "red" }> = ({ text, color }) => {
    const colorMap: Record<typeof color, string> = {
      violet: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800",
      amber:  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800",
      blue:   "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800",
      green:  "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800",
      red:    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800"
    };
    return (
      <span className={`inline-block text-xs px-2 py-1 rounded-full border whitespace-nowrap ${colorMap[color]}`} title={text}>
        {text}
      </span>
    );
  };

  const RowBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="!flex flex-wrap gap-1 border border-gray-700 dark:border-gray-200 p-2 rounded-sm">
      {children}
    </li>
  );

  return (
    <div
      className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 space-y-3 text-sm"
      data-revkey={`gyeok:${tab}|${pillars.join("")}|${row1.join(",")}|${row2.join(",")}|${row3.join(",")}`}
    >
      <div className="font-bold text-base">격국 · 물상 판정</div>

      <ul className="space-y-1">
        {/* 1행: 월령/사령/진신/가신 */}
        <RowBox>
          {row1.map((t) => (
            <Chip key={t} text={t} color="violet" />
          ))}
        </RowBox>

        {/* 2행: 내격 */}
        <RowBox>
          {row2.map((t) => (
            <Chip key={t} text={t} color="amber" />
          ))}
        </RowBox>

        {/* 3행: 외격(다중) */}
        <RowBox>
          {row3.map((t) => (
            <Chip key={t} text={t} color="blue" />
          ))}
        </RowBox>

        {/* 4행: 물상 */}
        <RowBox>
          {row4.map((t) => (
            <Chip key={t} text={t} color="green" />
          ))}
        </RowBox>

        {/* 5행: 사주용어 */}
        <RowBox>
          {row5.map((t) => (
            <Chip key={t} text={t} color="red" />
          ))}
        </RowBox>
      </ul>

      {/* 사유 로그 */}
      {result.reason.length > 0 && (
        <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          • {result.reason.join(" / ")}
        </div>
      )}
    </div>
  );
}
