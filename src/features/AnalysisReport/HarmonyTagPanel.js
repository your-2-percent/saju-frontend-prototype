import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { buildHarmonyTags, buildAllRelationTags } from "./logic/relations";
function getClass(t, source) {
    if (t === "#없음") {
        return "bg-neutral-100 text-neutral-500 border-neutral-200 dark:bg-neutral-900 dark:text-neutral-500 dark:border-neutral-700";
    }
    switch (source) {
        case "natal":
            return "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800";
        case "dae":
            return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800";
        case "se":
            return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-200 dark:border-green-800";
        case "wol":
            return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-200 dark:border-orange-800";
        default:
            return "";
    }
}
function Row({ label, natal, luck, }) {
    const shownNatal = natal.length > 0 ? natal : ["#없음"];
    const displayNatal = luck.length > 0 ? shownNatal.filter((t) => t !== "#없음") : shownNatal;
    return (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "shrink-0 w-20 text-xs font-semibold text-neutral-700 dark:text-neutral-300 mt-1", children: label }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [displayNatal.map((t, i) => (_jsx("span", { className: "text-xs px-2 py-1 rounded-full border whitespace-nowrap " +
                            getClass(t, "natal"), children: t }, `natal-${i}`))), luck.map((t, i) => {
                        let src = "dae";
                        if (t.startsWith("세운"))
                            src = "se";
                        else if (t.startsWith("월운"))
                            src = "wol";
                        return (_jsx("span", { className: "text-xs px-2 py-1 rounded-full border whitespace-nowrap " +
                                getClass(t, src), children: t }, `luck-${i}`));
                    })] })] }));
}
function arr(v) {
    return Array.isArray(v) ? v : [];
}
export default function HarmonyTagPanel({ pillars, daewoon, sewoon, wolwoon, tab, }) {
    const natalRaw = buildHarmonyTags(pillars);
    const luckTags = buildAllRelationTags({ natal: pillars, daewoon, sewoon, wolwoon });
    // 원국 타이틀
    let fullTitle = natalRaw.title;
    // 운 타이틀 붙이기
    if (tab !== "원국") {
        const extra = [];
        if (tab === "대운" && daewoon)
            extra.push(`${daewoon}대운`);
        if (tab === "세운") {
            if (daewoon)
                extra.push(`${daewoon}대운`);
            if (sewoon)
                extra.push(`${sewoon}세운`);
        }
        if (tab === "월운") {
            if (daewoon)
                extra.push(`${daewoon}대운`);
            if (sewoon)
                extra.push(`${sewoon}세운`);
            if (wolwoon)
                extra.push(`${wolwoon}월운`);
        }
        if (extra.length > 0) {
            fullTitle += " + " + extra.join(" ");
        }
    }
    const natal = {
        cheonganHap: arr(natalRaw.cheonganHap),
        cheonganChung: arr(natalRaw.cheonganChung),
        jijiSamhap: arr(natalRaw.jijiSamhap),
        jijiBanghap: arr(natalRaw.jijiBanghap),
        jijiYukhap: arr(natalRaw.jijiYukhap),
        amhap: arr(natalRaw.amhap),
        ganjiAmhap: arr(natalRaw.ganjiAmhap),
        jijiChung: arr(natalRaw.jijiChung),
        jijiHyeong: arr(natalRaw.jijiHyeong),
        jijiPa: arr(natalRaw.jijiPa),
        jijiHae: arr(natalRaw.jijiHae),
    };
    return (_jsxs("div", { className: "rounded-xl p-4 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 space-y-3", children: [_jsx("div", { className: "text-base font-bold mb-1", children: "\uD569/\uCDA9/\uD615/\uD30C/\uD574" }), _jsx("div", { className: "text-sm text-neutral-700 dark:text-neutral-300 mb-3", children: fullTitle }), _jsx(Row, { label: "\uCC9C\uAC04\uD569", natal: natal.cheonganHap, luck: luckTags.cheonganHap }), _jsx(Row, { label: "\uCC9C\uAC04\uCDA9", natal: natal.cheonganChung, luck: luckTags.cheonganChung }), _jsx("div", { className: "border-t border-neutral-200 dark:border-neutral-800 my-2" }), _jsx(Row, { label: "\uC9C0\uC9C0\uC0BC\uD569", natal: natal.jijiSamhap, luck: luckTags.jijiSamhap }), _jsx(Row, { label: "\uC9C0\uC9C0\uBC29\uD569", natal: natal.jijiBanghap, luck: luckTags.jijiBanghap }), _jsx(Row, { label: "\uC9C0\uC9C0\uC721\uD569", natal: natal.jijiYukhap, luck: luckTags.jijiYukhap }), _jsx(Row, { label: "\uC554\uD569", natal: natal.amhap, luck: luckTags.amhap }), _jsx(Row, { label: "\uAC04\uC9C0\uC554\uD569", natal: natal.ganjiAmhap, luck: luckTags.ganjiAmhap }), _jsx(Row, { label: "\uC9C0\uC9C0\uCDA9", natal: natal.jijiChung, luck: luckTags.jijiChung }), _jsx(Row, { label: "\uC9C0\uC9C0\uD615", natal: natal.jijiHyeong, luck: luckTags.jijiHyeong }), _jsx(Row, { label: "\uC9C0\uC9C0\uD30C", natal: natal.jijiPa, luck: luckTags.jijiPa }), _jsx(Row, { label: "\uC9C0\uC9C0\uD574", natal: natal.jijiHae, luck: luckTags.jijiHae })] }));
}
