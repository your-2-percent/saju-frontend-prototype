import React, { useEffect, useMemo, useRef, useState } from "react";
import type { PowerData, TenGod } from "./utils/types";
import { useLuckPickerStore } from "@/shared/lib/hooks/useLuckPickerStore";

type SubEntry = {
  a?: string | number;
  b?: string | number;
  aVal?: number | string;
  bVal?: number | string;
} & Record<string, unknown>;

type PerTenGod = Record<TenGod, SubEntry>;

const TEN_GOD_KEYS: TenGod[] = ["비겁", "식상", "재성", "관성", "인성"];

function toNum(v: unknown, d = 0): number {
  if (v == null) return d;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : d;
  }
  if (typeof v === "object") {
    const any = v as Record<string, unknown>;
    for (const k of ["value", "val", "score", "amount"]) {
      if (k in any) return toNum(any[k], d);
    }
  }
  return d;
}

// perTenGod에서 '비겁' 그룹의 (비견/겁재) 서브값을 최대한 유연하게 읽어오기
function readSubFor(
  name: TenGod,
  subsMap: Partial<Record<TenGod, SubEntry>> | null | undefined,
  raw: unknown, // perTenGod 원본(알 수 없는 모양)
  fallbacks: [string, string] // 기본 라벨 ['비견','겁재'] 등
) {
  const [lLabel, rLabel] = fallbacks;

  // 1) 정석: perTenGod['비겁'] 형태
  const hit = subsMap?.[name];
  if (hit) {
    return {
      aLabel: hit.a ?? lLabel,
      bLabel: hit.b ?? rLabel,
      aVal: toNum(hit.aVal, 0),
      bVal: toNum(hit.bVal, 0),
    };
  }

  // 2) 평면 키: perTenGod['비견'], perTenGod['겁재'] 형태
  const any = (raw ?? {}) as Record<string, unknown>;
  const aFlat = any?.[lLabel];
  const bFlat = any?.[rLabel];
  if (aFlat != null || bFlat != null) {
    return {
      aLabel: lLabel,
      bLabel: rLabel,
      aVal: toNum(aFlat, 0),
      bVal: toNum(bFlat, 0),
    };
  }

  // 3) 그룹 안에 라벨 키로 들어온 경우: perTenGod['비겁'] = { 비견: 1, 겁재: 2 }
  const grp = any?.[name] as Record<string, unknown> | undefined;
  if (grp && (grp[lLabel] != null || grp[rLabel] != null)) {
    return {
      aLabel: lLabel,
      bLabel: rLabel,
      aVal: toNum(grp[lLabel], 0),
      bVal: toNum(grp[rLabel], 0),
    };
  }

  // 못 찾으면 0
  return { aLabel: lLabel, bLabel: rLabel, aVal: 0, bVal: 0 };
}

function stableStringify(obj: unknown): string {
  const seen = new WeakSet();

  const sorter = (_key: string, value: unknown): unknown => {
    if (value && typeof value === "object") {
      if (seen.has(value as object)) return;
      seen.add(value as object);

      if (Array.isArray(value)) return value;

      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value as object).sort()) {
        out[key] = (value as Record<string, unknown>)[key];
      }
      return out;
    }
    return value;
  };

  try {
    return JSON.stringify(obj, sorter);
  } catch {
    return String(Math.random());
  }
}

/** 키 보정(공백/제로폭 제거) */
const norm = (s: string | undefined | null) =>
  (s ?? "")
    .normalize("NFKC")
    .replace(/\s+/g, "");

/** perTenGod 키가 살짝 달라도 매칭 */
function coercePerTenGodMap(src?: PerTenGod) {
  if (!src) return null;
  const table = new Map<string, TenGod>();
  TEN_GOD_KEYS.forEach((k) => table.set(norm(k), k));
  const out: Partial<Record<TenGod, SubEntry>> = {};
  for (const rawKey of Object.keys(src)) {
    const hit = table.get(norm(rawKey as TenGod));
    if (hit) out[hit] = src[rawKey as TenGod]!;
  }
  return out;
}

/* ────────────────────────────────────────────
 * 타이틀 유틸: "경신대운" 같은 GZ 추출 + 라벨
 * ──────────────────────────────────────────── */
const STEMS = "갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥";
function extractGZ(raw?: string | null): string | null {
  if (!raw) return null;
  const chars = Array.from(String(raw));
  let s: string | null = null,
    b: string | null = null;
  for (const ch of chars) {
    if (!s && STEMS.includes(ch)) s = ch;
    if (BRANCHES.includes(ch)) b = ch;
  }
  return s && b ? s + b : null;
}

// function buildTitleLine(
//   pillars?: string[] | null,
//   dae?: string | null,
//   se?: string | null,
//   wol?: string | null
// ) {
//   const natal =
//     Array.isArray(pillars) && pillars.length >= 4
//       ? `${pillars[0]}년 ${pillars[1]}월 ${pillars[2]}일 ${pillars[3]}시`
//       : "";

//   const d = extractGZ(dae);
//   const s = extractGZ(se);
//   const w = extractGZ(wol);
//   const extras = [d ? `${d}대운` : null, s ? `${s}세운` : null, w ? `${w}월운` : null].filter(
//     Boolean
//   ) as string[];

