// features/AnalysisReport/StrengthBar.tsx
import { useEffect, useMemo } from "react";

type Category =
  | "극약"
  | "태약"
  | "신약"
  | "중화신약"
  | "중화"
  | "중화신강"
  | "태강"
  | "극태강";

// 구간 경계 (퍼센트)
// [0,10) 극약, [10,20) 태약, [20,35) 신약, [35,45) 중화신약,
// [45,55) 중화, [55,65) 중화신강, [65,80) 태강, [80,100] 극태강
const BANDS: Array<{ name: Category; min: number; max: number }> = [
  { name: "극약",     min: 0,  max: 10 },
  { name: "태약",     min: 10, max: 20 },
  { name: "신약",     min: 20, max: 35 },
  { name: "중화신약", min: 35, max: 45 },
  { name: "중화",     min: 45, max: 55 },
  { name: "중화신강", min: 55, max: 65 },
  { name: "태강",     min: 65, max: 80 },
  { name: "극태강",   min: 80, max: 100.0001 }, // 100 포함되도록 살짝 여유
];

// 틱(세로 경계선) 위치들
const TICKS = [10, 20, 35, 45, 55, 65, 80];

function clamp01(v: number) {
  return Math.max(0, Math.min(100, v));
}

function getCategory(pct: number): Category {
  const x = clamp01(pct);
  const found = BANDS.find(b => x >= b.min && x < b.max);
  return (found?.name ?? "중화") as Category;
}

export default function StrengthBar({ value }: { value: number }) {
  const percent = useMemo(() => clamp01(value), [value]);
  const category = useMemo(() => getCategory(percent), [percent]);

  // 콘솔 디버그 출력
  useEffect(() => {
    // const p = Number.isFinite(percent) ? percent.toFixed(1) : String(percent);
    // console.debug(`[StrengthBar] ${p}% → ${category}`);
  }, [percent, category]);

  return (
    <div className="w-full mx-auto p-2 desk:p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
      {/* 상단 라벨(대략적 느낌) */}
      <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
        <span>신약</span>
        <span>중화</span>
        <span>신강</span>
      </div>

      {/* 바 영역 */}
      <div className="relative h-4 rounded bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500">
        {/* 경계 틱들 */}
        {TICKS.map((t) => (
          <div
            key={t}
            className="absolute top-0 h-4 w-[1px] bg-black/30"
            style={{ left: `${t}%` }}
            title={`${t}%`}
          />
        ))}

        {/* 중앙 기준선(50%) */}
        <div
          className="absolute top-0 h-4 w-[1px] bg-black/40"
          style={{ left: "50%" }}
          title="50%"
        />

        {/* 현재 값 마커 */}
        <div
          className="absolute -top-1 h-6 w-2 bg-white rounded shadow-sm"
          style={{ left: `${percent}%`, transform: "translateX(-50%)" }}
          aria-label={`현재 강약 ${percent}%`}
        />
      </div>

      {/* 현재 구간/퍼센트 표기 */}
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-neutral-600 text-neutral-700 dark:text-neutral-200">
          {category}
        </span>
        <span className="text-xs text-neutral-400">{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}
