// features/AnalysisReport/GyeokgukTagPanel.tsx
import React, { useMemo, useState } from "react";
import type { BlendTab } from "@/analysisReport/calc/logic/blend";
import { computeNaegyeok, detectMulsangTerms, detectStructureTags } from "@/analysisReport/calc/logic/gyeokguk";
import { UnifiedPowerResult } from "@/analysisReport/calc/utils/unifiedPower";
import { getOuterGyeokTooltipText } from "@/analysisReport/calc/logic/gyeokguk/outerGyeokTooltips";
import { getGyeokgukTooltip } from "@/analysisReport/calc/logic/gyeokguk/rulesTooltips";
import { getStructureTagTooltipText } from "@/analysisReport/calc/logic/gyeokguk/structureTagTooltips";
import { getTermTooltipText } from "@/analysisReport/calc/logic/gyeokguk/termTooltips";
import { getFormatterReasonTooltip, getNaegyeokTooltip } from "@/analysisReport/calc/logic/gyeokguk/formatterTooltips";
import type { ReasonToken } from "@/analysisReport/calc/logic/gyeokguk/formatter";

/**
 * 격국 · 물상 태그 패널
 * - 월령/사령/진신/가신
 * - 내격
 * - 외격(복수)
 * - 물상/구조어
 */