//   if (!natal && extras.length === 0) return "";
//   return extras.length > 0 ? `${natal} + ${extras.join(" ")}` : natal;
// }

export default function PentagonChart({
  data,
  perTenGod,
  width = 280,
  height = 280,
  revKey, // 부모에서 운/데이터 변경 시 함께 바꿔주면 리마운트 됨
  // ▼ 타이틀용 원국/운 (없으면 전역 피커로 보완)
  pillars,
  daewoonGz,
  sewoonGz,
  wolwoonGz,
}: {
  data: PowerData[];
  perTenGod?: PerTenGod;
  width?: number;
  height?: number;
  revKey?: string | number;
  /** 예: ['무인','계해','임술','병오'] */
  pillars?: string[] | null;
  /** 예: '경신' */
  daewoonGz?: string | null;
  /** 예: '을사' */
  sewoonGz?: string | null;
  /** 예: '갑신' */
  wolwoonGz?: string | null;
}) {
  // ▼ 전역 피커 구독 — props에 운이 없을 때 타이틀 보완 + 시그니처에 반영
  const { date, yearGZ, monthGZ } = useLuckPickerStore();
  const fallbackSe = useMemo(() => extractGZ(yearGZ) ?? undefined, [yearGZ]);   // 세운 = 연간지
  const fallbackWol = useMemo(() => extractGZ(monthGZ) ?? undefined, [monthGZ]); // 월운 = 월간지
  const pickerSig = useMemo(
    () => [date?.toISOString?.() ?? "", yearGZ ?? "", monthGZ ?? ""].join("|"),
    [date, yearGZ, monthGZ]
  );

  const sizeW = width,
    sizeH = height;
  const cx = sizeW / 2,
    cy = sizeH / 2;
  const r = Math.min(sizeW, sizeH) * 0.37;

  // const defaultSubs = React.useMemo<
  //   Readonly<Record<TenGod, readonly [string, string]>>
  // >(
  //   () => ({
  //     비겁: ["비견", "겁재"],
  //     식상: ["식신", "상관"],
  //     재성: ["정재", "편재"],
  //     관성: ["정관", "편관"],
  //     인성: ["정인", "편인"],
  //   }),
  //   []
  // );

  // 1) 매 렌더마다 최신 맵 재구성 (in-place 업데이트 반영)
  const subsMap = coercePerTenGodMap(perTenGod);

  // 2) 깊은 값 시그니처 생성
  const perSig = stableStringify(
    TEN_GOD_KEYS.map((k) => {
      const s = subsMap?.[k];
      return [k, s?.a, s?.b, Number(s?.aVal ?? 0), Number(s?.bVal ?? 0)];
    })
  );
  const dataSig = stableStringify(data.map((d) => [d.name, d.value]));

  // 운: props 우선, 없으면 전역 피커 보완
  const daeUI = daewoonGz ?? undefined;
  const seUI = sewoonGz ?? fallbackSe ?? undefined;
  const wolUI = wolwoonGz ?? fallbackWol ?? undefined;

  //const titleLine = buildTitleLine(pillars, daeUI ?? null, seUI ?? null, wolUI ?? null);
  const titleSig = stableStringify([pillars ?? [], extractGZ(daeUI), extractGZ(seUI), extractGZ(wolUI)]);

  // 3) 시그니처 변경 시 version 증가 → <svg key={version}>로 리마운트
  const [version, setVersion] = useState(0);
  const lastSigRef = useRef<string>("");
  useEffect(() => {
    const sig = `${revKey ?? ""}||${dataSig}||${perSig}||${titleSig}||${pickerSig}`;
    if (sig !== lastSigRef.current) {
      lastSigRef.current = sig;
      setVersion((v) => v + 1);
    }
  }, [revKey, dataSig, perSig, titleSig, pickerSig]);

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

  return (
    <div className="w-full">
      {/* ▲ 타이틀 */}
      {/* {titleLine && (
        <div className="text-xs text-center text-neutral-700 dark:text-neutral-300 mb-1">
          {titleLine}
        </div>
      )} */}

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

        {/* 노드 */}
        {points.map((p) => {
          const name = p.name as TenGod;
          const defaultSubs: Readonly<Record<TenGod, readonly [string, string]>> = {
            비겁: ["비견", "겁재"],
            식상: ["식신", "상관"],
            재성: ["정재", "편재"],
            관성: ["정관", "편관"],
            인성: ["정인", "편인"],
          };
          const [leftLabel, rightLabel] = defaultSubs[name];

          const { aLabel, bLabel, aVal, bVal } = readSubFor(
            name,
            subsMap,   // 정규화된 perTenGod
            perTenGod, // 원본(평면/라벨키 포함 케이스)
            [leftLabel, rightLabel]
          );

          return (
            <g key={`${p.name}-${aVal}-${bVal}`} transform={`translate(${p.x},${p.y})`}>
              <circle r={33} fill={p.color as string} opacity={p.value === 0 ? 0.7 : 1} />
              <text textAnchor="middle" dy="-6" fontSize="14" className="fill-white font-semibold">
                {p.name} {p.value}
              </text>
              <text textAnchor="middle" dy="8" fontSize="10" className="fill-white">
                {aLabel} {aVal}
              </text>
              <text textAnchor="middle" dy="19" fontSize="10" className="fill-white">
                {bLabel} {bVal}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
