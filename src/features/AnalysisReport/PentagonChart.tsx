// features/AnalysisReport/PentagonChart.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import type { PowerData, TenGod, Element } from "./utils/types";

type PerStemElement = Record<string, number>; // 예: { "갑목": 23.5, "을목": 12.1, "경금": 18, ... }

/** 천간(한글) → 오행 */
const STEM_TO_ELEMENT_KO: Record<string, Element> = {
  갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토", 경: "금", 신: "금", 임: "수", 계: "수",
};
/** 생/극 표 */
const SHENG_NEXT: Record<Element, Element> = { 목: "화", 화: "토", 토: "금", 금: "수", 수: "목" };
const SHENG_PREV: Record<Element, Element> = { 화: "목", 토: "화", 금: "토", 수: "금", 목: "수" };
const KE:         Record<Element, Element> = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
const KE_REV:     Record<Element, Element> = { 토: "목", 금: "화", 수: "토", 목: "금", 화: "수" }; // 나를 극하는 것

function isElement(x: unknown): x is Element {
  return x === "목" || x === "화" || x === "토" || x === "금" || x === "수";
}
function lastCharElement(label: string): Element | null {
  const ch = label.slice(-1);
  return isElement(ch) ? ch : null;
}
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

export default function PentagonChart({
  data,
  perStemElement,     // 세부 오행(갑목/을목/…) 스케일된 값 (computePowerDataDetailed에서 내려줌)
  dayStem,            // 일간 천간(예: '갑')
  width = 280,
  height = 280,
  revKey,             // 외부에서 강제 리마운트 트리거용
  // 운/타이틀/시그니처용 (렌더에 직접 쓰지 않더라도 시그니처에 포함)
  pillars,
  daewoonGz,
  sewoonGz,
  wolwoonGz,
  yearGZ,
  monthGZ,
}: {
  data: PowerData[];
  perStemElement?: PerStemElement;
  dayStem?: string | null;
  width?: number;
  height?: number;
  revKey?: string | number;
  pillars?: string[] | null;
  daewoonGz?: string | null;
  sewoonGz?: string | null;
  wolwoonGz?: string | null;
  yearGZ?: string | null;
  monthGZ?: string | null;
}) {
  const sizeW = width, sizeH = height;
  const cx = sizeW / 2, cy = sizeH / 2;
  const r = Math.min(sizeW, sizeH) * 0.37;

  // 리마운트 시그니처: 운/기둥/전역피커 값들까지 모두 포함
  const sig = useMemo(() => {
    const dataSig = data.map((d) => `${d.name}:${d.value}`).join(",");
    const perSig = perStemElement
      ? Object.entries(perStemElement)
          .sort(([a],[b]) => a.localeCompare(b))
          .map(([k,v]) => `${k}:${v}`)
          .join(",")
      : "none";
    const pillarsSig = Array.isArray(pillars) ? pillars.join("") : "";
    const luckSig = [daewoonGz ?? "", sewoonGz ?? "", wolwoonGz ?? ""].join("|");
    const pickerSig = [yearGZ ?? "", monthGZ ?? ""].join("|");
    return [revKey ?? "", dataSig, perSig, dayStem ?? "", pillarsSig, luckSig, pickerSig].join("||");
  }, [revKey, data, perStemElement, dayStem, pillars, daewoonGz, sewoonGz, wolwoonGz, yearGZ, monthGZ]);

  const [version, setVersion] = useState(0);
  const lastSigRef = useRef<string>("");
  useEffect(() => {
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      setVersion((v) => v + 1); // <svg key={version}> 리마운트
    }
  }, [sig]);

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

  // 일간 오행
  const dayEl: Element | null = useMemo(() => {
    const st = (dayStem ?? "").charAt(0);
    return STEM_TO_ELEMENT_KO[st] ?? null;
  }, [dayStem]);

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
              markerEnd="url(#arrow)"
            />
          );
        })}

        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#ef4444" />
          </marker>
        </defs>

        {/* 노드 + 세부(갑목/을목 …) */}
        {points.map((p) => {
          const god = p.name as TenGod;
          const items: Array<[string, number]> = (() => {
            if (!perStemElement || !dayEl) return [];
            const targetEl = elementOfGod(god, dayEl);
            return Object.entries(perStemElement)
              .filter(([label]) => lastCharElement(label) === targetEl)
              .sort(([, va], [, vb]) => (vb as number) - (va as number))
              .slice(0, 3) as Array<[string, number]>;
          })();

          return (
            <g key={`${p.name}-${p.value}`} transform={`translate(${p.x},${p.y})`}>
              <circle r={33} fill={p.color as string} opacity={p.value === 0 ? 0.7 : 1} />
              <text textAnchor="middle" dy="-6" fontSize="14" className="fill-white font-semibold">
                {p.name} {Math.round(p.value)}
              </text>

              {items.map(([label, val], idx) => (
                <text
                  key={label}
                  textAnchor="middle"
                  dy={8 + idx * 11}
                  fontSize="10"
                  className="fill-white"
                >
                  {label} {Math.round(val * 10) / 10}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