export default function GyeokgukTagPanel(props: {
  /** [연/월/일/시] 간지 배열(예: "갑자") */
  pillars: [string, string, string, string];
  /** 현재 선택된 탭 */
  tab: BlendTab;
  /** (선택) 실제 출생 일시 */
  birthDate?: Date;
  /** (선택) 천간 투출 목록 */
  emittedStems?: string[];
  /** (선택) 월지 외 지지 목록 */
  otherBranches?: string[];
  /** (선택) 합/충 무력화 판단 */
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
    unified,
  } = props;

  const [yearGZ, monthGZ, dayGZ, hourGZ] = pillars;

  const safeStem = (gz: string): string => (gz && gz.length >= 1 ? gz.charAt(0) : "");
  const safeBranch = (gz: string): string => (gz && gz.length >= 2 ? gz.charAt(1) : "");

  const monthBranch = safeBranch(monthGZ);
  const dayStem = safeStem(dayGZ);

  const date = birthDate instanceof Date && !Number.isNaN(birthDate.getTime()) ? birthDate : new Date();
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
    mapping,
  });
  const reasonTokens = result.reasonTokens ?? [];
  const reasonLabels = result.reason ?? [];

  const row1: string[] = [
    `월령 : ${result.월령 || "-"}`,
    `사령 : ${result.사령 || "-"}`,
    `당령 : ${result.당령 || "-"}`,
    `진신 : ${result.진신 || "-"}`,
    `가신 : ${result.가신 || "-"}`,
  ];
  const row2: string[] = [`내격 : ${result.내격 || "-"}`];

  const row3: string[] =
    Array.isArray(result.외격) && result.외격.length > 0
      ? result.외격.map((x) => `외격 : ${x}`)
      : ["외격 : -"];

  const mulsangTags = detectMulsangTerms(pillars);

  const row4: string[] = [
    ...(mulsangTags.length ? mulsangTags.map((t) => `${t}`) : []),
  ];

  const structureTags = detectStructureTags(pillars, mapping, unified);
  const row5: string[] = [...structureTags];

  const Chip: React.FC<{ text: string; color: "violet" | "amber" | "blue" | "green" | "red" }> = ({ text, color }) => {
    const colorMap: Record<typeof color, string> = {
      violet: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800",
      amber:  "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-200 dark:border-amber-800",
      blue:   "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800",
      green:  "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800",
      red:    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800",
    };
    return (
      <span className={`inline-block text-xs px-2 py-1 rounded-full border whitespace-nowrap ${colorMap[color]}`} title={text}>
        {text}
      </span>
    );
  };

  const RowBox: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <li className="!flex flex-wrap gap-1 p-1 rounded-sm">
      {children}
    </li>
  );

  const [openTooltipKey, setOpenTooltipKey] = useState<string | null>(null);

  const OuterChip: React.FC<{ text: string }> = ({ text }) => {
    const label = text.replace(/^외격\s*:\s*/, "").trim();
    const tip = useMemo(() => getOuterGyeokTooltipText(label), [label]);
    const key = `outer:${label}`;
    const open = openTooltipKey === key;

    if (!tip) {
      return <Chip text={text} color="blue" />;
    }

    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpenTooltipKey(open ? null : key)}
          className="inline-flex cursor-pointer"
          title={tip}
        >
          <Chip text={text} color="blue" />
        </button>
        {open && (
          <div className="absolute z-10 left-0 top-full mt-1 w-[180px] text-[11px] leading-4 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 p-2 shadow text-center">
            {tip}
          </div>
        )}
      </span>
    );
  };

  const MulsangChip: React.FC<{ text: string }> = ({ text }) => {
    const label = text.trim();
    const tip = useMemo(() => getGyeokgukTooltip(label), [label]);
    const key = `mulsang:${label}`;
    const open = openTooltipKey === key;

    if (!tip) {
      return <Chip text={text} color="green" />;
    }

    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpenTooltipKey(open ? null : key)}
          className="inline-flex cursor-pointer"
          title={tip}
        >
          <Chip text={text} color="green" />
        </button>
        {open && (
          <div className="absolute z-10 left-0 top-full mt-1 w-[180px] text-[11px] leading-4 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 p-2 shadow text-center">
            {tip}
          </div>
        )}
      </span>
    );
  };

  const StructureChip: React.FC<{ text: string }> = ({ text }) => {
    const label = text.trim();
    const tip = useMemo(() => getStructureTagTooltipText(label), [label]);
    const key = `structure:${label}`;
    const open = openTooltipKey === key;

    if (!tip) {
      return <Chip text={text} color="red" />;
    }

    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpenTooltipKey(open ? null : key)}
          className="inline-flex cursor-pointer"
          title={tip}
        >
          <Chip text={text} color="red" />
        </button>
        {open && (
          <div className="absolute z-10 left-0 top-full mt-1 w-[180px] text-[11px] leading-4 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 p-2 shadow text-center">
            {tip}
          </div>
        )}
      </span>
    );
  };

  const TermChip: React.FC<{ text: string; color: "violet" | "amber" }> = ({ text, color }) => {
    const label = text.trim();
    const term = label.split(":")[0]?.trim() ?? label;
    const tip = useMemo(() => getTermTooltipText(term), [term]);
    const key = `term:${term}`;
    const open = openTooltipKey === key;

    if (!tip) {
      return <Chip text={text} color={color} />;
    }

    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpenTooltipKey(open ? null : key)}
          className="inline-flex cursor-pointer"
          title={tip}
        >
          <Chip text={text} color={color} />
        </button>
        {open && (
          <div className="absolute z-10 left-0 top-full mt-1 w-[180px] text-[11px] leading-4 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 p-2 shadow text-center">
            {tip}
          </div>
        )}
      </span>
    );
  };

  const NaegyeokChip: React.FC<{ text: string }> = ({ text }) => {
    const tip = useMemo(() => getNaegyeokTooltip(text), [text]);
    const key = `naegyeok:${text}`;
    const open = openTooltipKey === key;

    if (!tip) {
      return <Chip text={text} color="amber" />;
    }

    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpenTooltipKey(open ? null : key)}
          className="inline-flex cursor-pointer"
          title={tip.text}
        >
          <Chip text={text} color="amber" />
        </button>
        {open && (
          <div className="absolute z-10 left-0 top-full mt-1 w-[200px] text-[11px] leading-4 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 p-2 shadow text-center">
            {tip.text}
          </div>
        )}
      </span>
    );
  };

  const ReasonChip: React.FC<{ token: ReasonToken; fallback: string; idx: number }> = ({ token, fallback, idx }) => {
    const tip = getFormatterReasonTooltip(token);
    const label = tip?.title ?? fallback;
    const tooltipText = tip?.text ?? fallback;
    const key = `reason:${token.kind}:${"from" in token ? token.from : ""}:${idx}`;
    const open = openTooltipKey === key;

    return (
      <span className="relative inline-flex">
        <button
          type="button"
          onClick={() => setOpenTooltipKey(open ? null : key)}
          className="inline-flex cursor-pointer"
          title={tooltipText}
        >
          <Chip text={label} color="amber" />
        </button>
        {open && (
          <div className="absolute z-10 left-0 top-full mt-1 w-[200px] text-[11px] leading-4 rounded-md border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 p-2 shadow text-center">
            {tooltipText}
          </div>
        )}
      </span>
    );
  };

  return (
    <div
      className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 space-y-3 text-sm"
      data-revkey={`gyeok:${tab}|${pillars.join("")}|${row1.join(",")}|${row2.join(",")}|${row3.join(",")}`}
    >
      <div className="font-bold text-base">격국 · 물상 판정</div>
      <div className="text-xs text-amber-500 dark:text-amber-400 mb-2">* 칩 버튼을 누르면 간략 설명을 볼 수 있습니다.</div>

      <ul className="space-y-1">
        <RowBox>
          {row1.map((t) => (
            <TermChip key={t} text={t} color="violet" />
          ))}
        </RowBox>

        <RowBox>
          {row2.map((t) => (
            <NaegyeokChip key={t} text={t} />
          ))}
        </RowBox>

        <RowBox>
          {row3.map((t) => (
            <OuterChip key={t} text={t} />
          ))}
        </RowBox>

        <RowBox>
          {row4.map((t) => (
            <MulsangChip key={t} text={t} />
          ))}
        </RowBox>

        <RowBox>
          {row5.map((t) => (
            <StructureChip key={t} text={t} />
          ))}
        </RowBox>
      </ul>

      {reasonTokens.length > 0 ? (
        <div className="mt-2">
          <div className="text-xs text-neutral-600 dark:text-neutral-400">내격 사유</div>
          <div className="mt-1">
            <RowBox>
              {reasonTokens.map((token, idx) => (
                <ReasonChip
                  key={`${token.kind}-${idx}`}
                  token={token}
                  fallback={reasonLabels[idx] ?? token.kind}
                  idx={idx}
                />
              ))}
            </RowBox>
          </div>
        </div>
      ) : result.reason.length > 0 ? (
        <div className="mt-2 text-xs text-neutral-600 dark:text-neutral-400">
          이유: {result.reason.join(" / ")}
        </div>
      ) : null}
    </div>
  );
}
