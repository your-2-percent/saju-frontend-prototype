import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// features/myoun/MyoUnViewer.tsx
import { useMemo, useState, useEffect, useRef } from "react";
import { computeNatalPillars, buildSijuSchedule, buildIljuFromSiju, buildWolju, buildYeonjuFromWolju, parseBirthLocal, } from "@/features/myoun";
import { formatDate24 } from "@/shared/utils";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/간지/공통";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { PillarCardShared } from "@/shared/ui/PillarCardShared";
import { ensureSolarBirthDay } from "@/shared/domain/meongsik/ensureSolarBirthDay";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
import * as Twelve from "@/shared/domain/간지/twelve";
/* ===== 간단 유틸 ===== */
// 2글자 간지 보장
const STEMS_ALL = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계", "甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BR_ALL = ["자", "축", "인", "묘", "진", "사", "오", "미", "신", "유", "술", "해", "子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
const STEM_SET = new Set(STEMS_ALL);
const BR_SET = new Set(BR_ALL);
function isGZ(x) { return typeof x === "string" && x.length >= 2 && STEM_SET.has(x[0]) && BR_SET.has(x[1]); }
function ensureGZ(maybe, ...fallbacks) {
    if (isGZ(maybe))
        return maybe;
    for (const f of fallbacks)
        if (isGZ(f))
            return f;
    return "甲子";
}
// 한자↔한글 매핑
const STEM_H2K = { "甲": "갑", "乙": "을", "丙": "병", "丁": "정", "戊": "무", "己": "기", "庚": "경", "辛": "신", "壬": "임", "癸": "계" };
const BR_H2K = { "子": "자", "丑": "축", "寅": "인", "卯": "묘", "辰": "진", "巳": "사", "午": "오", "未": "미", "申": "신", "酉": "유", "戌": "술", "亥": "해" };
const STEMS_KO = ["갑", "을", "병", "정", "무", "기", "경", "신", "임", "계"];
function isKoStem(s) {
    return !!s && STEMS_KO.includes(s);
}
function toKoreanStem(ch) { return STEM_H2K[ch] ?? ch; }
function toKoreanBranch(ch) { return BR_H2K[ch] ?? ch; }
function toKoStemStrict(ch) {
    if (isKoStem(ch))
        return ch;
    const k = STEM_H2K[ch];
    if (isKoStem(k))
        return k;
    return "갑";
}
function isEraRuntime(v) {
    return typeof v === "object" && v !== null && ("Classic" in v || "Modern" in v || "classic" in v || "modern" in v);
}
function mapEra(mode) {
    const exported = Twelve.EraType;
    if (isEraRuntime(exported)) {
        return mode === "classic"
            ? (exported.Classic ?? exported.classic)
            : (exported.Modern ?? exported.modern);
    }
    return mode;
}
// 이벤트 검색
function lastAtOrNull(arr, t) {
    let ans = null;
    const x = t.getTime();
    for (const e of arr) {
        if (e.at.getTime() <= x)
            ans = e;
        else
            break;
    }
    return ans;
}
// datetime-local 헬퍼
function toLocalInput(d) {
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(s) {
    if (!s)
        return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
    if (!m)
        return null;
    const [, y, mo, d, hh, mm] = m;
    const dt = new Date(+y, +mo - 1, +d, +hh, +mm);
    return isNaN(dt.getTime()) ? null : dt;
}
/* ===== 메인 ===== */
export default function MyoUnViewer({ data }) {
    // 설정: 대운리스트와 동일 스토어에서 읽기
    const settings = useSettingsStore(s => s.settings);
    const { showSibiUnseong, showSibiSinsal, sinsalBase, sinsalMode, sinsalBloom } = settings;
    // 고정 옵션
    const [dir] = useState(data.dir ?? "forward");
    const [rule] = useState("인시일수론");
    const [hourTable] = useState("자시");
    // 출생/원국
    const solarized = useMemo(() => ensureSolarBirthDay(data), [data]);
    const birth = useMemo(() => parseBirthLocal(solarized), [solarized]);
    const natal = useMemo(() => computeNatalPillars(solarized, hourTable), [solarized, hourTable]);
    // 일간(한글 키로 강제 정규화)
    const natalDayStem = useMemo(() => toKoStemStrict(natal.day?.charAt(0) ?? "갑"), [natal.day]);
    // 피커 (1분 갱신)
    const nowRef = useRef(new Date());
    const [pick, setPick] = useState(() => toLocalInput(nowRef.current));
    const lastValidRef = useRef(fromLocalInput(pick) ?? nowRef.current);
    useEffect(() => {
        const timer = setInterval(() => {
            const next = toLocalInput(new Date());
            setPick(prev => (prev === next ? prev : next));
        }, 60_000);
        return () => clearInterval(timer);
    }, []);
    const effectiveDate = useMemo(() => {
        const d = fromLocalInput(pick);
        if (d)
            lastValidRef.current = d;
        return lastValidRef.current;
    }, [pick]);
    // 묘운 스케줄
    const siju = useMemo(() => buildSijuSchedule(birth, natal.hour, dir, 120, hourTable), [birth, natal.hour, dir, hourTable]);
    const ilju = useMemo(() => buildIljuFromSiju(siju, natal.day, dir, rule), [siju, natal.day, dir, rule]);
    const wolju = useMemo(() => buildWolju(birth, natal.month, dir, 120, solarized.birthPlace?.lon), [birth, natal.month, dir, solarized.birthPlace?.lon]);
    const yeonju = useMemo(() => buildYeonjuFromWolju(wolju, natal.year, dir, rule, birth), [wolju, natal.year, dir, rule, birth]);
    // ▼▼ 추가: "첫 전환" 요약 (시주/월주)
    const firstSijuChange = useMemo(() => {
        const e0 = siju?.events?.[0];
        return e0
            ? { at: e0.at, from: ensureGZ(natal.hour), to: ensureGZ(e0.gz) }
            : null;
    }, [siju?.events, natal.hour]);
    const firstWoljuChange = useMemo(() => {
        const e0 = wolju?.events?.[0];
        return wolju?.firstChange
            ? { at: wolju.firstChange, from: ensureGZ(natal.month), to: ensureGZ(e0?.gz ?? natal.month) }
            : null;
    }, [wolju?.firstChange, wolju?.events, natal.month]);
    // 현재 묘운 간지
    const current = useMemo(() => {
        const t = effectiveDate;
        return {
            si: ensureGZ(lastAtOrNull(siju.events, t)?.gz, natal.hour),
            il: ensureGZ(lastAtOrNull(ilju.events, t)?.gz, natal.day),
            wl: ensureGZ(lastAtOrNull(wolju.events, t)?.gz, natal.month),
            yn: ensureGZ(lastAtOrNull(yeonju.events, t)?.gz, natal.year),
        };
    }, [effectiveDate, siju.events, ilju.events, wolju.events, yeonju.events, natal.hour, natal.day, natal.month, natal.year]);
    // 실시간 간지
    const live = useMemo(() => ({
        si: ensureGZ(getHourGanZhi(effectiveDate, "자시")),
        il: ensureGZ(getDayGanZhi(effectiveDate, "자시")),
        wl: ensureGZ(getMonthGanZhi(effectiveDate)),
        yn: ensureGZ(getYearGanZhi(effectiveDate)),
    }), [effectiveDate]);
    // 신살 기준 지지
    const baseBranch = useMemo(() => (sinsalBase === "일지" ? natal.day.charAt(1) : natal.year.charAt(1)), [sinsalBase, natal.day, natal.year]);
    // Era 매핑
    const era = useMemo(() => mapEra(sinsalMode), [sinsalMode]);
    // 운성/신살 텍스트 (계산은 ‘한글’로)
    const calcTexts = (gz) => {
        const dsK = toKoreanStem(natalDayStem); // 일간(한글)
        const tbK = toKoreanBranch(gz.charAt(1)); // 대상 지지(한글)
        const bbK = toKoreanBranch(baseBranch); // 기준 지지(한글)
        return {
            unseong: showSibiUnseong ? (getTwelveUnseong(dsK, tbK) || "") : "",
            shinsal: showSibiSinsal ? (getTwelveShinsalBySettings({ baseBranch: bbK, targetBranch: tbK, era, gaehwa: !!sinsalBloom }) || "") : "",
        };
    };
    return (_jsxs("div", { className: "w-full max-w-[640px] mx-auto mb-4 px-2 py-4 desk:p-4 bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 rounded-xl shadow border border-neutral-200 dark:border-neutral-800", children: [_jsx("header", { className: "flex flex-wrap items-center gap-3 justify-between mb-4", children: _jsxs("div", { className: "font-semibold text-xs desk:text-sm", children: ["\uBB18\uC6B4 + \uC2E4\uC2DC\uAC04 \uC6B4 \uBDF0\uC5B4", " ", _jsxs("span", { className: "text-neutral-500 dark:text-neutral-400", children: ["(\uCD9C\uC0DD: ", formatDate24(birth), ")"] })] }) }), _jsxs("div", { className: "grid grid-cols-2 gap-2 desk:gap-4 mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs mb-2 text-neutral-600 dark:text-neutral-300", children: "\uBB18\uC6B4\uBDF0\uC5B4" }), _jsx("div", { className: "grid grid-cols-4 gap-1 desk:gap-2", children: [
                                    ["시주", current.si],
                                    ["일주", current.il],
                                    ["월주", current.wl],
                                    ["연주", current.yn],
                                ].map(([label, gz]) => {
                                    const { unseong, shinsal } = calcTexts(gz);
                                    return (_jsx(PillarCardShared, { label: label, gz: gz, dayStem: natalDayStem, settings: settings, unseongText: unseong, shinsalText: shinsal, hideBranchSipSin: true, size: "sm" }, `m-${label}`));
                                }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs mb-2 text-neutral-600 dark:text-neutral-300", children: "\uC2E4\uC2DC\uAC04 \uAC04\uC9C0\uBDF0\uC5B4" }), _jsx("div", { className: "grid grid-cols-4 gap-1 desk:gap-2", children: [
                                    ["시주", live.si],
                                    ["일주", live.il],
                                    ["월주", live.wl],
                                    ["연주", live.yn],
                                ].map(([label, gz]) => {
                                    const { unseong, shinsal } = calcTexts(gz);
                                    return (_jsx(PillarCardShared, { label: label, gz: gz, dayStem: natalDayStem, settings: settings, unseongText: unseong, shinsalText: shinsal, hideBranchSipSin: true, size: "sm" }, `l-${label}`));
                                }) })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row gap-3 items-center", children: [_jsx("label", { className: "text-sm text-neutral-600 dark:text-neutral-400", children: "\uB0A0\uC9DC/\uC2DC\uAC04 \uC120\uD0DD" }), _jsx("input", { type: "datetime-local", value: pick, onChange: (e) => setPick(e.target.value), className: "bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-3 py-1 text-xs desk:text-sm text-neutral-900 dark:text-neutral-100 sm:w-auto", min: "1900-01-01T00:00", max: "2100-12-31T23:59" })] }), _jsxs("div", { className: "mt-4 text-xs text-neutral-700 dark:text-neutral-300 space-y-1", children: [_jsx("div", { className: "font-semibold", children: "\uCCAB \uC804\uD658 \uC2DC\uAC01" }), _jsxs("div", { children: ["\uC2DC\uC8FC:", " ", firstSijuChange
                                ? `${formatDate24(firstSijuChange.at)} (${firstSijuChange.from} → ${firstSijuChange.to})`
                                : "계산 불가"] }), _jsxs("div", { children: ["\uC6D4\uC8FC:", " ", firstWoljuChange
                                ? `${formatDate24(firstWoljuChange.at)} (${firstWoljuChange.from} → ${firstWoljuChange.to})`
                                : "계산 불가"] })] })] }));
}
