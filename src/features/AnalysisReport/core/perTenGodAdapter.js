import { normElLabel, isRecord } from "./common";
const TG_ORDER = ["비겁", "식상", "재성", "관성", "인성"];
const SUBPAIR_DEFAULT = {
    비겁: ["비견", "겁재"],
    식상: ["식신", "상관"],
    재성: ["정재", "편재"],
    관성: ["정관", "편관"],
    인성: ["정인", "편인"],
};
function normTGLabel(raw) {
    if (typeof raw !== "string")
        return null;
    const s = raw.trim().toLowerCase();
    if (/(비견|겁재|비겁|peer|比肩|劫財|比劫)/.test(s))
        return "비겁";
    if (/(식신|상관|식상|output|食神|傷官)/.test(s))
        return "식상";
    if (/(정재|편재|재성|wealth|正財|偏財|財)/.test(s))
        return "재성";
    if (/(정관|편관|칠살|관성|officer|正官|偏官|官)/.test(s))
        return "관성";
    if (/(정인|편인|인성|resource|正印|偏印|印)/.test(s))
        return "인성";
    return null;
}
export function adaptPerTenGod(src, fallbackElem) {
    const isSubtype = (v) => isRecord(v) &&
        typeof (v).a === "string" &&
        typeof (v).b === "string" &&
        typeof (v).aVal === "number" &&
        typeof (v).bVal === "number" &&
        /(비견|겁재|식신|상관|정재|편재|정관|편관|정인|편인)/.test(`${(v).a}${(v).b}`);
    const ensureTop2 = (m) => {
        const sorted = ["목", "화", "토", "금", "수"]
            .map((el) => ({ el, val: m[el] ?? 0 }))
            .sort((a, b) => b.val - a.val);
        const a = sorted[0]?.el ?? "목";
        const b = sorted[1]?.el ?? (a === "목" ? "화" : "목");
        return { a, b, aVal: m[a] ?? 0, bVal: m[b] ?? 0 };
    };
    const toMap = (obj) => {
        const acc = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
        if (isRecord(obj)) {
            for (const [k, v] of Object.entries(obj)) {
                const el = normElLabel(k);
                if (!el)
                    continue;
                acc[el] += typeof v === "number" ? v : 0;
            }
        }
        return acc;
    };
    const out = {};
    if (isRecord(src)) {
        let sawSubtype = false;
        for (const [key, val] of Object.entries(src)) {
            const tg = normTGLabel(key);
            if (!tg)
                continue;
            if (isSubtype(val)) {
                out[tg] = val;
                sawSubtype = true;
            }
            else {
                const { a, b, aVal, bVal } = ensureTop2(toMap(val));
                out[tg] = { a, b, aVal, bVal };
            }
        }
        for (const tg of TG_ORDER)
            if (!out[tg]) {
                if (sawSubtype) {
                    const [a, b] = SUBPAIR_DEFAULT[tg];
                    out[tg] = { a, b, aVal: 0, bVal: 0 };
                }
                else {
                    const { a, b, aVal, bVal } = ensureTop2(fallbackElem ?? { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 });
                    out[tg] = { a, b, aVal, bVal };
                }
            }
        return out;
    }
    const { a, b, aVal, bVal } = ensureTop2(fallbackElem ?? { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 });
    const base = { a, b, aVal, bVal };
    return { 비겁: base, 식상: base, 재성: base, 관성: base, 인성: base };
}
