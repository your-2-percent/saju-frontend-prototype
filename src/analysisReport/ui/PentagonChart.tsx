import { useMemo } from "react";
import type { PowerData, TenGod, Element } from "@/analysisReport/calc/utils/types";

/** 1. 타입 정의 */
const ALL_STEMS = [
  "갑목", "을목", "병화", "정화",
  "무토", "기토", "경금", "신금",
  "임수", "계수",
] as const;

type StemSub = typeof ALL_STEMS[number];

interface PentagonPoint extends PowerData {
  x: number;
  y: number;
  angle: number;
}

type PerStemElement = Partial<Record<StemSub, number>>;

/** 2. 상수 및 매핑 로직 */
const STEM_TO_ELEMENT_FULL: Record<StemSub, Element> = {
  갑목: "목", 을목: "목", 병화: "화", 정화: "화",
  무토: "토", 기토: "토", 경금: "금", 신금: "금",
  임수: "수", 계수: "수",
};

const STEM_TO_ELEMENT_KO: Record<string, Element> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토",
  기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
};

const SHENG_NEXT: Record<Element, Element> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const KE: Record<Element, Element> = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
const KE_REV: Record<Element, Element> = { 토: "목", 금: "화", 수: "토", 목: "금", 화: "수" };

function elementOfGod(god: TenGod, dayEl: Element): Element {
  switch (god) {
    case "비겁": return dayEl;
    case "식상": return SHENG_NEXT[dayEl];
    case "재성": return KE[dayEl];
    case "관성": return KE_REV[dayEl];
    case "인성": return SHENG_PREV_LOCAL[dayEl];
    default: return dayEl;
  }
}
const SHENG_PREV_LOCAL: Record<Element, Element> = { 화: "목", 토: "화", 금: "토", 수: "금", 목: "수" };

