import { 천간 as STEMS, 지지 as BRANCHES, 간지_한자_MAP, 천간_오행, 지지_오행, 십신_천간, 십신_지지 } from "@/shared/domain/간지/const";
export function normalizeStem(ch) {
    const iKor = STEMS.indexOf(ch);
    if (iKor !== -1)
        return STEMS[iKor];
    const iHan = 간지_한자_MAP.천간.indexOf(ch);
    if (iHan !== -1)
        return STEMS[iHan];
    return ch;
}
export function normalizeBranch(ch) {
    const iKor = BRANCHES.indexOf(ch);
    if (iKor !== -1)
        return BRANCHES[iKor];
    const iHan = 간지_한자_MAP.지지.indexOf(ch);
    if (iHan !== -1)
        return BRANCHES[iHan];
    return ch;
}
/** 오행 → Tailwind 배경색 */
export function elemToBg(elem) {
    switch (elem) {
        case "목": return "bg-green-600";
        case "화": return "bg-red-600";
        case "토": return "bg-yellow-500";
        case "금": return "bg-gray-400";
        case "수": return "bg-black";
        default: return "bg-neutral-700";
    }
}
/** 간지 글자 → 색상 */
export function getElementColor(char, kind) {
    if (kind === "stem") {
        const kor = normalizeStem(char);
        const idx = STEMS.indexOf(kor);
        const elem = idx >= 0 ? 천간_오행[idx] : undefined;
        return elemToBg(elem);
    }
    else {
        const kor = normalizeBranch(char);
        const idx = BRANCHES.indexOf(kor);
        const elem = idx >= 0 ? 지지_오행[idx] : undefined;
        return elemToBg(elem);
    }
}
export function getSipSin(dayStem, target) {
    const ds = normalizeStem(dayStem);
    if (!ds)
        throw new Error(`getSipSin: invalid dayStem ${dayStem}`);
    if (target.stem) {
        const st = normalizeStem(target.stem);
        if (!st)
            throw new Error(`getSipSin: invalid stem ${target.stem}`);
        return 십신_천간[ds][st];
    }
    if (target.branch) {
        const br = normalizeBranch(target.branch);
        if (!br)
            throw new Error(`getSipSin: invalid branch ${target.branch}`);
        return 십신_지지[ds][br];
    }
    throw new Error("getSipSin: stem or branch required");
}
