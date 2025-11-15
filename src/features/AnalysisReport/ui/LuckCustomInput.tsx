// features/AnalysisReport/ui/LuckCustomInput.tsx

import { useState, useMemo, useEffect } from "react";
import type { LuckChain } from "@/features/AnalysisReport/utils/unifiedPower";
import MonthRangePicker, { MonthRange } from "./MonthRangePicker";
import { normalizeGZ } from "@/features/AnalysisReport/logic/relations";

export type CustomLuckMode = "대운" | "세운" | "월운";

export type CustomLuckBlock = {
  label: string;
  dae?: string;
  se?: string;
  wol?: string;
  il?: string;
};

type Props = {
  mode: CustomLuckMode;
  onModeChange: (m: CustomLuckMode) => void;

  daeList: string[];
  fallbackChain: LuckChain;

  monthRange: MonthRange;
  onMonthRangeChange: (v: MonthRange) => void;

  onChange: (blocks: CustomLuckBlock[]) => void;
};

function isSameBlocks(a: CustomLuckBlock[], b: CustomLuckBlock[]) {
  if (a.length !== b.length) return false;
  return a.every((v, i) =>
    v.label === b[i].label &&
    v.dae === b[i].dae &&
    v.se === b[i].se &&
    v.wol === b[i].wol &&
    v.il === b[i].il
  );
}

export default function LuckCustomInput({
  mode,
  onModeChange,
  daeList,
  monthRange,
  onMonthRangeChange,
  onChange,
}: Props) {

  // ------------------------------
  // 로컬 state
  // ------------------------------
  const [selectedDae, setSelectedDae] = useState<string | null>(null);

  const [startYear, setStartYear] = useState<number>(new Date().getFullYear());
  const [endYear, setEndYear] = useState<number>(new Date().getFullYear());

  // ------------------------------
  // 대운 블록 생성
  // ------------------------------
  const daeBlocks = useMemo<CustomLuckBlock[]>(() => {
    if (mode !== "대운" || !selectedDae) return [];

    const idx = daeList.indexOf(selectedDae);
    if (idx < 0) return [];

    const from = Math.max(0, idx - 2);
    const to = Math.min(daeList.length - 1, idx + 2);

    const result: CustomLuckBlock[] = [];
    for (let i = from; i <= to; i++) {
      const gz = daeList[i];
      result.push({
        label: `${gz} 대운`,
        dae: gz,
      });
    }
    return result;
  }, [mode, daeList, selectedDae]);

  // ------------------------------
  // 세운 블록 생성
  // ------------------------------
  const seBlocks = useMemo<CustomLuckBlock[]>(() => {
    if (mode !== "세운") return [];
    if (startYear > endYear) return [];

    const maxRange = endYear - startYear + 1;
    if (maxRange > 10) return [];

    const result: CustomLuckBlock[] = [];
    for (let y = startYear; y <= endYear; y++) {
      const gz = normalizeGZ(`${y}`); // ← 실제 연간지 함수로 교체 예정
      result.push({
        label: `${y}`,
        se: gz,
      });
    }
    return result;
  }, [mode, startYear, endYear]);

  // ------------------------------
  // 월운 블록 생성
  // ------------------------------
  const wolBlocks = useMemo<CustomLuckBlock[]>(() => {
    if (mode !== "월운") return [];

    const start = new Date(monthRange.start + "-01");
    const end = new Date(monthRange.end + "-01");

    const result: CustomLuckBlock[] = [];
    const cur = new Date(start);

    let counter = 0;
    while (cur <= end && counter < 12) {
      const y = cur.getFullYear();
      const m = cur.getMonth() + 1;
      const mm = m < 10 ? `0${m}` : String(m);

      const label = `${y}.${mm}`;
      const gz = normalizeGZ(label); // ← 실제 월간지 함수로 교체 예정

      result.push({
        label,
        wol: gz,
      });

      cur.setMonth(cur.getMonth() + 1);
      counter++;
    }

    return result;
  }, [mode, monthRange]);

  // ------------------------------
  // 최종 blocks 선택 (mode 기반)
  // ------------------------------
  const finalBlocks = useMemo<CustomLuckBlock[]>(() => {
    if (mode === "대운") return daeBlocks;
    if (mode === "세운") return seBlocks;
    return wolBlocks;
  }, [mode, daeBlocks, seBlocks, wolBlocks]);

  // ------------------------------
  // 부모로 safe 전달 (무한루프 절대 방지)
  // ------------------------------
  useEffect(() => {
    onChange(((prev: CustomLuckBlock[]) => {
      if (isSameBlocks(prev, finalBlocks)) return prev;
      return finalBlocks;
    }) as unknown as CustomLuckBlock[]);
  }, [finalBlocks, onChange]);

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <div className="w-full border rounded-md p-3 bg-neutral-50 dark:bg-neutral-800 space-y-3">

      {/* 모드 버튼 */}
      <div className="flex gap-2">
        {(["대운","세운","월운"] as CustomLuckMode[]).map((m) => (
          <button
            key={m}
            onClick={() => onModeChange(m)}
            className={`px-2 py-1 rounded-md text-xs cursor-pointer ${
              mode === m
                ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                : "bg-white dark:bg-neutral-700 border text-neutral-700 dark:text-neutral-300"
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 대운 */}
      {mode === "대운" && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500">대운모드 (선택 대운으로부터 ~ 5개의 대운까지 포함)</p>
          <div className="flex flex-wrap gap-1">
            {daeList.map((g) => (
              <button
                key={g}
                onClick={() => setSelectedDae(g)}
                className={`px-2 py-1 text-xs rounded border cursor-pointer ${
                  selectedDae === g
                    ? "bg-neutral-900 text-white dark:bg-yellow-500 dark:text-black"
                    : "bg-white dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 세운 */}
      {mode === "세운" && (
        <div className="space-y-2">
          <p className="text-xs text-neutral-500">세운모드 (최대 10년까지 가능합니다.)</p>

          <div className="flex items-center gap-2">
            <input
              type="number"
              value={startYear}
              onChange={(e) => setStartYear(Number(e.target.value))}
              className="w-20 h-30 px-2 text-xs border rounded"
            />
            <span>~</span>
            <input
              type="number"
              value={endYear}
              onChange={(e) => setEndYear(Number(e.target.value))}
              className="w-20 h-30 px-2 text-xs border rounded"
            />
          </div>
        </div>
      )}

      {/* 월운 */}
      {mode === "월운" && (
        <div>
          <p className="text-xs text-neutral-500 mb-2">월운모드 (최대 12개월)</p>
          <MonthRangePicker value={monthRange} onChange={onMonthRangeChange} />
        </div>
      )}

    </div>
  );
}