/** 3. 메인 컴포넌트 */
export default function PentagonChart({
  data,
  perStemElementScaled,
  dayStem,
  yongshinTop,
  yongshinKind,
  width = 340,
  height = 360, // 하단 라벨 공간 확보를 위해 높이 소폭 상향
}: {
  data: PowerData[];
  perStemElementScaled?: PerStemElement;
  dayStem?: string | null;
  yongshinTop?: string | null;
  yongshinKind?: string | null;
  width?: number;
  height?: number;
}) {
  const cx = width / 2;
  const cy = height / 2 - 20; // 전체적으로 살짝 위로 올림
  const r = Math.min(width, height) * 0.33;

  const dayEl: Element | null = useMemo(() => {
    const st = (dayStem ?? "").charAt(0);
    return STEM_TO_ELEMENT_KO[st] ?? null;
  }, [dayStem]);

  const points: PentagonPoint[] = useMemo(
    () => data.map((d, i) => {
      const angle = Math.PI / 2 + (2 * -Math.PI * i) / 5;
      return {
        ...d,
        angle,
        x: cx + r * Math.cos(angle),
        y: cy - r * Math.sin(angle),
      };
    }),
    [data, cx, cy, r]
  );

  const parseElement = (label: string | null | undefined): Element | null => {
    if (!label) return null;
    if (label.includes("목")) return "목";
    if (label.includes("화")) return "화";
    if (label.includes("토")) return "토";
    if (label.includes("금")) return "금";
    if (label.includes("수")) return "수";
    return null;
  };

  const mapElementToTenGod = (dayEl: Element, el: Element): TenGod => {
    if (el === dayEl) return "비겁";
    if (SHENG_NEXT[dayEl] === el) return "식상";
    if (KE[dayEl] === el) return "재성";
    if (KE_REV[dayEl] === el) return "관성";
    if (SHENG_PREV_LOCAL[dayEl] === el) return "인성";
    return "비겁";
  };

  const analysisReport = useMemo(() => {
    if (!data || data.length === 0) return null;
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const strongest = sorted[0];
    const weakest = sorted[sorted.length - 1];
    const fallbackName = weakest?.name ?? "";
    const yongEl = parseElement(yongshinTop);
    const targetName = dayEl && yongEl ? mapElementToTenGod(dayEl, yongEl) : fallbackName;

    const summary =
      yongshinKind === "GYEOKGUK"
        ? `${strongest.name}의 세력이 가장 뚜렷하며, 중심기운을 용신으로 삼아 ${strongest.name}을 주기운으로 채택합니다.`
        : `${strongest.name}의 세력이 가장 뚜렷하며, 상대적으로 ${targetName}의 기운이 보완을 필요로 하는 흐름입니다.`;

    return {
      summary,
      advice: strongest.value > 45 
        ? `${strongest.name}의 에너지가 강하므로 이를 적절히 소통시키는 활동이 운의 흐름을 돕습니다.`
        : "오행의 에너지가 전반적으로 고르게 분포되어 균형 잡힌 명식입니다."
    };
  }, [data, dayEl, yongshinTop, yongshinKind]);

  return (
    <div className="w-full flex flex-col items-center p-6 bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-xl tracking-tighter transition-colors">
      {/* 헤더 */}
      <div className="text-center mb-4">
        <h3 className="text-lg font-black text-neutral-800 dark:text-neutral-100">
          {dayStem}일간 오행 순환도
        </h3>
      </div>

      {/* SVG 차트 영역 */}
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <marker id="arrow" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <path d="M0,0 L10,3.5 L0,7 Z" fill="#94a3b8" opacity="0.4" />
          </marker>
        </defs>

        {/* 상극 가이드 (점선 별) */}
        {points.map((p, i) => {
          const target = points[(i + 2) % 5];
          return (
            <line
              key={`line-ke-${i}`}
              x1={p.x} y1={p.y} x2={target.x} y2={target.y}
              stroke="currentColor"
              className="text-neutral-200 dark:text-neutral-800"
              strokeWidth={1.5}
              strokeDasharray="4 4"
            />
          );
        })}

        {/* 상생 곡선 (에너지 흐름) */}
        {points.map((p, i) => {
          const next = points[(i + 1) % 5];
          const mx = (p.x + next.x) / 2;
          const my = (p.y + next.y) / 2;
          const vx = mx - cx;
          const vy = my - cy;
          const qx = cx + vx * 1.45;
          const qy = cy + vy * 1.45;
          return (
            <path
              key={`path-sheng-${i}`}
              d={`M${p.x},${p.y} Q${qx},${qy} ${next.x},${next.y}`}
              stroke="#94a3b8"
              strokeWidth={2}
              strokeOpacity={0.25}
              fill="none"
              markerEnd="url(#arrow)"
            />
          );
        })}

        {/* 오행 노드 렌더링 */}
        {points.map((p) => {
          const god = p.name as TenGod;
          const el = dayEl ? elementOfGod(god, dayEl) : null;
          const items: Array<[StemSub, number]> = el 
            ? ALL_STEMS
                .filter((st) => STEM_TO_ELEMENT_FULL[st] === el)
                .map((st) => [st, perStemElementScaled?.[st] ?? 0])
            : [];

          return (
            <g key={p.name} transform={`translate(${p.x},${p.y})`}>
              {/* 메인 노드 원 (Glow 제거, 선명한 단색+미세한 보더) */}
              <circle r={40} fill={p.color as string} className="stroke-white/20 dark:stroke-black/20" strokeWidth={1} />
              <circle r={40} fill="black" opacity={0.05} />
              
              <text textAnchor="middle" dy="-5" fontSize={15} className="fill-white font-black">
                {p.name}
              </text>
              <text textAnchor="middle" dy="15" fontSize={13} className="fill-white/90 font-bold">
                {p.value}%
              </text>

              {/* 하단 천간 배지 (0 포함) */}
              <g transform="translate(0, 48)"> 
                {items.map(([label, val], idx) => {
                  const stemName = label.charAt(0);
                  const stemVal = Math.round(val);
                  const isZero = stemVal === 0;

                  return (
                    <g key={label} transform={`translate(${(idx === 0 ? -1 : 1) * 25}, 0)`}>
                      <rect 
                        x="-21" y="0" width="42" height="21" rx="10.5" 
                        fill={isZero ? "rgba(0,0,0,0.1)" : "rgba(0,0,0,0.3)"} 
                      />
                      <text
                        textAnchor="middle"
                        y="14.5"
                        fontSize={12} 
                        className={`font-black ${isZero ? "fill-neutral-400 dark:fill-neutral-500" : "fill-white"}`}
                      >
                        <tspan>{stemName}</tspan>
                        <tspan dx="1">{stemVal}</tspan>
                      </text>
                    </g>
                  );
                })}
              </g>
            </g>
          );
        })}
      </svg>

      {/* 하단 리포트 */}
      {analysisReport && (
        <div className="w-full mt-6 space-y-3">
          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl border border-neutral-100 dark:border-neutral-800 text-center">
            <p className="text-[12px] text-neutral-700 dark:text-neutral-300 font-bold">
              {analysisReport.summary}
            </p>
          </div>
          <div className="px-4 py-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/30 text-center">
            <p className="text-[11.5px] text-blue-700 dark:text-blue-300 font-bold">
              💡 {analysisReport.advice}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
