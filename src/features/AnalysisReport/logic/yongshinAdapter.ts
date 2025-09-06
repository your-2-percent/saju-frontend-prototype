// features/AnalysisReport/logic/yongshinAdapter.ts
import { useMemo } from "react";
import type { Element } from "../utils/types";
import { STEM_TO_ELEMENT } from "../utils/hiddenStem";
import { normElLabel } from "./normalize";

/* Yongshin 모듈 가드 */
export type YongshinCall3 = (
  p: [string, string, string, string],
  tenGodTotals?: unknown,
  opts?: { elementScore?: Record<Element, number>; prefer?: "elements" | "ten"; demoteIfAbsent?: boolean; demoteFactor?: number }
) => unknown;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
export function pickYongshinFn(mod: unknown): YongshinCall3 | null {
  if (!isRecord(mod)) return null;
  if (typeof mod["computeYongshin"] === "function") return mod["computeYongshin"] as YongshinCall3;
  if (isRecord((mod).default) && typeof (mod).default.computeYongshin === "function") {
    return (mod).default.computeYongshin as YongshinCall3;
  }
  return null;
}

export type YongshinItem = { element: string; score: number; reasons: string[]; elNorm: Element | null };

function hasProp<K extends string>(obj: unknown, key: K): obj is { [P in K]: unknown } {
  return isRecord(obj) && key in obj;
}
function isRecordArray(v: unknown): v is Array<Record<string, unknown>> {
  return Array.isArray(v) && v.every(isRecord);
}

function officerElementOf(dayEl?: Element | null): Element | null {
  if (!dayEl) return null;
  const pairs = { 목:"토", 화:"금", 토:"수", 금:"목", 수:"화" };
  for (const [x,y] of Object.entries(pairs)) if (y === dayEl) return x as Element;
  return null;
}

export function useYongshinList(
  yongshin: unknown,
  presentMap: Record<Element, boolean>,
  demoteAbsent: boolean,
  elemForFallback: Record<Element, number>,
  activePillars: [string,string,string,string],
  strengthPct: number
): YongshinItem[] {
  return useMemo(() => {
    const raw = hasProp(yongshin, "ordered") && isRecordArray((yongshin).ordered)
      ? ((yongshin).ordered as Array<Record<string, unknown>>)
      : [];

    let list: YongshinItem[] = raw.map((rec) => {
      const elementU = rec["element"];
      const scoreU   = rec["score"];
      const reasonsU = rec["reasons"];

      const element = typeof elementU === "string" ? elementU : "";
      const elNorm  = normElLabel(element);

      const score =
        typeof scoreU === "number" ? scoreU
        : elNorm ? (elemForFallback[elNorm] ?? 0)
        : 0;

      const reasons = Array.isArray(reasonsU)
        ? reasonsU.filter((r): r is string => typeof r === "string")
        : [];

      return { element, elNorm, score, reasons };
    });

    // 부재=0점
    if (demoteAbsent) {
      list = list.map(it =>
        it.elNorm && !presentMap[it.elNorm]
          ? { ...it, score: 0, reasons:[...it.reasons,"부재후순위: 원국 부재 → 0점"] }
          : it
      );
    }

    // 중화 보정
    const dayEl = STEM_TO_ELEMENT[activePillars[2]?.charAt(0)] ?? null;
    const officerEl = officerElementOf(dayEl);
    const isNeutralBand = strengthPct >= 45 && strengthPct <= 55;
    if (isNeutralBand) {
      list = list.map(it => {
        let score = it.score; const reasons = [...it.reasons];
        if (reasons.some(r=>r.includes("억부")) && reasons.length===1) { score*=0.9; reasons.push("중화: 억부 단일 근거 감점"); }
        if (officerEl && it.elNorm===officerEl) { score*=0.9; reasons.push("중화: 관성 과도 방지 감점"); }
        return { ...it, score: Math.round(score*10)/10, reasons };
      });
    }

    // 정렬
    list.sort((a,b)=>{
      if (demoteAbsent) {
        const ap = a.elNorm && presentMap[a.elNorm] ? 1:0;
        const bp = b.elNorm && presentMap[b.elNorm] ? 1:0;
        if (ap!==bp) return bp-ap;
      }
      if ((b.score??0)!==(a.score??0)) return (b.score??0)-(a.score??0);
      return (a.elNorm??a.element).localeCompare(b.elNorm??b.element);
    });

    return list;
  }, [yongshin, presentMap, demoteAbsent, elemForFallback, activePillars, strengthPct]);
}

/* UI 태그 추출 */
export function detectCategoriesFromReasonsUI(reasons?: readonly string[]): string[] {
  const s = (reasons ?? []).join(" ").toLowerCase();
  const out: string[] = [];
  if (/(억부)/.test(s)) out.push("억부");
  if (/(조후|온난|한랭|건조|습윤|온조|조열|냉습|조후상)/.test(s)) out.push("조후");
  if (/(통관|순환|유통|생극순환)/.test(s)) out.push("통관");
  if (/(병약|쇠약|허약|체력|질환|과민)/.test(s)) out.push("병약");
  if (/(격국|격|종격|특수격|용신격)/.test(s)) out.push("격국");
  return Array.from(new Set(out));
}
