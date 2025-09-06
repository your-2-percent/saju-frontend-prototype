import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// features/AnalysisReport/ui/LuckStrengthTabs.tsx
import { useMemo } from "react";
import { blendElementStrength, } from "../logic/blend";
export default function LuckStrengthTabs({ natalElementScore, daewoonGz, sewoonGz, wolwoonGz, blendTab, onTabChange, }) {
    //const [tab, setTab] = useState<BlendTab>("원국만");
    const mixed = useMemo(() => blendElementStrength({ natalElementScore, daewoonGz, sewoonGz, wolwoonGz, tab: blendTab }), [natalElementScore, daewoonGz, sewoonGz, wolwoonGz, blendTab]);
    const tabs = ["원국", "대운", "세운", "월운"];
    // 실제 반영된 가중치 안내(존재하는 운만 재정규화됨)
    /*const weightsLabel = useMemo(() => {
      const w = BLEND_WEIGHTS[tab];
      const pairs: Array<[string, number | undefined, boolean]> = [
        ["원국", w.natal, true],
        ["대운", w.dae, !!daewoonGz],
        ["세운", w.se, !!sewoonGz],
        ["월운", w.wol, !!wolwoonGz],
      ];
      const used = pairs.filter(([, val, ok]) => (val ?? 0) > 0 && ok);
      const sum = used.reduce((s,[,v])=>s+(v ?? 0), 0) || 1;
      return used
        .map(([label, val]) => `${label} ${Math.round(((val ?? 0)/sum)*100)}%`)
        .join(" + ");
    }, [tab, daewoonGz, sewoonGz, wolwoonGz]);*/
    const detailLabel = useMemo(() => {
        return `(${[
            `대운 ${daewoonGz ?? "-"}`,
            `세운 ${sewoonGz ?? "-"}`,
            `월운 ${wolwoonGz ?? "-"}`
        ].join(", ")})`;
    }, [daewoonGz, sewoonGz, wolwoonGz]);
    return (_jsxs("div", { className: "w-full p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 space-y-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-1", children: [tabs.map(t => (_jsx("button", { onClick: () => onTabChange(t), "aria-pressed": blendTab === t, className: "px-2 py-1 text-xs rounded border " +
                            (blendTab === t
                                ? "bg-yellow-500 text-black border-yellow-600"
                                : "bg-neutral-900 text-neutral-300 border-neutral-700"), children: t }, t))), _jsx("span", { className: "ml-2 text-[11px] text-neutral-500", children: _jsx("span", { className: "ml-2 text-[11px] text-neutral-500", children: detailLabel }) }), blendTab !== "원국" && (_jsxs("span", { className: "ml-2 text-[11px] text-neutral-500 opacity-80", children: ["(\uB300\uC6B4 ", daewoonGz ?? "-", ", \uC138\uC6B4 ", sewoonGz ?? "-", ", \uC6D4\uC6B4 ", wolwoonGz ?? "-", ")"] }))] }), _jsx("div", { className: "grid grid-cols-5 gap-2", children: ["목", "화", "토", "금", "수"].map(el => (_jsxs("div", { className: "p-2 rounded-lg border border-neutral-200 dark:border-neutral-800", children: [_jsx("div", { className: "text-xs text-neutral-400 mb-1", children: el }), _jsx("div", { className: "h-2 w-full bg-neutral-300 dark:bg-neutral-800 rounded overflow-hidden", children: _jsx("div", { className: "h-2 bg-white dark:bg-neutral-100", style: { width: `${mixed[el]}%` } }) }), _jsxs("div", { className: "mt-1 text-xs text-neutral-500", children: [mixed[el].toFixed(1), "%"] })] }, el))) })] }, `${daewoonGz ?? ""}|${sewoonGz ?? ""}|${wolwoonGz ?? ""}|${blendTab}`));
}
