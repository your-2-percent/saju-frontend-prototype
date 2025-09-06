import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// features/luck/WolwoonList.tsx
import { useMemo, useState, useEffect } from "react";
import { getMonthGanZhi, getYearGanZhi, getDayGanZhi } from "@/shared/domain/간지/공통";
import { getSipSin, getElementColor } from "@/shared/domain/간지/utils";
import { toDayStem, toCorrected } from "@/shared/domain/meongsik";
// 십이운성/십이신살
import * as Twelve from "@/shared/domain/간지/twelve";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
// ✅ 전역 설정 (SajuChart와 동일 소스)
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
/* ===== 한자/한글 변환 + 음간/음지 ===== */
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
/* ===== EraType 안전 매핑 (SajuChart 동일) ===== */
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
/* ===== 컴포넌트 ===== */
export default function WolwoonList({ data, activeYear, onSelect, }) {
    const settings = useSettingsStore((s) => s.settings);
    const [activeIndex, setActiveIndex] = useState(null);
    const lon = !data.birthPlace || data.birthPlace.name === "모름" || data.birthPlace.lon === 0
        ? 127.5
        : data.birthPlace.lon;
    const dayStem = toDayStem(data);
    // 신살 기준 지지(일지/연지)
    const birth = toCorrected(data);
    const rule = data.mingSikType ?? "자시";
    const baseBranch = (settings.sinsalBase === "일지"
        ? getDayGanZhi(birth, rule).charAt(1)
        : getYearGanZhi(birth, lon).charAt(1));
    // 월운 리스트 (해당 연도 2월~다음해 1월)
    const list = useMemo(() => {
        if (!activeYear)
            return [];
        const arr = [];
        for (let m = 2; m <= 13; m++) {
            const y = m === 13 ? activeYear + 1 : activeYear;
            const mon = m === 13 ? 1 : m;
            const dt = new Date(y, mon - 1, 10);
            const gz = getMonthGanZhi(dt, lon);
            arr.push({ at: dt, gz });
        }
        return arr;
    }, [activeYear, lon]);
    // 현재 월 자동 active
    useEffect(() => {
        if (!list.length)
            return;
        setActiveIndex(null);
        const now = new Date();
        const idx = list.findIndex((it, i) => {
            const next = list[i + 1]?.at;
            return now >= it.at && (!next || now < next);
        });
        if (activeYear === now.getFullYear()) {
            setActiveIndex(idx !== -1 ? idx : null);
        }
    }, [list, activeYear]);
    return (_jsxs("div", { className: "w-full max-w-[640px] mx-auto rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 overflow-hidden", children: [_jsx("div", { className: "px-3 py-2 text-sm font-semibold tracking-wider bg-neutral-50 dark:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300", children: "\uC6D4\uC6B4\uB9AC\uC2A4\uD2B8" }), _jsx("div", { className: "flex gap-0.5 desk:gap-1 py-2 desk:p-2 flex-row-reverse", children: list.map((it, i) => {
                    const stem = it.gz.charAt(0);
                    const branch = it.gz.charAt(1);
                    const label = `${it.at.getMonth() + 1}월`;
                    const isActive = i === activeIndex;
                    const stemDisp = toDisplayChar(stem, "stem", settings.charType);
                    const branchDisp = toDisplayChar(branch, "branch", settings.charType);
                    const yinStem = isYinUnified(stem, "stem");
                    const yinBranch = isYinUnified(branch, "branch");
                    const stemFont = settings.thinEum && yinStem ? "font-thin" : "font-bold";
                    const branchFont = settings.thinEum && yinBranch ? "font-thin" : "font-bold";
                    const unseong = settings.showSibiUnseong ? getTwelveUnseong(dayStem, branch) : null;
                    const shinsal = settings.showSibiSinsal
                        ? getTwelveShinsalBySettings({
                            baseBranch,
                            targetBranch: branch,
                            era: mapEra(settings.sinsalMode),
                            gaehwa: !!settings.sinsalBloom,
                        })
                        : null;
                    return (_jsxs("div", { onClick: () => {
                            setActiveIndex(i);
                            onSelect?.(it.at.getFullYear(), it.at.getMonth() + 1);
                        }, className: `flex-1 rounded-sm desk:rounded-lg bg-white dark:bg-neutral-900 overflow-hidden cursor-pointer ${isActive
                            ? "border border-yellow-500"
                            : "border border-neutral-200 dark:border-neutral-800 hover:border-yellow-500"}`, title: `${it.gz} · ${it.at.toLocaleDateString()}`, children: [_jsx("div", { className: "desk:px-2 py-1 text-center text-[10px] bg-neutral-50 dark:bg-neutral-800/60 text-neutral-600 dark:text-neutral-300", children: label }), _jsxs("div", { className: "p-2 flex flex-col items-center gap-1", children: [settings.showSipSin && (_jsx("div", { className: "text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap", children: getSipSin(dayStem, { stem }) })), _jsx("div", { className: `w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 ${getElementColor(stem, "stem")}`, children: _jsx("span", { className: `text-xs sm:text-lg md:text-xl text-white ${stemFont}`, children: stemDisp }) }), _jsx("div", { className: `w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 rounded-sm md:rounded-lg flex items-center justify-center border border-neutral-200 dark:border-neutral-800 ${getElementColor(branch, "branch")}`, children: _jsx("span", { className: `text-xs sm:text-lg md:text-xl text-white ${branchFont}`, children: branchDisp }) }), settings.showSipSin && (_jsx("div", { className: "text-[10px] text-neutral-500 dark:text-neutral-400 text-nowrap", children: getSipSin(dayStem, { branch }) })), (settings.showSibiUnseong || settings.showSibiSinsal) && (_jsxs("div", { className: "text-[10px] text-neutral-500 dark:text-neutral-400 text-center text-nowrap", children: [settings.showSibiUnseong && unseong && _jsx("div", { children: unseong }), settings.showSibiSinsal && shinsal && _jsx("div", { children: shinsal })] }))] })] }, i));
                }) })] }));
}
