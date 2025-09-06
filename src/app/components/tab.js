import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// features/UnMyounTabs.tsx
import { useMemo, useState } from "react";
import UnViewer from "@/features/luck/viewer";
import MyoUnViewer from "@/features/myoun/MyoUnViewer";
import AnalysisReport from "@/features/AnalysisReport/";
import * as solarlunar from "solarlunar";
// 간지 계산 유틸
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi, } from "@/shared/domain/간지/공통";
import { toCorrected } from "@/shared/domain/meongsik"; // 경도/DST 교정
function isRecord(v) {
    return typeof v === "object" && v !== null;
}
function hasDefault(v) {
    return isRecord(v) && "default" in v;
}
function hasLunar2Solar(v) {
    return isRecord(v) && typeof v["lunar2solar"] === "function";
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
        const res = base.lunar2solar(y, m, d, !!isLeap);
        return assertL2S(res);
    };
    return { lunar2solar };
}
const SL = pickSolarLunar(solarlunar);
/* ────────────────────────────────────────────────────────────────────────────
 * 달력 변환/유틸
 * ──────────────────────────────────────────────────────────────────────────── */
const DEBUG = false;
const isGZ = (s) => typeof s === "string" && s.length >= 2;
const isValidPillars = (arr) => Array.isArray(arr) && arr.length === 4 && arr.every(isGZ);
const pad2 = (n) => (n < 10 ? `0${n}` : `${n}`);
/** data가 음력이라면 반드시 ‘양력 birthDay(YYYYMMDD)’로 치환한 사본을 반환 */
function ensureSolarBirthDay(data) {
    // 느슨하게 접근(타입 안전)
    const any = data;
    const birthDay = typeof any.birthDay === "string" ? any.birthDay : "";
    const calType = typeof any.calendarType === "string" ? any.calendarType : "solar";
    if (birthDay.length < 8)
        return data; // 날짜 형식 불충분 → 원본 유지
    const y = Number(birthDay.slice(0, 4));
    const m = Number(birthDay.slice(4, 6));
    const d = Number(birthDay.slice(6, 8));
    // 프로젝트에 있을 수 있는 다양한 윤달 필드 케이스를 모두 수용
    const leapFlags = [
        "isLeap", "isLeapMonth", "leapMonth", "leap", "lunarLeap",
    ];
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
    if (calType === "lunar") {
        try {
            const res = SL.lunar2solar(y, m, d, isLeap);
            const newBirthDay = `${res.cYear}${pad2(res.cMonth)}${pad2(res.cDay)}`;
            const out = {
                ...data,
                birthDay: newBirthDay,
                calendarType: "solar",
            };
            if (DEBUG) {
                console.debug("[UnMyounTabs] lunar→solar:", { in: { y, m, d, isLeap }, out: newBirthDay });
            }
            return out;
        }
        catch (e) {
            if (DEBUG)
                console.warn("[UnMyounTabs] lunar2solar 실패 → 원본 유지", e);
            return data;
        }
    }
    return data; // 이미 양력
}
/* ────────────────────────────────────────────────────────────────────────────
 * 컴포넌트
 * ──────────────────────────────────────────────────────────────────────────── */
export default function UnMyounTabs({ data }) {
    const [tab, setTab] = useState("un");
    // 1) ‘양력화 사본’을 만든 뒤 교정 → 모든 간지 계산은 이 correctedSolar 기준
    const correctedSolar = useMemo(() => {
        try {
            const solarized = ensureSolarBirthDay(data); // ✅ 음→양 보장(윤달 포함)
            const corrected = toCorrected(solarized); // 경도/DST 교정
            if (DEBUG)
                console.debug("[UnMyounTabs] correctedSolar:", corrected.toString());
            return corrected;
        }
        catch (e) {
            if (DEBUG)
                console.warn("[UnMyounTabs] toCorrected 실패 → now()", e);
            return new Date();
        }
    }, [data]);
    // 2) 양력 간지(연/월/일/시) 계산
    const pillars = useMemo(() => {
        try {
            const y = getYearGanZhi(correctedSolar, data?.birthPlace?.lon);
            const m = getMonthGanZhi(correctedSolar, data?.birthPlace?.lon);
            const d = getDayGanZhi(correctedSolar, data?.mingSikType);
            const h = getHourGanZhi(correctedSolar, data?.mingSikType);
            const arr = [y, m, d, h];
            if (DEBUG)
                console.debug("[UnMyounTabs] pillars:", arr);
            return isValidPillars(arr) ? arr : [];
        }
        catch (e) {
            if (DEBUG)
                console.warn("[UnMyounTabs] 간지 계산 실패", e);
            return [];
        }
    }, [correctedSolar, data?.mingSikType, data?.birthPlace?.lon]);
    return (_jsxs("div", { className: "w-[96%] max-w-[640px] mx-auto", children: [_jsxs("div", { className: "flex border-b border-neutral-700 mb-4", children: [_jsx("button", { onClick: () => setTab("un"), className: `px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b hover:border-purple-500 hover:text-purple-500 font-bold ${tab === "un" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"}`, children: "\uAE30\uBCF8\uC6B4 \uBDF0\uC5B4" }), _jsx("button", { onClick: () => setTab("myoun"), className: `px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b hover:border-purple-500 hover:text-purple-500 font-bold ${tab === "myoun" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"}`, children: "\uBB18\uC6B4 \uBDF0\uC5B4" }), _jsx("button", { onClick: () => setTab("report"), className: `px-2 desk:px-4 py-2 text-xs desk:text-sm cursor-pointer border-b hover:border-purple-500 hover:text-purple-500 font-bold ${tab === "report" ? "border-purple-500 text-purple-500" : "border-transparent text-neutral-400"}`, children: "\uBD84\uC11D \uB808\uD3EC\uD2B8" })] }), tab === "un" && _jsx(UnViewer, { data: data }), tab === "myoun" && _jsx(MyoUnViewer, { data: data }), tab === "report" && (
            // pillars(양력)만 확실히 전달 — lunarPillars는 생략
            _jsx(AnalysisReport, { data: data, pillars: isValidPillars(pillars) ? pillars : undefined }))] }));
}
