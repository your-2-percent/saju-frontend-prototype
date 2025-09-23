import { useMemo } from "react";
import type { Pillars4 } from "./logic/relations";
import { useClimatePercents } from "./hooks/useClimatePercents";

/** StrengthBar와 동일 룩앤필의 내부 바 */
function BiBar({
  label,
  percent,
  leftHint,
  midHint,
  rightHint,
}: {
  label: string;
  percent: number; // 0~100, 오른쪽으로 갈수록 강함
  leftHint: string;
  midHint: string;
  rightHint: string;
}) {
  const pct = useMemo(() => Math.max(0, Math.min(100, percent)), [percent]);
  const TICKS = [10, 20, 35, 45, 55, 65, 80]; // 기존 StrengthBar 틱 유지

  return (
    <div className="w-full mx-auto p-2 desk:p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl">
      {/* 상단 라벨 */}
      <div className="flex justify-between text-[11px] text-neutral-400 mb-1">
        <span>{leftHint}</span>
        <span>{midHint}</span>
        <span>{rightHint}</span>
      </div>

      {/* 바 UI (그라디언트/마커 포함) */}
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
          style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
          aria-label={`${label} ${pct.toFixed(1)}%`}
        />
      </div>

      {/* 현재 퍼센트 */}
      <div className="mt-2 flex items-center gap-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-neutral-600 text-neutral-700 dark:text-neutral-200">
          {label}
        </span>
        <span className="text-xs text-neutral-400">{pct.toFixed(1)}%</span>
      </div>
    </div>
  );
}

/** 조후 두 줄 바: 한난/조습 */
export default function ClimateBars({ natal }: { natal: Pillars4 }) {
  const { hanNanPct, joSeupPct } = useClimatePercents(natal);

  return (
    <div className="flex gap-2">
      {/* 한난: 0=한 → 100=난 */}
      <BiBar
        label="한난"
        percent={hanNanPct}
        leftHint="한"
        midHint="중화"
        rightHint="난"
      />
      {/* 조습: 0=습 → 100=조 */}
      <BiBar
        label="조습"
        percent={joSeupPct}
        leftHint="습"
        midHint="중화"
        rightHint="조"
      />
    </div>
  );
}
