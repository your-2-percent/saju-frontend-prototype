// shared/domain/meongsik/ensureSolarBirthDay.ts
import * as solarlunar from "solarlunar";
function isRecord(v) {
    return typeof v === "object" && v !== null;
}
function hasDefault(v) {
    return isRecord(v) && "default" in v;
}
function hasLunar2Solar(v) {
    return isRecord(v) && typeof (v)["lunar2solar"] === "function";
}
function assertL2S(v) {
    if (!isRecord(v))
        throw new Error("Invalid lunar2solar result");
    const y = v["cYear"], m = v["cMonth"], d = v["cDay"], leap = v["isLeap"];
    if (typeof y !== "number" || typeof m !== "number" || typeof d !== "number") {
        throw new Error("Invalid lunar2solar fields");
    }
    return { cYear: y, cMonth: m, cDay: d, isLeap: typeof leap === "boolean" ? leap : undefined };
}
function pickSolarLunar(mod) {
    const base = hasDefault(mod) ? mod.default : mod;
    if (!hasLunar2Solar(base))
        throw new Error("solarlunar.lunar2solar not found");
    const lunar2solar = (y, m, d, isLeap) => {
        const res = (base).lunar2solar(y, m, d, !!isLeap);
        return assertL2S(res);
    };
    return { lunar2solar };
}
const SL = pickSolarLunar(solarlunar);
/* ── 메인: 음→양 보장 ── */
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
export function ensureSolarBirthDay(ms) {
    const any = ms;
    const birthDay = typeof any.birthDay === "string" ? any.birthDay : "";
    const calType = typeof any.calendarType === "string" ? any.calendarType : "solar";
    if (birthDay.length < 8 || calType !== "lunar")
        return ms;
    const y = Number(birthDay.slice(0, 4));
    const m = Number(birthDay.slice(4, 6));
    const d = Number(birthDay.slice(6, 8));
    // 다양한 윤달 필드 수용
    const leapFlags = ["isLeap", "isLeapMonth", "leapMonth", "leap", "lunarLeap"];
    let isLeap = false;
    for (const k of leapFlags) {
        const v = any[k];
        if (typeof v === "boolean") {
            isLeap = v;
            break;
        }
        if (typeof v === "number") {
            isLeap = v === 1;
            break;
        }
        if (typeof v === "string") {
            isLeap = v === "1" || v.toLowerCase() === "true";
            break;
        }
    }
    try {
        const res = SL.lunar2solar(y, m, d, isLeap);
        const newBirthDay = `${res.cYear}${pad2(res.cMonth)}${pad2(res.cDay)}`;
        return {
            ...ms,
            birthDay: newBirthDay,
            calendarType: "solar",
        };
    }
    catch {
        // 실패 시 원본 유지(최소 안전)
        return ms;
    }
}
