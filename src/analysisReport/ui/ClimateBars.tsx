import { useMemo, useState, useEffect } from "react";
import type { Pillars4 } from "@/analysisReport/calc/logic/relations";
import { useClimatePercents } from "@/analysisReport/input/useClimatePercents";

/** 업그레이드된 공통 바 컴포넌트 */
function BiBar({
  label,
  percent,
  leftHint,
  midHint,
  rightHint,
  gradientClass,
}: {
  label: string;
  percent: number;
  leftHint: string;
  midHint: string;
  rightHint: string;
  gradientClass: string;
}) {
  const [animate, setAnimate] = useState(false);
  const pct = useMemo(() => Math.max(0, Math.min(100, percent)), [percent]);
  const TICKS = [20, 35, 50, 65, 80];

  useEffect(() => { setAnimate(true); }, []);

  return (
    <div className="flex-1 p-4 bg-white dark:bg-neutral-900 rounded-3xl shadow-sm border border-neutral-100 dark:border-neutral-800">
      {/* 라벨 및 수치 */}
      <div className="flex justify-between items-center mb-4">
        <span className="text-[11px] font-black text-neutral-400 uppercase">{label}</span>
        <span className="text-sm font-black dark:text-white">{pct.toFixed(0)}%</span>
      </div>

      {/* 힌트 라벨 */}
      <div className="flex justify-between text-[10px] font-bold text-neutral-400 mb-1.5 px-0.5">
        <span>{leftHint}</span>
        <span>{midHint}</span>
        <span>{rightHint}</span>
      </div>

      {/* 메인 바 */}
      <div className="relative h-2.5 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-visible shadow-inner">
        {/* 맞춤형 그라데이션 배경 */}
        <div className={`absolute inset-0 rounded-full opacity-80 ${gradientClass}`} />
        
        {/* 눈금 */}
        {TICKS.map((t) => (
          <div key={t} className="absolute top-0 h-2.5 w-[1px] bg-white/20 dark:bg-black/10" style={{ left: `${t}%` }} />
        ))}

        {/* 마커 */}
        <div
          className="absolute -top-1.5 h-5 w-2.5 bg-white dark:bg-neutral-100 rounded-full shadow-md border-2 border-neutral-800 dark:border-white z-20 transition-all duration-1000 ease-out"
          style={{ left: animate ? `${pct}%` : "50%", transform: "translateX(-50%)" }}
        />
      </div>
    </div>
  );
}

/** 조후 두 줄 바: 한난/조습 */
export default function ClimateBars({ natal }: { natal: Pillars4 }) {
  const { hanNanPct, joSeupPct } = useClimatePercents(natal);

  const climateComment = useMemo(() => {
    let comment = "";
    if (hanNanPct > 60) comment += "온화하고 열정적인 기운이 가득하며, ";
    else if (hanNanPct < 40) comment += "차분하고 냉철한 기운이 지배적이며, ";
    else comment += "적절한 온도감을 갖춘 중화된 환경이며, ";

    if (joSeupPct > 60) comment += "활동이 활발하고 결실을 맺기에 유리한 환경입니다.";
    else if (joSeupPct < 40) comment += "수용성이 좋고 유연한 관계 맺기에 유리한 환경입니다.";
    else comment += "치우침 없는 쾌적한 심리 상태를 보입니다.";
    
    return comment;
  }, [hanNanPct, joSeupPct]);

  return (
    <div className="w-full space-y-3">
      <div className="flex gap-3">
        {/* 한난: 0=한(Blue) → 100=난(Red) */}
        <BiBar
          label="한난 (온도)"
          percent={hanNanPct}
          leftHint="한"
          midHint="중화"
          rightHint="난"
          gradientClass="bg-gradient-to-r from-blue-500 via-neutral-200 to-red-500"
        />
        {/* 조습: 0=습(Teal/Navy) → 100=조(Orange/Brown) */}
        <BiBar
          label="조습 (습도)"
          percent={joSeupPct}
          leftHint="습"
          midHint="중화"
          rightHint="조"
          gradientClass="bg-gradient-to-r from-teal-600 via-neutral-200 to-orange-600"
        />
      </div>

      {/* 하단 통합 코멘트 카드 */}
      <div className="p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-100 dark:border-neutral-800">
        <p className="text-[11.5px] text-neutral-600 dark:text-neutral-400 leading-relaxed text-center font-medium">
          <span className="text-neutral-400 mr-2">한줄 코멘트:</span>
          {climateComment}
        </p>
      </div>
    </div>
  );
}