import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// features/AnalysisReport/ui/LuckDatePicker.tsx
import { useMemo } from "react";
import { getYearGanZhi, getDayGanZhi, getMonthGanZhi } from "@/shared/domain/간지/공통";
import { normalizeGZ } from "../logic/relations";
export default function LuckDatePicker({ value, onChange, rule = "자시", lon = 127.5, }) {
    const dateStr = useMemo(() => {
        const y = value.getFullYear();
        const m = String(value.getMonth() + 1).padStart(2, "0");
        const d = String(value.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }, [value]);
    const handle = (e) => {
        const d = new Date(e.target.value + "T12:00:00");
        const yearGZ = normalizeGZ(getYearGanZhi(d, lon));
        const monthGZ = normalizeGZ(getMonthGanZhi(d));
        const dayGZ = normalizeGZ(getDayGanZhi(d, rule));
        onChange({ date: d, yearGZ, monthGZ, dayGZ });
    };
    return (_jsxs("div", { className: "flex items-center gap-2 px-3 py-2 w-full rounded-xl bg-neutral-100 dark:bg-neutral-900", children: [_jsx("label", { className: "text-xs text-neutral-500", children: "\uB0A0\uC9DC \uC120\uD0DD" }), _jsx("input", { type: "date", value: dateStr, onChange: handle, className: "text-sm px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800" })] }));
}
