import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// features/AnalysisReport/StrengthBar.tsx
import { useEffect, useMemo } from "react";
// 구간 경계 (퍼센트)
// [0,10) 극약, [10,20) 태약, [20,35) 신약, [35,45) 중화신약,
// [45,55) 중화, [55,65) 중화신강, [65,80) 태강, [80,100] 극태강
const BANDS = [
    { name: "극약", min: 0, max: 10 },
    { name: "태약", min: 10, max: 20 },
    { name: "신약", min: 20, max: 35 },
    { name: "중화신약", min: 35, max: 45 },
    { name: "중화", min: 45, max: 55 },
    { name: "중화신강", min: 55, max: 65 },
    { name: "태강", min: 65, max: 80 },
    { name: "극태강", min: 80, max: 100.0001 }, // 100 포함되도록 살짝 여유
];
// 틱(세로 경계선) 위치들
const TICKS = [10, 20, 35, 45, 55, 65, 80];
function clamp01(v) {
    return Math.max(0, Math.min(100, v));
}
function getCategory(pct) {
    const x = clamp01(pct);
    const found = BANDS.find(b => x >= b.min && x < b.max);
    return (found?.name ?? "중화");
}
export default function StrengthBar({ value }) {
    const percent = useMemo(() => clamp01(value), [value]);
    const category = useMemo(() => getCategory(percent), [percent]);
    // 콘솔 디버그 출력
    useEffect(() => {
        // const p = Number.isFinite(percent) ? percent.toFixed(1) : String(percent);
        // console.debug(`[StrengthBar] ${p}% → ${category}`);
    }, [percent, category]);
    return (_jsxs("div", { className: "w-full mx-auto p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl", children: [_jsxs("div", { className: "flex justify-between text-[11px] text-neutral-400 mb-1", children: [_jsx("span", { children: "\uC2E0\uC57D" }), _jsx("span", { children: "\uC911\uD654" }), _jsx("span", { children: "\uC2E0\uAC15" })] }), _jsxs("div", { className: "relative h-4 rounded bg-gradient-to-r from-blue-500 via-yellow-400 to-red-500", children: [TICKS.map((t) => (_jsx("div", { className: "absolute top-0 h-4 w-[1px] bg-black/30", style: { left: `${t}%` }, title: `${t}%` }, t))), _jsx("div", { className: "absolute top-0 h-4 w-[1px] bg-black/40", style: { left: "50%" }, title: "50%" }), _jsx("div", { className: "absolute -top-1 h-6 w-2 bg-white rounded shadow-sm", style: { left: `${percent}%`, transform: "translateX(-50%)" }, "aria-label": `현재 강약 ${percent}%` })] }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx("span", { className: "inline-flex items-center px-2 py-0.5 rounded-full text-xs border border-neutral-600 text-neutral-700 dark:text-neutral-200", children: category }), _jsxs("span", { className: "text-xs text-neutral-400", children: [percent.toFixed(1), "%"] })] })] }));
}
