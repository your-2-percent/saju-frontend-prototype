import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// features/AnalysisReport/ShinsalTagPanel.tsx
import { useMemo, useState } from "react";
import { buildShinsalTags } from "./logic/shinsal";
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
function Chips({ items, source }) {
    const list = items.length > 0 ? items : ["#없음"];
    return (_jsx("div", { className: "flex flex-wrap gap-2", children: list.map((t, i) => (_jsx("span", { className: "text-xs px-2 py-1 rounded-full border whitespace-nowrap " + getClass(t, source), children: t }, `${source}-${i}-${t}`))) }));
}
function Section({ title, rows, }) {
    return (_jsxs("div", { className: "space-y-2 desk:flex-1 desk:px-1", children: [_jsx("div", { className: "text-md font-bold text-neutral-800 dark:text-neutral-200 mt-2", children: title }), rows.map((row) => (_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "shrink-0 w-12 text-xs font-semibold text-neutral-700 dark:text-neutral-300 mt-1", children: row.label }), _jsx(Chips, { items: row.items.length > 0 ? row.items : ["#없음"], source: row.source })] }, `${title}-${row.label}`)))] }));
}
/** 운 간지 추출(한글/한자 + 접미사 허용) → "경자" */
const STEMS = "갑을병정무기경신임계甲乙丙丁戊己庚辛壬癸";
const BRANCHES = "자축인묘진사오미신유술해子丑寅卯辰巳午未申酉戌亥";
function extractGZ(raw) {
    if (!raw)
        return null;
    const chars = Array.from(String(raw));
    let s = null, b = null;
    for (const ch of chars) {
        if (!s && STEMS.includes(ch))
            s = ch;
        if (BRANCHES.includes(ch))
            b = ch;
    }
    return s && b ? s + b : null;
}
export default function ShinsalTagPanel({ pillars, daewoon, sewoon, wolwoon, }) {
    // ▼ 셀렉트 상태: 공망/삼재 기준
    const [voidSel, setVoidSel] = useState("일공망");
    const [samjaeSel, setSamjaeSel] = useState("일삼재");
    const basis = useMemo(() => ({
        voidBasis: voidSel === "일공망" ? "day" : "year",
        samjaeBasis: samjaeSel === "일삼재" ? "day" : "year",
    }), [voidSel, samjaeSel]);
    const data = useMemo(() => buildShinsalTags({ natal: pillars, daewoon, sewoon, wolwoon, basis }), [pillars, daewoon, sewoon, wolwoon, basis]);
    const { /*title: _ignored,*/ good, bad, meta } = data;
    // UI 타이틀: "을해년 기묘월 무신일 병진시 + 병자대운 을사세운 갑신월운"
    const natalUI = `${pillars[0]}년 ${pillars[1]}월 ${pillars[2]}일 ${pillars[3]}시`;
    const daeLbl = extractGZ(daewoon);
    const seLbl = extractGZ(sewoon);
    const wolLbl = extractGZ(wolwoon);
    const extras = [
        daeLbl ? `${daeLbl}대운` : null,
        seLbl ? `${seLbl}세운` : null,
        wolLbl ? `${wolLbl}월운` : null,
    ].filter(Boolean);
    const uiTitle = extras.length > 0 ? `${natalUI} + ${extras.join(" ")}` : natalUI;
    // 원국 칩 접두어 "원국 " 부여
    const withNatalPrefix = (items) => items.map((t) => (t === "#없음" ? t : `원국 ${t}`));
    // 표시는 요구 순서: 시주, 일주, 연주, 월주, 대운, 세운, 월운
    const goodRows = [
        { label: "시주", items: withNatalPrefix(good.si), source: "natal" },
        { label: "일주", items: withNatalPrefix(good.il), source: "natal" },
        { label: "월주", items: withNatalPrefix(good.wol), source: "natal" },
        { label: "연주", items: withNatalPrefix(good.yeon), source: "natal" },
        { label: "대운", items: good.dae, source: "dae" },
        { label: "세운", items: good.se, source: "se" },
        { label: "월운", items: good.wolun, source: "wol" },
    ];
    const badRows = [
        { label: "시주", items: withNatalPrefix(bad.si), source: "natal" },
        { label: "일주", items: withNatalPrefix(bad.il), source: "natal" },
        { label: "월주", items: withNatalPrefix(bad.wol), source: "natal" },
        { label: "연주", items: withNatalPrefix(bad.yeon), source: "natal" },
        { label: "대운", items: bad.dae, source: "dae" },
        { label: "세운", items: bad.se, source: "se" },
        { label: "월운", items: bad.wolun, source: "wol" },
    ];
    // 셀렉트 아래 안내문구: 양쪽 값 같이 보여주기
    const voidLeft = meta.voidPair.day ? `일공망(${meta.voidPair.day.join("")})` : "일공망(—)";
    const voidRight = meta.voidPair.year ? `연공망(${meta.voidPair.year.join("")})` : "연공망(—)";
    const sjLeft = meta.samjaeYears.day ? `일삼재(${meta.samjaeYears.day.join("·")})` : "일삼재(—)";
    const sjRight = meta.samjaeYears.year ? `연삼재(${meta.samjaeYears.year.join("·")})` : "연삼재(—)";
    return (_jsxs("div", { className: "rounded-xl p-4 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 space-y-2", children: [_jsx("div", { className: "text-base font-bold mb-1", children: "\uC2E0\uC0B4(\uAE38\uC2E0/\uD749\uC0B4)" }), _jsx("div", { className: "text-sm text-neutral-700 dark:text-neutral-300", children: uiTitle }), _jsxs("div", { className: "flex flex-wrap items-center gap-3 text-xs", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { className: "text-neutral-600 dark:text-neutral-300", children: "\uACF5\uB9DD \uAE30\uC900" }), _jsxs("select", { value: voidSel, onChange: (e) => setVoidSel(e.target.value), className: "px-2 h-30 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800", children: [_jsx("option", { value: "\uC77C\uACF5\uB9DD", children: voidLeft }), _jsx("option", { value: "\uC5F0\uACF5\uB9DD", children: voidRight })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("label", { className: "text-neutral-600 dark:text-neutral-300", children: "\uC0BC\uC7AC \uAE30\uC900" }), _jsxs("select", { value: samjaeSel, onChange: (e) => setSamjaeSel(e.target.value), className: "px-2 h-30 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800", children: [_jsx("option", { value: "\uC77C\uC0BC\uC7AC", children: sjLeft }), _jsx("option", { value: "\uC5F0\uC0BC\uC7AC", children: sjRight })] })] })] }), _jsxs("div", { className: "desk:flex", children: [_jsx(Section, { title: "\uC2E0(\u795E)", rows: goodRows }), _jsx("div", { className: "block desk:hidden border-t border-neutral-200 dark:border-neutral-800 mt-4 mb-3" }), _jsx(Section, { title: "\uC0B4(\u6BBA)", rows: badRows })] })] }));
}
