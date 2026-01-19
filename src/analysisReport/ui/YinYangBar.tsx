import { useMemo, useState, useEffect } from "react";

/**
 * 1. 명리학적 가중치 및 설정 데이터
 */
const WEIGHTS_MODERN = {
  year: { stem: 10, branch: 10 },
  month: { stem: 15, branch: 30 }, // 월지의 중요성 반영
  day: { stem: 25, branch: 25 },
  hour: { stem: 15, branch: 15 },
};

const POSITION_KEYS = ["year", "month", "day", "hour"] as const;

// 본질(ESSENCE): 십천간 자체의 음양 (갑을병정무-양 / 기경신임계-음)
const ESSENCE_YANG = new Set(["갑", "을", "병", "정", "무"]);

// 성질(NATURE): 역학적 운동성 음양 (갑병무경임-양 / 을정기신계-음)
const NATURE_YANG = new Set(["갑", "병", "무", "경", "임"]);

// 지지의 지장간 중 정기(Main) 연결
const BRANCH_MAIN_STEM: Record<string, string> = {
  자: "계", 축: "기", 인: "갑", 묘: "을", 진: "무", 사: "병", 
  오: "정", 미: "기", 신: "경", 유: "신", 술: "무", 해: "임"
};

// 조후 보정(SEASONAL BIAS): 월지 계절에 따른 기운 보정치
const SEASONAL_BIAS: Record<string, number> = {
  사: 5, 오: 7, 미: 5,  // 여름: 양기 강화
  해: -5, 자: -7, 축: -5 // 겨울: 음기 강화
};

/**
 * 2. 메인 컴포넌트
 */
