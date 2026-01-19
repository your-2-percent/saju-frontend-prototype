import React, { useMemo, useState, useEffect, memo } from "react";
import type { BlendTab } from "@/analysisReport/calc/logic/blend";
import { computeNaegyeok, detectMulsangTerms, detectStructureTags } from "@/analysisReport/calc/logic/gyeokguk";
import { UnifiedPowerResult } from "@/analysisReport/calc/utils/unifiedPower";
import { getOuterGyeokTooltipText } from "@/analysisReport/calc/logic/gyeokguk/outerGyeokTooltips";
import { getGyeokgukTooltip } from "@/analysisReport/calc/logic/gyeokguk/rulesTooltips";
import { getStructureTagTooltipText } from "@/analysisReport/calc/logic/gyeokguk/structureTagTooltips";
import { getTermTooltipText } from "@/analysisReport/calc/logic/gyeokguk/termTooltips";
import { getFormatterReasonTooltip, getNaegyeokTooltip } from "@/analysisReport/calc/logic/gyeokguk/formatterTooltips";

/** 1. 타입 정의 */
interface GyeokgukTagPanelProps {
  pillars: [string, string, string, string];
  tab: BlendTab;
  birthDate?: Date;
  emittedStems?: string[];
  otherBranches?: string[];
  isNeutralized?: (stemKo: string) => boolean;
  mapping: string;
  unified: UnifiedPowerResult;
}

type ColorType = "violet" | "amber" | "blue" | "green" | "red";

// Environment 항목을 위한 유니온 타입
type EnvKey = "월령" | "사령" | "당령" | "진신" | "가신";

