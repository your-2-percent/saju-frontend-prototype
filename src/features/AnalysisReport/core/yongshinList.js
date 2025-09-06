// features/AnalysisReport/core/yongshinList.ts
import { useMemo } from "react";
import { STEM_TO_ELEMENT } from "./common";
/** 설명 태그 추출 (UI용) */
export function detectCategoriesFromReasonsUI(reasons) {
    const s = (reasons ?? []).join(" ").toLowerCase();
    const out = [];
    if (/(억부)/.test(s))
        out.push("억부");
    if (/(조후|온난|한랭|건조|습윤|온조|조열|냉습|조후상)/.test(s))
        out.push("조후");
    if (/(통관|순환|유통|생극순환)/.test(s))
        out.push("통관");
    if (/(병약|쇠약|허약|체력|질환|과민)/.test(s))
        out.push("병약");
    if (/(격국|격|종격|특수격|용신격)/.test(s))
        out.push("격국");
    return Array.from(new Set(out));
}
function normElLabel(raw) {
    if (typeof raw !== "string")
        return null;
    if (/목|木|wood/i.test(raw))
        return "목";
    if (/화|火|fire/i.test(raw))
        return "화";
    if (/토|土|earth/i.test(raw))
        return "토";
    if (/금|金|metal/i.test(raw))
        return "금";
    if (/수|水|water/i.test(raw))
        return "수";
    return null;
}
function hasProp(obj, key) {
    return typeof obj === "object" && obj !== null && key in obj;
}
function isRecordArray(v) {
    return Array.isArray(v) && v.every((x) => typeof x === "object" && x !== null);
}
function officerElementOf(dayEl) {
    if (!dayEl)
        return null;
    const pairs = { 목: "토", 화: "금", 토: "수", 금: "목", 수: "화" };
    for (const [x, y] of Object.entries(pairs))
        if (y === dayEl)
            return x;
    return null;
}
/** 용신 추천 리스트 생성 훅 */
export function useYongshinList(yongshin, presentMap, demoteAbsent, elemForFallback, activePillars, strengthPct) {
    return useMemo(() => {
        const raw = hasProp(yongshin, "ordered") && isRecordArray((yongshin).ordered)
            ? (yongshin).ordered
            : [];
        let list = raw.map((rec) => {
            const elementU = rec["element"];
            const scoreU = rec["score"];
            const reasonsU = rec["reasons"];
            const element = typeof elementU === "string" ? elementU : "";
            const elNorm = normElLabel(element);
            const score = typeof scoreU === "number" ? scoreU
                : elNorm ? (elemForFallback[elNorm] ?? 0)
                    : 0;
            const reasons = Array.isArray(reasonsU)
                ? reasonsU.filter((r) => typeof r === "string")
                : [];
            return { element, elNorm, score, reasons };
        });
        // 부재=0점
        if (demoteAbsent) {
            list = list.map(it => it.elNorm && !presentMap[it.elNorm]
                ? { ...it, score: 0, reasons: [...it.reasons, "부재후순위: 원국 부재 → 0점"] }
                : it);
        }
        // 중화 보정
        const dayEl = STEM_TO_ELEMENT[activePillars[2]?.charAt(0)] ?? null;
        const officerEl = officerElementOf(dayEl);
        const isNeutralBand = strengthPct >= 45 && strengthPct <= 55;
        if (isNeutralBand) {
            list = list.map(it => {
                let score = it.score;
                const reasons = [...it.reasons];
                if (reasons.some(r => r.includes("억부")) && reasons.length === 1) {
                    score *= 0.9;
                    reasons.push("중화: 억부 단일 근거 감점");
                }
                if (officerEl && it.elNorm === officerEl) {
                    score *= 0.9;
                    reasons.push("중화: 관성 과도 방지 감점");
                }
                return { ...it, score: Math.round(score * 10) / 10, reasons };
            });
        }
        // 정렬
        list.sort((a, b) => {
            if (demoteAbsent) {
                const ap = a.elNorm && presentMap[a.elNorm] ? 1 : 0;
                const bp = b.elNorm && presentMap[b.elNorm] ? 1 : 0;
                if (ap !== bp)
                    return bp - ap;
            }
            if ((b.score ?? 0) !== (a.score ?? 0))
                return (b.score ?? 0) - (a.score ?? 0);
            return (a.elNorm ?? a.element).localeCompare(b.elNorm ?? b.element);
        });
        return list;
    }, [yongshin, presentMap, demoteAbsent, elemForFallback, activePillars, strengthPct]);
}
/** 외부에서 간단히 생성할 때 쓰라고 같이 export */
export { elementPresenceFromPillars } from "./presentAndScores";
