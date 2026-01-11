// features/AnalysisReport/StrengthBar.tsx
import { useMemo } from "react";
import { clamp01, getShinCategory, ShinCategory } from "@/analysisReport/calc/logic/shinStrength";

const TICKS = [10, 20, 35, 45, 55, 65, 80];

export default function StrengthBar({ value }: { value: number }) {
  const percent = useMemo(() => clamp01(value), [value]);
  const category: ShinCategory = useMemo(() => getShinCategory(percent), [percent]);

  return (
    <div className="w-full mx-auto p-2 desk:p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
      {/* 상단 라벨 */}
      <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
        <span>신약</span>
        <span>중화</span>
        <span>신강</span>
      </div>

      {/* 바 */}
      <div className="relative h-4 rounded bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500">
        {TICKS.map((t) => (
          <div
            key={t}
            className="absolute top-0 h-4 w-[1px] bg-black/30"
            style={{ left: `${t}%` }}
            title={`${t}%`}
          />
        ))}
        <div
          className="absolute top-0 h-4 w-[1px] bg-black/40"
          style={{ left: "50%" }}
          title="50%"
        />
        <div
          className="absolute -top-1 h-6 w-2 bg-white rounded shadow-sm"
          style={{ left: `${percent}%`, transform: "translateX(-50%)" }}
          aria-label={`현재 강약 ${percent}%`}
        />
      </div>

      {/* 레이블 */}
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-neutral-600 text-neutral-700 dark:text-neutral-200">
          {category}
        </span>
        <span className="text-xs text-neutral-400">{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}
