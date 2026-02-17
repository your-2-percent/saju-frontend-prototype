import { useMemo, useState, useEffect } from "react";
import { clamp01, getShinCategory, ShinCategory } from "@/analysisReport/calc/logic/shinStrength";

const TICKS = [10, 20, 35, 45, 55, 65, 80];

export default function StrengthBar({ value, deukFlags, strongestOpponent }: { 
  value: number; 
  deukFlags?: { 령: boolean; 지: boolean; 세: boolean };
  strongestOpponent?: string;
}) {
  const [animate, setAnimate] = useState(false);
  const percent = useMemo(() => clamp01(value), [value]);
  const category: ShinCategory = useMemo(() => getShinCategory(percent), [percent]);

  useEffect(() => {
    setAnimate(true);
  }, []);

  // 수치 구간별 동적 설명 생성
  const description = useMemo(() => {
    if (percent >= 80) return {
      tag: "극신강",
      desc: "자기 주관이 매우 뚜렷하고 독립적인 개척자 타입입니다.",
      advice: "넘치는 에너지를 관성(규율)이나 식상(재능)으로 분출하는 것이 좋습니다."
    };
    if (percent >= 55) return {
      tag: "신강",
      desc: "에너지가 탄탄하여 환경을 주도적으로 이끌어가는 힘이 있습니다.",
      advice: "자신의 재능을 결과물로 만들어내는 실행력이 필요한 시점입니다."
    };
    if (percent >= 45) return {
      tag: "중화",
      desc: "내면의 힘이 조화로워 주변 환경과 균형을 잘 맞추는 타입입니다.",
      advice: "안정적인 흐름을 유지하며 기회를 포착하는 유연함이 장점입니다."
    };
    if (percent >= 20) return {
      tag: "신약",
      desc: "공감 능력이 좋고 타인의 의견을 수용하는 유연함이 돋보입니다.",
      advice: "인성(학문)이나 비겁(동료)의 도움을 통해 내실을 다지면 큰 성취를 이룹니다."
    };
    return {
      tag: "극신약",
      desc: "감수성이 예민하고 환경의 변화를 민감하게 포착하는 능력이 있습니다.",
      advice: "자신을 보호해주는 귀인의 조력이나 전문적인 지식을 쌓는 것이 유리합니다."
    };
  }, [percent]);

  // 상세 분석 멘트 생성
  const detailAnalysis = useMemo(() => {
    if (!deukFlags) return null;
    
    const isShinGang = percent >= 50; // 50% 이상이면 신강 성향
    const parts: string[] = [];

    if (isShinGang) {
      parts.push("인성과 비겁의 세력이 뭉쳐 자신의 자아가 강하며,");
      
      const reasons: string[] = [];
      if (deukFlags.령) reasons.push("득령(월지)");
      if (deukFlags.지) reasons.push("득지(일지)");
      if (deukFlags.세) reasons.push("득세");
      
      if (reasons.length > 0) {
        parts.push(`${reasons.join("·")}하여 신강 쪽에 가까운 명식입니다.`);
      } else {
        parts.push("전반적인 세력이 두터운 명식입니다.");
      }
    } else {
      // 신약
      const opp = strongestOpponent || "식재관";
      parts.push(`${opp}의 영향이 강하고`);
      
      if (!deukFlags.령) parts.push("실령,");
      if (!deukFlags.지) parts.push("실지하여");
      parts.push("신약 쪽에 가까운 명식입니다.");
    }

    return parts.join(" ").replace(" ,", ",");
  }, [percent, deukFlags, strongestOpponent]);

  return (
    <div className="w-full p-6 bg-white dark:bg-neutral-900 rounded-3xl shadow-lg border border-neutral-100 dark:border-neutral-800">
      {/* 상단 라벨 섹션 */}
      <div className="flex justify-between items-end mb-6">
        <div>
          <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 leading-tight">신약 · 신강 분석 레포트</h3>
          <p className="text-[10px] text-neutral-400 uppercase tracking-tighter">자아의 강도 분석</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-black text-neutral-800 dark:text-white">{percent.toFixed(0)}</span>
          <span className="text-xs font-bold text-neutral-500">%</span>
        </div>
      </div>

      {/* 바 영역 */}
      <div className="relative mb-8 pt-4">
        {/* 상단 구간 텍스트 */}
        <div className="flex justify-between text-[10px] font-bold text-neutral-400 mb-2 px-1">
          <span>신약</span>
          <span className="translate-x-1">중화</span>
          <span>신강</span>
        </div>

        {/* 메인 바 */}
        <div className="relative h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-visible shadow-inner">
          {/* 그라데이션 배경 */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 via-emerald-400 via-yellow-400 to-red-500 opacity-80" />
          
          {/* 눈금 표시 */}
          {TICKS.map((t) => (
            <div
              key={t}
              className="absolute top-0 h-3 w-[1.5px] bg-white/30 dark:bg-black/20"
              style={{ left: `${t}%` }}
            />
          ))}
          <div className="absolute left-1/2 top-0 w-0.5 h-3 bg-white/50 -translate-x-1/2 z-10" />

          {/* 현재 위치 마커 (애니메이션 적용) */}
          <div
            className="absolute -top-1.5 h-6 w-3 bg-white dark:bg-neutral-100 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.3)] border-2 border-neutral-800 dark:border-white z-20 transition-all duration-1000 ease-out"
            style={{ 
              left: animate ? `${percent}%` : "50%", 
              transform: "translateX(-50%)" 
            }}
          >
             <div className="w-full h-full flex items-center justify-center">
                <div className="w-1 h-2 bg-neutral-300 rounded-full" />
             </div>
          </div>
        </div>
      </div>

      {/* 하단 해석 섹션 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-[11px] font-black border-2 ${
            percent >= 55 ? "border-red-500/20 bg-red-50 text-red-600" :
            percent >= 45 ? "border-emerald-500/20 bg-emerald-50 text-emerald-600" :
            "border-blue-500/20 bg-blue-50 text-blue-600"
          }`}>
            {description.tag} ({category})
          </div>
          <div className="h-[1px] flex-1 bg-neutral-100 dark:bg-neutral-800" />
        </div>
        
        <div className="px-1">
          <p className="text-[12px] text-neutral-700 dark:text-neutral-300 font-bold leading-snug mb-1">
            {description.desc}
          </p>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed italic">
            💡 {description.advice}
          </p>
        </div>

        {/* 상세 분석 멘트 추가 */}
        {detailAnalysis && (
          <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
            <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <span className="font-bold text-neutral-500 mr-1">분석:</span>
              {detailAnalysis}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}