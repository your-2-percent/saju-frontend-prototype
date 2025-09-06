import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// app/TodaySaju.tsx
import { useState, useEffect } from "react";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi, } from "@/shared/domain/간지/공통";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { PillarCardShared } from "@/shared/ui/PillarCardShared";
/* ===== 일간을 ‘항상 한글(갑…계)’로 강제 ===== */
const STEM_H2K = {
    "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무",
    "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계",
};
const STEMS_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
const STEMS_KO_SET = new Set(STEMS_KO);
const STEMS_HANJA_SET = new Set(["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"]);
function toKoStemKeyStrict(ch) {
    if (STEMS_KO_SET.has(ch))
        return ch;
    if (STEMS_HANJA_SET.has(ch))
        return STEM_H2K[ch];
    return "갑";
}
/* ===== 시주 비우기용 카드 ===== */
function BlankCard({ label, size = "sm", settings, hideBranchSipSin = true, }) {
    const sizeMap = {
        sm: "w-8 h-8 sm:w-12 sm:h-12",
        md: "w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16",
        lg: "w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20",
    };
    const showSipSinTop = settings.showSipSin;
    const showHidden = !!settings.hiddenStem;
    const hiddenMode = settings.hiddenStem === "regular" ? "main" : "all";
    const hiddenRows = hiddenMode === "main" ? 1 : 3;
    const showSipSinBranch = settings.showSipSin && !hideBranchSipSin;
    return (_jsxs("div", { className: "rounded-sm desk:rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden transition-colors", children: [_jsx("div", { className: "py-2 text-center text-[10px] desk:text-xs tracking-wider bg-neutral-100 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-200 text-nowrap", children: label }), _jsxs("div", { className: "p-3 flex flex-col items-center gap-1", children: [showSipSinTop && (_jsx("div", { className: "text-[10px] desk:text-xs text-neutral-500 dark:text-neutral-400 text-nowrap", children: "-" })), _jsx("div", { className: `${sizeMap[size]} rounded-sm desk:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white`, children: _jsx("span", { className: "text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900", children: "-" }) }), _jsx("div", { className: `${sizeMap[size]} rounded-sm desk:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 bg-white`, children: _jsx("span", { className: "text-xl sm:text-2xl md:text-3xl font-bold text-neutral-900", children: "-" }) }), showHidden && (_jsx("div", { className: "flex flex-col gap-1 mt-1 w-full", children: Array.from({ length: hiddenRows }).map((_, idx) => (_jsx("div", { className: "w-full max-w-[54px] mx-auto text-[10px] desk:text-xs py-0.5 desk:px-1 border border-neutral-200 dark:border-neutral-800 rounded text-center text-nowrap text-neutral-500 dark:text-neutral-400", children: "-" }, idx))) })), showSipSinBranch && (_jsx("div", { className: "text-[10px] desk:text-xs text-neutral-500 dark:text-neutral-400", children: "-" }))] })] }));
}
/* =======================
        컴포넌트
======================= */
export default function TodaySaju() {
    const settings = useSettingsStore((s) => s.settings);
    const [pick, setPick] = useState(new Date());
    const [isLive, setIsLive] = useState(true);
    const [dayBoundaryRule, setDayBoundaryRule] = useState("야자시");
    const [blankHour, setBlankHour] = useState(false);
    useEffect(() => {
        if (!isLive)
            return;
        const timer = setInterval(() => setPick(new Date()), 1000);
        return () => clearInterval(timer);
    }, [isLive]);
    const year = getYearGanZhi(pick);
    const month = getMonthGanZhi(pick);
    const day = getDayGanZhi(pick, dayBoundaryRule);
    const hour = getHourGanZhi(pick, "자시"); // 필요시 dayBoundaryRule로 교체 가능
    const dayStem = toKoStemKeyStrict(day.charAt(0));
    return (_jsxs("div", { className: "fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[96%] max-w-[640px] mx-auto p-4\r\n                    bg-white dark:bg-neutral-950\r\n                    text-neutral-900 dark:text-neutral-100\r\n                    rounded-xl shadow border border-neutral-200 dark:border-neutral-800 transition-colors", children: [_jsxs("header", { className: "flex flex-col desk:flex-row items-center justify-center desk:justify-between mb-4 gap-2", children: [_jsxs("div", { className: "font-semibold text-sm desk:text-base", children: ["\uC624\uB298\uC758 \uC0AC\uC8FC", " ", _jsxs("span", { className: "text-neutral-500 dark:text-neutral-400", children: ["(", isLive ? "실시간" : "수동선택", ") ", toLocalClock(pick)] })] }), _jsxs("div", { className: "flex gap-2 items-center", children: [_jsxs("select", { value: dayBoundaryRule, onChange: (e) => setDayBoundaryRule(e.target.value), className: "text-xs rounded px-2 py-1 h-30 cursor-pointer\r\n                       bg-white dark:bg-neutral-900\r\n                       border border-neutral-300 dark:border-neutral-700\r\n                       text-neutral-900 dark:text-neutral-100\r\n                       focus:outline-none focus:ring-2 focus:ring-amber-500/40", children: [_jsx("option", { value: "\uC790\uC2DC", children: "\uC790\uC2DC (\uC804\uB0A0 23\uC2DC)" }), _jsx("option", { value: "\uC57C\uC790\uC2DC", children: "\uC57C\uC790\uC2DC (\uC790\uC815)" }), _jsx("option", { value: "\uC778\uC2DC", children: "\uC778\uC2DC (\uC0C8\uBCBD 3\uC2DC)" })] }), _jsx("button", { onClick: () => setIsLive(!isLive), className: "text-xs px-3 py-1 rounded transition-colors cursor-pointer\r\n                       bg-neutral-100 hover:bg-neutral-200\r\n                       dark:bg-neutral-800 dark:hover:bg-neutral-700\r\n                       text-neutral-900 dark:text-neutral-100\r\n                       border border-neutral-200 dark:border-neutral-700", children: isLive ? "피커 사용" : "타이머 사용" })] })] }), _jsxs("div", { className: "grid grid-cols-4 gap-3 mb-6", children: [blankHour ? (_jsx(BlankCard, { label: "\uC2DC\uC8FC", size: "sm", settings: settings, hideBranchSipSin: true })) : (_jsx(PillarCardShared, { label: "\uC2DC\uC8FC", gz: hour, dayStem: dayStem, settings: settings, hideBranchSipSin: true })), _jsx(PillarCardShared, { label: "\uC77C\uC8FC", gz: day, dayStem: dayStem, settings: settings, hideBranchSipSin: true }), _jsx(PillarCardShared, { label: "\uC6D4\uC8FC", gz: month, dayStem: dayStem, settings: settings, hideBranchSipSin: true }), _jsx(PillarCardShared, { label: "\uC5F0\uC8FC", gz: year, dayStem: dayStem, settings: settings, hideBranchSipSin: true })] }), _jsxs("div", { className: "flex flex-col desk:flex-row gap-2 desk:gap-3 items-center", children: [_jsx("label", { className: "text-sm text-neutral-600 dark:text-neutral-300", children: "\uB0A0\uC9DC/\uC2DC\uAC04 \uC120\uD0DD" }), _jsx("input", { type: "datetime-local", value: toLocalInput(pick), disabled: isLive, onChange: (e) => {
                            const d = fromLocalInput(e.target.value);
                            if (d)
                                setPick(d);
                        }, className: `rounded px-3 py-1 text-sm transition-colors
                      bg-white dark:bg-neutral-900
                      border border-neutral-300 dark:border-neutral-700
                      text-neutral-900 dark:text-neutral-100
                      focus:outline-none focus:ring-2 focus:ring-amber-500/40
                      ${isLive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`, min: "1900-01-01T00:00", max: "2100-12-31T23:59" }), _jsx("button", { onClick: () => setBlankHour((v) => !v), className: `text-xs px-3 py-1 rounded border transition-colors cursor-pointer
                      ${blankHour
                            ? "bg-white text-neutral-900 border-neutral-300 hover:bg-neutral-100"
                            : "bg-neutral-100 text-neutral-900 border-neutral-200 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-700"}`, title: "\uC2DC\uC8FC \uAE00\uC790\uB97C \uBE44\uC6B0\uACE0 \uBC15\uC2A4\uB97C \uD770\uC0C9\uC73C\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4", children: blankHour ? "시주 표시" : "시주 비우기" })] })] }));
}
/* ===== util ===== */
function toLocalInput(d) {
    const pad = (n) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(s) {
    if (!s)
        return null;
    const [date, time] = s.split("T");
    if (!date || !time)
        return null;
    const [y, m, d] = date.split("-").map(Number);
    const [hh, mm] = time.split(":").map(Number);
    const dt = new Date(y, m - 1, d, hh, mm);
    return Number.isNaN(dt.getTime()) ? null : dt;
}
function toLocalClock(d) {
    const pad = (n) => n.toString().padStart(2, "0");
    return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
