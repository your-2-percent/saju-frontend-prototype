// features/AnalysisReport/PentagonChart.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { PowerData, TenGod, Element } from "./utils/types";

/** 10간 라벨 → 오행 */
const ALL_STEMS = [
  "갑목","을목","병화","정화",
  "무토","기토","경금","신금",
  "임수","계수",
] as const;
type StemSub = typeof ALL_STEMS[number];

const STEM_TO_ELEMENT_FULL: Record<StemSub, Element> = {
  갑목: "목", 을목: "목",
  병화: "화", 정화: "화",
  무토: "토", 기토: "토",
  경금: "금", 신금: "금",
  임수: "수", 계수: "수",
};

/** 일간 한글 한 글자 → 오행 */
const STEM_TO_ELEMENT_KO: Record<string, Element> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토",
  기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
};

/** 상생/상극 표 */
const SHENG_NEXT: Record<Element, Element> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const SHENG_PREV: Record<Element, Element> = { 화: "목", 토: "화", 금: "토", 수: "금", 목: "수" };
const KE:         Record<Element, Element> = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
const KE_REV:     Record<Element, Element> = { 토: "목", 금: "화", 수: "토", 목: "금", 화: "수" };

/** 십신 → 오행(일간 기준) */
function elementOfGod(god: TenGod, dayEl: Element): Element {
  switch (god) {
    case "비겁": return dayEl;              // 나와 같은 오행
    case "식상": return SHENG_NEXT[dayEl]; // 내가 생하는 오행
    case "재성": return KE[dayEl];         // 내가 극하는 오행
    case "관성": return KE_REV[dayEl];     // 나를 극하는 오행
    case "인성": return SHENG_PREV[dayEl]; // 나를 생하는 오행
    default:     return dayEl;
  }
}

/** raw stem 값 (예: { "갑목": 0, "을목": 49.2, "무토": 58.7, ... }) */
type PerStemElement = Partial<Record<StemSub, number>>;

export default function PentagonChart({
  data,                 // 대분류 5 (비겁/식상/재성/관성/인성)
  perStemElementScaled, // 10간 분해값(이미 totals에 정합되도록 스케일됨)
  elementPercent, 
  dayStem,              // 일간(예: "갑")
  width = 280,
  height = 280,
  revKey,
}: {
  data: PowerData[];
  perStemElementScaled?: PerStemElement;
  elementPercent?: Record<Element, number>;
  dayStem?: string | null;
  width?: number;
  height?: number;
  revKey?: string | number;
}) {
  // 사이즈/중심/반지름
  const sizeW = width, sizeH = height;
  const cx = sizeW / 2, cy = sizeH / 2;
  const r = Math.min(sizeW, sizeH) * 0.37;

  /** 일간 오행 */
  const dayEl: Element | null = useMemo(() => {
    const st = (dayStem ?? "").charAt(0);
    return STEM_TO_ELEMENT_KO[st] ?? null;
  }, [dayStem]);

  /** 펜타곤 꼭짓점 좌표 */
  const angle = (i: number) => Math.PI / 2 + (2 * -Math.PI * i) / 5;
  const points = useMemo(
    () =>
      data.map((d, i) => ({
        ...d,
        x: cx + r * Math.cos(angle(i)),
        y: cy - r * Math.sin(angle(i)),
      })),
    [data, cx, cy, r]
  );

  // 리마운트 키 (안정 렌더)
  const [version, setVersion] = useState(0);
  const lastSigRef = useRef<string>("");
  const sig = useMemo(() => {
    const dataSig = data.map((d) => `${d.name}:${d.value}`).join(",");
    const stemSig = ALL_STEMS.map((k) => `${k}:${perStemElementScaled?.[k] ?? 0}`).join(",");
    //return [revKey ?? "", dataSig, stemSig, dayStem ?? ""].join("||");
    const elSig = elementPercent
      ? `목:${elementPercent.목 ?? 0},화:${elementPercent.화 ?? 0},토:${elementPercent.토 ?? 0},금:${elementPercent.금 ?? 0},수:${elementPercent.수 ?? 0}`
      : "el:none";
    return [revKey ?? "", dataSig, stemSig, elSig, dayStem ?? ""].join("||");
  }, [revKey, data, perStemElementScaled, dayStem, elementPercent]);

  useEffect(() => {
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      setVersion((v) => v + 1);
    }
  }, [sig]);

  return (
    <div className="w-full">
      <svg key={version} width={sizeW} height={sizeH} className="mx-auto pt-2">
        {/* 상극(별) */}
        {points.map((p, i) => {
          const target = points[(i + 2) % 5];
          return (
            <line
              key={`line-${i}`}
              x1={p.x}
              y1={p.y}
              x2={target.x}
              y2={target.y}
              stroke="#94a3b8"
              strokeWidth={1}
            />
          );
        })}

        {/* 상생(곡선) */}
        {points.map((p, i) => {
          const next = points[(i + 1) % 5];
          const mx = (p.x + next.x) / 2;
          const my = (p.y + next.y) / 2;
          const vx = mx - cx;
          const vy = my - cy;
          const factor = 1.5;
          const qx = cx + vx * factor;
          const qy = cy + vy * factor;
          return (
            <path
              key={`curve-${i}`}
              d={`M${p.x},${p.y} Q${qx},${qy} ${next.x},${next.y}`}
              stroke="#ef4444"
              strokeWidth={1.5}
              fill="none"
              markerEnd="url(#arrow)" />
          );
        })}

        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
          </marker>
        </defs>

        {/* 노드 + 세부(천간 소분류: 항상 두 줄, 0도 표기) */}
        {points.map((p) => {
          const god = p.name as TenGod;             // "비겁" | "식상" | "재성" | "관성" | "인성"
          const el = dayEl ? elementOfGod(god, dayEl) : null;

          // 해당 축 오행에 속한 10간(2개)을 고정 순서로 노출
          const items: Array<[StemSub, number]> = el
            ? (ALL_STEMS
                .filter((st) => STEM_TO_ELEMENT_FULL[st] === el)
                .map((st) => [st, perStemElementScaled?.[st] ?? 0]) as Array<[StemSub, number]>)
            : [];

          return (
            <g key={`${p.name}-${p.value}`} transform={`translate(${p.x},${p.y})`}>
              <circle r={33} fill={(p.color as string) ?? "#334155"} opacity={p.value === 0 ? 0.7 : 1} />
              <text textAnchor="middle" dy="-6" fontSize={14} className="fill-white font-semibold">
                {p.name} {p.value}
              </text>

              {items.map(([label, val], idx) => (
                <text
                  key={label}
                  textAnchor="middle"
                  dy={8 + idx * 11}
                  fontSize={10}
                  className="fill-white"
                >
                  {label} {Math.round(val)}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