export default function YinYangBar({
  natal,
  perStemElementScaled,
}: {
  natal?: string[];
  perStemElementScaled?: Record<string, number>;
}) {
  const [animate, setAnimate] = useState(false);

  // 마운트 시 애니메이션 트리거
  useEffect(() => {
    const timer = setTimeout(() => setAnimate(true), 100);
    return () => clearTimeout(timer);
  }, [natal]);

  /**
   * 3. 핵심 분석 로직
   */
  const analysis = useMemo(() => {
    if (!perStemElementScaled || !natal || natal.length < 4) return null;

    // A. 베이스 데이터(20%) 분석
    let bYang = 0, bYin = 0;
    Object.entries(perStemElementScaled).forEach(([label, score]) => {
      if (NATURE_YANG.has(label.charAt(0))) bYang += score; else bYin += score;
    });
    const baseDiff = (bYang + bYin) > 0 ? (bYang - bYin) / (bYang + bYin) : 0;

    // B. 본질(30%) & 성질(30%) 분석
    let eYang = 0, eYin = 0;
    let nYang = 0, nYin = 0;
    natal.forEach((pillar) => {
      [pillar[0], BRANCH_MAIN_STEM[pillar[1]]].forEach(s => {
        if (!s) return;
        if (ESSENCE_YANG.has(s)) eYang += 1; else eYin += 1;
        if (NATURE_YANG.has(s)) nYang += 1; else nYin += 1;
      });
    });
    const essenceDiff = (eYang + eYin) > 0 ? (eYang - eYin) / (eYang + eYin) : 0;
    const natureDiff = (nYang + nYin) > 0 ? (nYang - nYin) / (nYang + nYin) : 0;

    // C. 자리 가중치(20%) 분석
    let pYang = 0, pYin = 0;
    natal.forEach((pillar, idx) => {
      const posKey = POSITION_KEYS[idx];
      const sW = WEIGHTS_MODERN[posKey].stem;
      const bW = WEIGHTS_MODERN[posKey].branch;
      if (NATURE_YANG.has(pillar[0])) pYang += sW; else pYin += sW;
      const main = BRANCH_MAIN_STEM[pillar[1]];
      if (main && NATURE_YANG.has(main)) pYang += bW; else pYin += bW;
    });
    const positionDiff = (pYang + pYin) > 0 ? (pYang - pYin) / (pYang + pYin) : 0;

    // D. 계절 보정치 적용
    const monthBranch = natal[1]?.charAt(1);
    const seasonCorrection = (SEASONAL_BIAS[monthBranch] || 0) / 100;

    // E. 최종 통합 계산
    const totalDiff = (essenceDiff * 0.3) + (natureDiff * 0.3) + (baseDiff * 0.2) + (positionDiff * 0.2) + seasonCorrection;
    const yangPercent = (Math.min(1, Math.max(-1, totalDiff)) + 1) * 50;
    const harmonyScore = 100 - Math.abs(yangPercent - 50) * 2;

    return {
      yang: yangPercent,
      yin: 100 - yangPercent,
      essencePos: (essenceDiff + 1) * 50,
      naturePos: (natureDiff + 1) * 50,
      harmony: harmonyScore,
      category: yangPercent >= 55 ? "양" : yangPercent <= 45 ? "음" : "중용"
    };
  }, [natal, perStemElementScaled]);

  /**
   * 4. 다이나믹 설명 문구 생성
   */
  const dynamicText = useMemo(() => {
    if (!analysis) return null;
    const { yang, essencePos, naturePos, category, harmony } = analysis;
    const diff = Math.abs(essencePos - naturePos);

    // 기운 성향 상세
    let natureDetail = "";
    if (category === "중용") {
      natureDetail = "음과 양이 황금비를 이루어 감정의 동요가 적고 환경 적응력이 매우 뛰어난 균형 잡힌 인격을 가집니다.";
    } else if (category === "양") {
      natureDetail = yang > 75 
        ? "매우 강력한 발산의 기운을 가졌습니다. 거침없는 추진력과 에너지가 넘치나 때로는 휴식이 필요합니다."
        : "주도적이고 활동적인 에너지로 새로운 길을 개척하고 주변을 리드하는 힘이 탁월합니다.";
    } else {
      natureDetail = yang < 25
        ? "깊고 응축된 수렴의 기운을 가졌습니다. 한 분야를 깊게 파고드는 전문가적 기질과 놀라운 집중력을 보여줍니다."
        : "차분하고 내실을 기하는 기운입니다. 실수가 적고 계획적이며 안정적인 성과를 만들어내는 데 강점이 있습니다.";
    }

    // 내외면 일치성
    let consistencyDetail = "";
    if (diff < 15) {
      consistencyDetail = "본연의 생각과 행동이 일치하는 솔직담백한 타입입니다. 일관된 태도로 주변에 두터운 신뢰를 줍니다.";
    } else if (diff < 40) {
      consistencyDetail = "상황에 따라 유연하게 자신을 변화시키는 입체적인 매력을 가졌습니다. 뛰어난 사회적 처세술을 겸비했습니다.";
    } else {
      consistencyDetail = "내면의 욕구와 드러나는 모습이 매우 다른 반전 매력을 가졌습니다. 남들이 예상치 못한 창의적인 행보를 보입니다.";
    }

    // 조언
    let advice = "";
    if (harmony > 85) advice = "현재 최상의 조화로운 에너지 상태입니다. 지금의 균형을 유지하세요.";
    else if (category === "양") advice = "정적인 명상이나 독서를 통해 과열된 에너지를 한 번씩 가라앉혀 보세요.";
    else advice = "가벼운 유산소 운동이나 야외 활동을 통해 침체된 기운을 환기하는 것이 좋습니다.";

    return { natureDetail, consistencyDetail, advice };
  }, [analysis]);

  if (!analysis || !dynamicText) return null;

  const { yang, yin, essencePos, naturePos, harmony, category } = analysis;

  return (
    <div className="w-full p-6 bg-white dark:bg-neutral-900 rounded-3xl shadow-xl border border-neutral-100 dark:border-neutral-800">
      {/* 1. 헤더 */}
      <div className="flex justify-between items-start mb-10">
        <div>
          <h3 className="text-lg font-bold text-neutral-800 dark:text-neutral-100 leading-tight">음양 에너지 분석 리포트</h3>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl text-center border border-emerald-100 dark:border-emerald-800/50">
          <div className="text-[9px] font-bold text-emerald-600 mb-0.5 uppercase">조화</div>
          <div className="text-base font-black text-emerald-500 leading-none">{harmony.toFixed(0)}%</div>
        </div>
      </div>

      {/* 2. 에너지 바 세션 (수직 분리 마커) */}
      <div className="relative mb-14 px-1">
        {/* 내면 마커 (위) */}
        {animate && (
          <div 
            className="absolute -top-8 transition-all duration-1000 ease-out flex flex-col items-center"
            style={{ left: `${essencePos}%`, transform: "translateX(-50%)" }}
          >
            <span className="text-[10px] font-bold text-blue-500 mb-1">내면</span>
            <div className="w-[1.5px] h-3 bg-blue-500/40 rounded-full" />
          </div>
        )}

        {/* 바 본체 */}
        <div className="relative w-full h-8 bg-neutral-100 dark:bg-neutral-800 rounded-2xl flex overflow-hidden shadow-inner border-[3px] border-white dark:border-neutral-900">
          <div 
            className="h-full bg-blue-500 transition-all duration-1000 ease-out" 
            style={{ width: animate ? `${yin}%` : "50%" }} 
          />
          <div 
            className="h-full bg-red-500 transition-all duration-1000 ease-out" 
            style={{ width: animate ? `${yang}%` : "50%" }} 
          />
          {/* 중앙 기준선 */}
          <div className="absolute left-1/2 top-0 w-[1px] h-full bg-white/30 -translate-x-1/2 z-10" />
        </div>

        {/* 외면 마커 (아래) */}
        {animate && (
          <div 
            className="absolute -bottom-8 transition-all duration-1000 ease-out flex flex-col items-center"
            style={{ left: `${naturePos}%`, transform: "translateX(-50%)" }}
          >
            <div className="w-[1.5px] h-3 bg-red-500/40 rounded-full" />
            <span className="text-[10px] font-bold text-red-500 mt-1">외면</span>
          </div>
        )}
      </div>

      {/* 3. 상세 분석 카드 */}
      <div className="space-y-3 mb-5 mt-6">
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800">
          <h4 className="text-[11.5px] font-bold text-neutral-800 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-red-400 rounded-full"></span> 기운의 성향
          </h4>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {dynamicText.natureDetail}
          </p>
        </div>
        
        <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800">
          <h4 className="text-[11.5px] font-bold text-neutral-800 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
            <span className="w-1 h-1 bg-blue-400 rounded-full"></span> 내외면 일치성
          </h4>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {dynamicText.consistencyDetail}
          </p>
        </div>
      </div>

      {/* 4. 푸터 팁 */}
      <div className={`text-center py-3 rounded-xl text-[11px] font-bold tracking-tight shadow-sm ${
        category === "양" ? "bg-red-50 text-red-600 dark:bg-red-950/20" : 
        category === "음" ? "bg-blue-50 text-blue-600 dark:bg-blue-950/20" : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20"
      }`}>
        💡 {dynamicText.advice}
      </div>
    </div>
  );
}