/** 2. 정적 서브 컴포넌트 */
const Chip = memo(({ text, color, onClick }: { text: string; color: ColorType; onClick?: () => void }) => {
  const colorClasses: Record<ColorType, string> = {
    violet: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800",
    amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
    green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
    red: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border shadow-sm whitespace-nowrap active:scale-95 transition-transform cursor-pointer ${colorClasses[color]}`}
    >
      {text}
    </button>
  );
});

const TooltipBox = ({ text }: { text: string }) => (
  <div className="absolute z-50 left-0 top-full mt-2 w-[220px] p-3 bg-white dark:bg-neutral-800 rounded-xl shadow-xl border border-neutral-200 dark:border-neutral-700 text-[11px] leading-relaxed text-left text-neutral-700 dark:text-neutral-200 pointer-events-none transition-none">
    <div className="absolute -top-1 left-4 w-2 h-2 bg-white dark:bg-neutral-800 border-t border-l border-neutral-200 dark:border-neutral-700 rotate-45" />
    {text}
  </div>
);

const Section = memo(({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-2">
    <div className="text-[10px] font-black text-neutral-400 dark:text-neutral-500 uppercase pl-1">
      {title}
    </div>
    <div className="flex flex-wrap gap-1.5">{children}</div>
  </div>
));

/** 3. 메인 컴포넌트 */
export default function GyeokgukTagPanel({
  pillars,
  tab,
  birthDate,
  emittedStems,
  otherBranches,
  isNeutralized,
  mapping,
  unified,
}: GyeokgukTagPanelProps) {
  const [openTooltipKey, setOpenTooltipKey] = useState<string | null>(null);

  // 탭 전환 시 툴팁 닫기
  useEffect(() => {
    setOpenTooltipKey(null);
  }, [tab, pillars]);

  // 계산 로직 메모이제이션 및 타입 안정성 확보
  const result = useMemo(() => {
    const [yearGZ, monthGZ, dayGZ, hourGZ] = pillars;
    const safeStem = (gz: string) => (gz && gz.length >= 1 ? gz.charAt(0) : "");
    const safeBranch = (gz: string) => (gz && gz.length >= 2 ? gz.charAt(1) : "");

    const date = birthDate instanceof Date && !Number.isNaN(birthDate.getTime()) ? birthDate : new Date();
    
    // 타입 추론을 위한 필터링
    const inferredEmitted = [safeStem(yearGZ), safeStem(monthGZ), safeStem(dayGZ), safeStem(hourGZ)].filter((s): s is string => !!s);
    const inferredBranches = [safeBranch(yearGZ), safeBranch(dayGZ), safeBranch(hourGZ)].filter((b): b is string => !!b);

    return computeNaegyeok({
      dayStem: safeStem(dayGZ),
      monthBranch: safeBranch(monthGZ),
      date,
      pillars,
      emittedStems: emittedStems ?? inferredEmitted,
      otherBranches: otherBranches ?? inferredBranches,
      isNeutralized,
      mapping,
    });
  }, [pillars, birthDate, emittedStems, otherBranches, isNeutralized, mapping]);

  const mulsangTags = useMemo(() => detectMulsangTerms(pillars), [pillars]);
  const structureTags = useMemo(() => detectStructureTags(pillars, mapping, unified), [pillars, mapping, unified]);

  const handleToggle = (key: string) => {
    setOpenTooltipKey((prev) => (prev === key ? null : key));
  };

  // Environment 항목 매핑용 헬퍼
  const envItems: Array<{ key: EnvKey; value: string | undefined }> = [
    { key: "월령", value: result.월령 },
    { key: "사령", value: result.사령 },
    { key: "당령", value: result.당령 },
    { key: "진신", value: result.진신 },
    { key: "가신", value: result.가신 },
  ];

  return (
    <div className="p-6 rounded-[2rem] bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 shadow-sm space-y-6 overflow-visible">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-lg text-neutral-800 dark:text-neutral-100 italic">격국 · 물상 판정</h3>
        <span className="text-[10px] bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-bold">
          💡 칩을 눌러 상세 정보 확인
        </span>
      </div>

      <div className="space-y-5">
        <Section title="월령/사령/당령/진신/가신">
          {envItems.map(({ key, value }) => (
            <div key={key} className="relative">
              <Chip
                text={`${key}: ${value || "-"}`}
                color="violet"
                onClick={() => handleToggle(`env-${key}`)}
              />
              {openTooltipKey === `env-${key}` && (
                <TooltipBox text={getTermTooltipText(key) ?? "정보가 없습니다."} />
              )}
            </div>
          ))}
        </Section>

        <Section title="내격">
          <div className="relative">
            <Chip
              text={`내격: ${result.내격 || "-"}`}
              color="amber"
              onClick={() => handleToggle("naegyeok")}
            />
            {openTooltipKey === "naegyeok" && (
              <TooltipBox text={getNaegyeokTooltip(result.내격 || "")?.text ?? "분석 정보가 없습니다."} />
            )}
          </div>
          {result.reasonTokens?.map((token, idx) => {
            const tip = getFormatterReasonTooltip(token);
            const key = `reason-${idx}`;
            return (
              <div key={key} className="relative">
                <Chip
                  text={tip?.title ?? (result.reason[idx] || token.kind)}
                  color="amber"
                  onClick={() => handleToggle(key)}
                />
                {openTooltipKey === key && <TooltipBox text={tip?.text ?? "상세 사유가 없습니다."} />}
              </div>
            );
          })}
        </Section>

        <Section title="외격">
          {result.외격 && result.외격.length > 0 ? (
            result.외격.map((x, i) => (
              <div key={`outer-${i}`} className="relative">
                <Chip text={`외격: ${x}`} color="blue" onClick={() => handleToggle(`outer-${i}`)} />
                {openTooltipKey === `outer-${i}` && <TooltipBox text={getOuterGyeokTooltipText(x) ?? "설명 없음"} />}
              </div>
            ))
          ) : (
            <Chip text="외격: -" color="blue" />
          )}
        </Section>

        {(mulsangTags.length > 0 || structureTags.length > 0) && (
          <Section title="물상 및 특징">
            {mulsangTags.map((t, i) => (
              <div key={`mul-${i}`} className="relative">
                <Chip text={t} color="green" onClick={() => handleToggle(`mul-${i}`)} />
                {openTooltipKey === `mul-${i}` && <TooltipBox text={getGyeokgukTooltip(t) ?? "설명 없음"} />}
              </div>
            ))}
            {structureTags.map((t, i) => (
              <div key={`str-${i}`} className="relative">
                <Chip text={t} color="red" onClick={() => handleToggle(`str-${i}`)} />
                {openTooltipKey === `str-${i}` && <TooltipBox text={getStructureTagTooltipText(t) ?? "설명 없음"} />}
              </div>
            ))}
          </Section>
        )}
      </div>
      
      {!result.reasonTokens?.length && result.reason.length > 0 && (
        <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800">
          <p className="text-[11px] text-neutral-500 leading-relaxed font-medium">
            <span className="font-bold mr-1 text-neutral-400">※ 분석 근거:</span>
            {result.reason.join(" / ")}
          </p>
        </div>
      )}
    </div>
  );
}