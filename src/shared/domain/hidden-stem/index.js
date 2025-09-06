import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// features/common/HiddenStems.tsx
import { getSipSin } from "@/shared/domain/간지/utils";
const hiddenStemMappingClassic = {
    자: ["임", "(-)", "계"],
    축: ["계", "신", "기"],
    인: ["무", "병", "갑"],
    묘: ["갑", "(-)", "을"],
    진: ["을", "계", "무"],
    사: ["무", "경", "병"],
    오: ["병", "기", "정"],
    미: ["정", "을", "기"],
    신: ["무", "임", "경"],
    유: ["경", "(-)", "신"],
    술: ["신", "정", "무"],
    해: ["무", "갑", "임"],
};
const hiddenStemMappingHGC = {
    자: ["(-)", "(-)", "계"],
    축: ["계", "신", "기"],
    인: ["(-)", "병", "갑"],
    묘: ["(-)", "(-)", "을"],
    진: ["을", "계", "무"],
    사: ["(-)", "경", "병"],
    오: ["(-)", "(-)", "정"],
    미: ["정", "을", "기"],
    신: ["(-)", "임", "경"],
    유: ["(-)", "(-)", "신"],
    술: ["신", "정", "무"],
    해: ["(-)", "갑", "임"],
};
export function HiddenStems({ branch, dayStem, mode = "all", // "all" | "main"
mapping = "classic", // "classic" | "hgc"
variant = "auto" }) {
    const stems = (mapping === "hgc"
        ? hiddenStemMappingHGC
        : hiddenStemMappingClassic)[branch] ?? [];
    const visibleStems = mode === "main" ? [stems[2]] : stems;
    const white = variant === "white";
    const hiddenText = white ? "text-white" : "text-neutral-800 dark:text-white";
    const hiddenBorder = white ? "border-white" : "border-neutral-800 dark: border-neutral-200";
    const hiddenJeonggi = white ? "text-yellow-900" : "text-red-600 dark:text-yellow-300";
    return (_jsx("div", { className: "flex flex-col gap-1 mt-1", children: visibleStems.map((s, idx) => {
            if (s === "(-)") {
                return (_jsx("div", { className: `flex-1 text-[10px] desk:text-xs text-neutral-500 py-0.5 desk:px-1 border ${hiddenBorder} ${hiddenText} rounded text-center text-nowrap`, children: "(-) (\uC5C6\uC74C)" }, idx));
            }
            return (_jsxs("div", { className: `flex-1 text-[10px] desk:text-xs py-0.5 desk:px-1 border ${hiddenBorder} ${hiddenText} rounded text-center text-nowrap 
            ${(mode === "main" || idx === 2) ? `jeonggi bg-neutral-500/50 ${hiddenJeonggi} font-bold` : ""}`, children: [s, " (", getSipSin(dayStem, { stem: s }), ")"] }, idx));
        }) }));
}
