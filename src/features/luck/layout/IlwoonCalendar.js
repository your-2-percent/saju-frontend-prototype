import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// features/luck/IlwoonCalendar.tsx
import { useEffect, useMemo, useState } from "react";
import { getDayGanZhi, getYearGanZhi } from "@/shared/domain/간지/공통";
import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import { getSolarTermBoundaries } from "@/features/myoun";
import { toDayStem, toCorrected } from "@/shared/domain/meongsik";
// 십이운성/십이신살
import * as Twelve from "@/shared/domain/간지/twelve";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
// ✅ 전역 설정 스토어 (SajuChart와 동일 소스)
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
/* ===== 한자/한글 변환 + 음양 판별 ===== */
const STEM_H2K = {
    "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
    "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};
const BRANCH_H2K = {
    "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사",
    "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해",
};
const STEM_K2H = Object.fromEntries(Object.entries(STEM_H2K).map(([h, k]) => [k, h]));
const BRANCH_K2H = Object.fromEntries(Object.entries(BRANCH_H2K).map(([h, k]) => [k, h]));
function toDisplayChar(value, kind, charType) {
    if (charType === "한글") {
        return kind === "stem" ? (STEM_H2K[value] ?? value) : (BRANCH_H2K[value] ?? value);
    }
    return kind === "stem" ? (STEM_K2H[value] ?? value) : (BRANCH_K2H[value] ?? value);
}
const YIN_STEMS_ALL = new Set(["乙", "丁", "己", "辛", "癸", "을", "정", "기", "신", "계"]);
const YIN_BRANCHES_ALL = new Set(["丑", "卯", "巳", "未", "酉", "亥", "축", "묘", "사", "미", "유", "해"]);
function isYinUnified(value, kind) {
    return kind === "stem" ? YIN_STEMS_ALL.has(value) : YIN_BRANCHES_ALL.has(value);
}
/* ===== EraType 안전 매핑 (SajuChart와 동일) ===== */
function isRecord(v) {
    return typeof v === "object" && v !== null;
}
function isEraRuntime(v) {
    return isRecord(v) && ("Classic" in v || "Modern" in v || "classic" in v || "modern" in v);
}
function mapEra(mode) {
    const exported = Twelve["EraType"];
    if (isEraRuntime(exported)) {
        return mode === "classic"
            ? (exported.Classic ?? exported.classic)
            : (exported.Modern ?? exported.modern);
    }
    return mode;
}
function termIndexFor(terms, pivot, year) {
    if (!terms.length)
        return 0;
    for (let i = 0; i < terms.length; i++) {
        const cur = terms[i].date;
        const next = terms[i + 1]?.date ?? new Date(year + 1, 0, 1);
        if (pivot >= cur && pivot < next)
            return i;
    }
    // fallback: 마지막 절기
    return Math.max(0, terms.length - 1);
}
export default function IlwoonCalendar({ data, year, month, hourTable, }) {
    const settings = useSettingsStore((s) => s.settings);
    // 1) 규칙/개인 기준
    const rule = hourTable ?? (data?.mingSikType ?? "자시");
    const hasData = !!data;
    const dayStem = hasData ? toDayStem(data) : undefined;
    const birth = hasData ? toCorrected(data) : null;
    const lon = hasData && data.birthPlace && data.birthPlace.name !== "모름" && data.birthPlace.lon !== 0
        ? data.birthPlace.lon
        : 127.5;
    const baseBranch = hasData && birth
        ? (settings.sinsalBase === "일지"
            ? getDayGanZhi(birth, rule).charAt(1)
            : getYearGanZhi(birth, lon).charAt(1))
        : null;
    // 2) 기준 달과 절기 테이블
    const baseDate = useMemo(() => new Date(year, month - 1, 1), [year, month]);
    const terms = useMemo(() => {
        const raw = getSolarTermBoundaries(baseDate) ?? [];
        return raw.slice().sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [baseDate]);
    // 3) 초기 인덱스 계산 → 상태
    const initialIndex = useMemo(() => {
        const now = new Date();
        const useNow = year === now.getFullYear() && month === (now.getMonth() + 1);
        const pivot = useNow ? now : new Date(year, month - 1, 1);
        return termIndexFor(terms, pivot, year);
    }, [terms, year, month]);
    const [termIndex, setTermIndex] = useState(() => initialIndex);
    useEffect(() => {
        setTermIndex(initialIndex);
    }, [initialIndex]);
    const termInfo = terms[termIndex];
    const nextTerm = terms[termIndex + 1];
    const start = termInfo?.date ?? baseDate;
    const end = useMemo(() => nextTerm?.date ?? new Date(year + 1, 0, 1), [nextTerm, year]);
    // 4) 달력 날짜들 생성
    const days = useMemo(() => {
        if (!termInfo)
            return [];
        const acc = [];
        const cursor = new Date(start);
        while (cursor < end) {
            acc.push(new Date(cursor));
            cursor.setDate(cursor.getDate() + 1);
        }
        return acc;
    }, [start, end, termInfo]);
    // 5) 달력 7열 행렬화
    const weeks = useMemo(() => {
        const rows = [];
        let row = [];
        if (!days.length)
            return rows;
        const firstWeekDay = start.getDay();
        for (let i = 0; i < firstWeekDay; i++)
            row.push(null);
        for (const d of days) {
            if (row.length === 7) {
                rows.push(row);
                row = [];
            }
            row.push(d);
        }
        while (row.length < 7)
            row.push(null);
        rows.push(row);
        return rows;
    }, [days, start]);
    if (!terms.length || !termInfo) {
        return (_jsx("div", { className: "w-full max-w-[800px] mx-auto mb-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 text-sm text-neutral-700 dark:text-neutral-300", children: "\uD45C\uC2DC\uD560 \uC808\uAE30 \uC815\uBCF4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4." }));
    }
    return (_jsxs("div", { className: "w-full max-w-[800px] mx-auto mb-4 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden", children: [_jsxs("div", { className: "flex justify-between items-center px-2 desk:px-4 py-2 bg-neutral-50 dark:bg-neutral-800/60", children: [_jsxs("button", { disabled: termIndex <= 0, onClick: () => setTermIndex((i) => Math.max(0, i - 1)), className: "px-1 desk:px-2 py-1 text-[11px] desk:text-sm bg-neutral-200 dark:bg-neutral-700 rounded disabled:opacity-40 text-neutral-800 dark:text-white cursor-pointer", children: ["\u25C0 ", terms[termIndex - 1]?.name ?? ""] }), _jsxs("div", { className: "text-center text-[11px] desk:text-sm font-semibold text-neutral-700 dark:text-neutral-200", children: [start.getFullYear(), "\uB144 ", termInfo.name, "(", start.getMonth() + 1, "\uC6D4 ", start.getDate(), "\uC77C ~", " ", end.getMonth() + 1, "\uC6D4 ", end.getDate(), "\uC77C)", _jsxs("div", { className: "mt-0.5 text-[10px] desk:text-xs font-normal text-neutral-500 dark:text-neutral-400", children: ["[", termInfo.name, " ", formatStartKST(start), " \uC2DC\uC791]"] })] }), _jsxs("button", { disabled: termIndex >= terms.length - 2, onClick: () => setTermIndex((i) => Math.min(terms.length - 2, i + 1)), className: "px-1 desk:px-2 py-1 text-[11px] desk:text-sm bg-neutral-200 dark:bg-neutral-700 rounded disabled:opacity-40 text-neutral-800 dark:text-white cursor-pointer", children: [terms[termIndex + 1]?.name ?? "", " \u25B6"] })] }), _jsx("div", { className: "grid grid-cols-7 text-center text-xs bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300", children: ["일", "월", "화", "수", "목", "금", "토"].map((w) => (_jsx("div", { className: "py-1", children: w }, w))) }), _jsx("div", { className: "grid grid-cols-7 gap-px bg-neutral-200 dark:bg-neutral-800", children: weeks.map((week, wi) => week.map((d, di) => {
                    if (!d)
                        return _jsx("div", { className: "bg-white dark:bg-neutral-900" }, `${wi}-${di}`);
                    const gz = getDayGanZhi(d, rule);
                    const stem = gz.charAt(0);
                    const branch = gz.charAt(1);
                    const stemDisp = toDisplayChar(stem, "stem", settings.charType);
                    const branchDisp = toDisplayChar(branch, "branch", settings.charType);
                    const stemFont = settings.thinEum && isYinUnified(stem, "stem") ? "font-thin" : "font-bold";
                    const branchFont = settings.thinEum && isYinUnified(branch, "branch") ? "font-thin" : "font-bold";
                    const showSipSin = !!dayStem && settings.showSipSin;
                    const showUnseong = !!dayStem && settings.showSibiUnseong;
                    const showSinsal = !!dayStem && baseBranch != null && settings.showSibiSinsal;
                    const sipSinStem = showSipSin ? getSipSin(dayStem, { stem }) : "";
                    const sipSinBranch = showSipSin ? getSipSin(dayStem, { branch }) : "";
                    const unseong = showUnseong ? getTwelveUnseong(dayStem, branch) : "";
                    const shinsal = showSinsal ? getTwelveShinsalBySettings({
                        baseBranch: baseBranch,
                        targetBranch: branch,
                        era: mapEra(settings.sinsalMode),
                        gaehwa: !!settings.sinsalBloom,
                    }) : "";
                    return (_jsxs("div", { className: `space-y-1 bg-white dark:bg-neutral-900 flex flex-col items-center justify-start p-1 text-xs border ${isToday(d) ? "border-yellow-500" : "border-neutral-200 dark:border-neutral-800"}`, title: `${gz} (${d.toLocaleDateString()})`, children: [_jsx("div", { className: "text-neutral-600 dark:text-neutral-400", children: d.getDate() }), showSipSin && _jsx("div", { className: "text-[10px] text-neutral-500 dark:text-neutral-400", children: sipSinStem }), _jsx("div", { className: `w-6 h-6 rounded flex items-center justify-center text-white text-sm ${getElementColor(stem, "stem")}`, children: _jsx("span", { className: stemFont, children: stemDisp }) }), _jsx("div", { className: `w-6 h-6 rounded flex items-center justify-center text-white text-sm ${getElementColor(branch, "branch")}`, children: _jsx("span", { className: branchFont, children: branchDisp }) }), showSipSin && _jsx("div", { className: "text-[10px] text-neutral-500 dark:text-neutral-400", children: sipSinBranch }), (showUnseong || showSinsal) && (_jsxs("div", { className: "text-[10px] text-neutral-500 dark:text-neutral-400 text-center space-y-0.5", children: [showUnseong && unseong && _jsx("div", { children: unseong }), showSinsal && shinsal && _jsx("div", { children: shinsal })] }))] }, d.toISOString()));
                })) })] }));
}
function formatStartKST(d) {
    if (!d)
        return null;
    const parts = new Intl.DateTimeFormat("ko-KR", {
        timeZone: "Asia/Seoul",
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    }).formatToParts(d);
    let month = "", day = "", hour = "", minute = "";
    for (const p of parts) {
        if (p.type === "month")
            month = p.value;
        if (p.type === "day")
            day = p.value;
        if (p.type === "hour")
            hour = p.value;
        if (p.type === "minute")
            minute = p.value;
    }
    return `${month}/${day} ${hour}:${minute}`;
}
function isToday(date) {
    const today = new Date();
    return (date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate());
}
