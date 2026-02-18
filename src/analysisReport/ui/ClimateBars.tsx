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

// 한글 지지 -> 오행/계절 매핑
const BRANCH_INFO: Record<string, { el: string; season: string; name: string }> = {
  인: { el: "목", season: "봄", name: "인목" }, 묘: { el: "목", season: "봄", name: "묘목" }, 진: { el: "토", season: "봄", name: "진토" },
  사: { el: "화", season: "여름", name: "사화" }, 오: { el: "화", season: "여름", name: "오화" }, 미: { el: "토", season: "여름", name: "미토" },
  신: { el: "금", season: "가을", name: "신금" }, 유: { el: "금", season: "가을", name: "유금" }, 술: { el: "토", season: "가을", name: "술토" },
  해: { el: "수", season: "겨울", name: "해수" }, 자: { el: "수", season: "겨울", name: "자수" }, 축: { el: "토", season: "겨울", name: "축토" },
};

// 간단 합국 감지 (텍스트 생성용)
function detectSimpleHap(branches: string[]) {
  const bSet = new Set(branches);
  if (bSet.has("해") && bSet.has("묘")) return "해묘 반합으로 목국을 이루어";
  if (bSet.has("인") && bSet.has("오")) return "인오 반합으로 화국을 이루어";
  if (bSet.has("사") && bSet.has("유")) return "사유 반합으로 금국을 이루어";
  if (bSet.has("신") && bSet.has("자")) return "신자 반합으로 수국을 이루어";
  return "";
}

function generateClimateDetail(natal: Pillars4, hanNan: number, joSeup: number) {
  const monthBranch = natal[1]?.charAt(1) || "";
  const info = BRANCH_INFO[monthBranch];
  const branches = natal.map(p => p.charAt(1)).filter(Boolean);
  
  let tempDesc = "";
  let wetDesc = "";

  // 1. 온도(한난) 분석
  if (info) {
    tempDesc = `${info.season}의 기운(${info.name})을 월령으로 취하고, `;
    
    const hapMsg = detectSimpleHap(branches);
    if (hapMsg) {
      tempDesc += `${hapMsg} `;
    }

    if (hanNan >= 60) {
      tempDesc += "난(따뜻한) 편에 속합니다.";
    } else if (hanNan <= 40) {
      tempDesc += "한(차가운) 편에 속합니다.";
    } else {
      tempDesc += "한난의 균형이 잘 잡혀있습니다.";
    }
  } else {
    tempDesc = "계절의 기운을 판단하기 어렵습니다.";
  }

  // 2. 습도(조습) 분석
  if (joSeup >= 60) {
    wetDesc = "습(축축한) 기운이 강하여 유연하고 수용적인 성향을 보입니다.";
  } else if (joSeup <= 40) {
    wetDesc = "조(건조한) 기운이 강하여 맺고 끊음이 분명하고 담백한 성향입니다.";
  } else {
    wetDesc = "조(마른)와 습(젖은)의 글자들이 잘 어우러져 균형 잡힌 명식입니다.";
  }

  return { tempDesc, wetDesc };
}

/** 조후 두 줄 바: 한난/조습 */
export default function ClimateBars({ natal }: { natal: Pillars4 }) {
  const { hanNanPct, joSeupPct } = useClimatePercents(natal);

  const climateComment = useMemo(() => {
    let comment = "";
    if (hanNanPct > 60) comment += "온화하고 열정적인 기운이 가득하며, ";
    else if (hanNanPct < 40) comment += "차분하고 냉철한 기운이 지배적이며, ";
    else comment += "적절한 온도감을 갖춘 중화된 환경이며, ";

    if (joSeupPct > 60) comment += "수용성이 좋고 유연한 관계 맺기에 유리한 환경입니다.";
    else if (joSeupPct < 40) comment += "활동이 활발하고 결실을 맺기에 유리한 환경입니다.";
    else comment += "치우침 없는 쾌적한 심리 상태를 보입니다.";
    
    return comment;
  }, [hanNanPct, joSeupPct]);

  const { tempDesc, wetDesc } = useMemo(() => generateClimateDetail(natal, hanNanPct, joSeupPct), [natal, hanNanPct, joSeupPct]);

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
        {/* 조습: 0=조(Orange/Brown) → 100=습(Teal/Navy) */}
        <BiBar
          label="조습 (습도)"
          percent={joSeupPct}
          leftHint="조"
          midHint="중화"
          rightHint="습"
          gradientClass="bg-gradient-to-r from-orange-600 via-neutral-200 to-teal-600"
        />
      </div>

      {/* 상세 분석 텍스트 */}
      <div className="space-y-2 p-4 bg-neutral-50 dark:bg-neutral-800/30 rounded-2xl border border-neutral-100 dark:border-neutral-800">
        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
          <span className="font-bold text-blue-500 mr-1">온도:</span>
          {tempDesc}
        </p>
        <div className="h-px bg-neutral-200 dark:bg-neutral-700/50" />
        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
          <span className="font-bold text-teal-600 mr-1">습도:</span>
          {wetDesc}
        </p>
        <div className="h-px bg-neutral-200 dark:bg-neutral-700/50" />
        <p className="text-[11px] text-neutral-500 dark:text-neutral-500 leading-relaxed italic">
          <span className="font-bold mr-1">종합:</span>
          {climateComment.replace(/, $/,".")}
        </p>
      </div>
    </div>
  );
}
