import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// features/AnalysisReport/AnalysisReport.tsx
import { useEffect, useMemo, useState } from "react";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { computePowerDataDetailed } from "./utils/computePowerData";
import PentagonChart from "./PentagonChart";
import StrengthBar from "./StrengthBar";
import HarmonyTagPanel from "./HarmonyTagPanel";
import { getTenGodColors } from "./utils/colors";
import * as YongshinMod from "./utils/yongshin";
import LuckDatePicker from "./ui/LuckDatePicker";
import { normalizeGZ } from "./logic/relations";
import { useDaewoonList } from "@/features/luck/useDaewoonList";
import { blendElementStrength, BLEND_TABS } from "./logic/blend";
import { mapElementsToTenGods } from "./utils/tenGod";
import ShinsalTagPanel from "./ShinsalTagPanel";
// 🔽 세운/월운 초기값 계산용
import { getYearGanZhi, getMonthGanZhi } from "@/shared/domain/간지/공통";
// 필요 시 프로젝트 기준에 맞게 가져다 쓰세요.
const EMPTY_TOTALS = Object.freeze([]);
const STEM_H2K = {
    甲: "갑", 乙: "을", 丙: "병", 丁: "정", 戊: "무",
    己: "기", 庚: "경", 辛: "신", 壬: "임", 癸: "계",
};
const BRANCH_H2K = {
    子: "자", 丑: "축", 寅: "인", 卯: "묘", 辰: "진", 巳: "사",
    午: "오", 未: "미", 申: "신", 酉: "유", 戌: "술", 亥: "해",
};
const STEM_TO_ELEMENT = {
    갑: "목", 을: "목", 병: "화", 정: "화", 무: "토", 기: "토",
    경: "금", 신: "금", 임: "수", 계: "수",
};
const BRANCH_MAIN_ELEMENT = {
    자: "수", 축: "토", 인: "목", 묘: "목", 진: "토", 사: "화",
    오: "화", 미: "토", 신: "금", 유: "금", 술: "토", 해: "수",
};
function normalizeGZLocal(raw) {
    if (!raw)
        return "";
    const s = raw.replace(/[()[\]{}]/g, "").replace(/\s+/g, "").replace(/[년월일시年月日時干支柱:\-_.]/g, "");
    const mKo = s.match(/([갑을병정무기경신임계]).*?([자축인묘진사오미신유술해])/);
    if (mKo)
        return `${mKo[1]}${mKo[2]}`;
    const mHa = s.match(/([甲乙丙丁戊己庚辛壬癸]).*?([子丑寅卯辰巳午未申酉戌亥])/);
    if (mHa)
        return `${STEM_H2K[mHa[1]]}${BRANCH_H2K[mHa[2]]}`;
    return "";
}
function normalizePillars(input) {
    const arr = Array.isArray(input) ? input.slice(0, 4) : [];
    while (arr.length < 4)
        arr.push("");
    return arr.map(normalizeGZLocal);
}
function isValidPillars(p) {
    return p.length === 4 && p.every((x) => x.length === 2);
}
// 존재(부재) 판단 — 기본: 천간만, 옵션으로 지지 포함 가능
function elementPresenceFromPillars(p, opts) {
    const includeBranches = !!opts?.includeBranches;
    const present = { 목: false, 화: false, 토: false, 금: false, 수: false };
    for (const gz of p) {
        if (!gz)
            continue;
        const se = STEM_TO_ELEMENT[gz.charAt(0)];
        if (se)
            present[se] = true;
        if (includeBranches) {
            const be = BRANCH_MAIN_ELEMENT[gz.charAt(1)];
            if (be)
                present[be] = true;
        }
    }
    return present;
}
function lightElementScoreFromPillars(p) {
    const acc = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
    for (const gz of p) {
        if (!gz)
            continue;
        const se = STEM_TO_ELEMENT[gz.charAt(0)];
        const be = BRANCH_MAIN_ELEMENT[gz.charAt(1)];
        if (se)
            acc[se] += 10;
        if (be)
            acc[be] += 6;
    }
    return acc;
}
function isRecord(v) {
    return typeof v === "object" && v !== null;
}
function pickYongshinFn(mod) {
    if (!isRecord(mod))
        return null;
    if (typeof mod["computeYongshin"] === "function")
        return mod["computeYongshin"];
    if (isRecord((mod).default) && typeof (mod).default.computeYongshin === "function") {
        return (mod).default.computeYongshin;
    }
    return null;
}
export default function AnalysisReport({ data, pillars, lunarPillars, daewoonGz: daewoonGzProp, }) {
    //const [tab] = useState<BlendTab>("원국만");
    // 상단 import/유틸은 기존 그대로 가정합니다.
    const settings = useSettingsStore(s => s.settings);
    const DEBUG = true;
    const [basis] = useState("solar");
    const [demoteAbsent, setDemoteAbsent] = useState(true);
    const [criteriaMode, setCriteriaMode] = useState("modern");
    // 🔽 탭(원국/대운/세운/월운)은 luckKey 이전에 선언되어야 함
    const [blendTab, setBlendTab] = useState("원국");
    // 🔽 날짜 피커 & 운 간지
    const [picked, setPicked] = useState(new Date());
    const [seGz, setSeGz] = useState(null); // 세운
    const [wolGz, setWolGz] = useState(null); // 월운
    // ✅ 최초 마운트 시 오늘 날짜 기준으로 세운/월운 자동 설정
    useEffect(() => {
        const y = normalizeGZ(getYearGanZhi(picked, 127.5));
        const m = normalizeGZ(getMonthGanZhi(picked));
        setSeGz(y);
        setWolGz(m);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const onPickChange = ({ date, yearGZ, monthGZ, }) => {
        setPicked(date);
        setSeGz(normalizeGZ(yearGZ));
        setWolGz(normalizeGZ(monthGZ));
    };
    // 🔽 대운 리스트 (기존 코드 그대로 사용)
    const daeList = useDaewoonList(data, data?.mingSikType);
    // ✅ 피커 날짜 기준으로 현재 대운 인덱스 계산
    const autoDaeIndex = useMemo(() => {
        if (!daeList || daeList.length === 0)
            return 0;
        const ref = picked;
        const i = daeList.findIndex((d, k) => {
            const next = daeList[k + 1]?.at;
            return ref >= d.at && (!next || ref < next);
        });
        if (i !== -1)
            return i;
        if (ref < daeList[0].at)
            return 0;
        return daeList.length - 1;
    }, [daeList, picked]);
    // 현재 대운 간지
    const daewoonGz = useMemo(() => {
        const raw = daewoonGzProp ?? daeList[autoDaeIndex]?.gz ?? "";
        const ko = normalizeGZ(raw);
        return ko || null;
    }, [daewoonGzProp, daeList, autoDaeIndex]);
    // 원국/음력 처리
    const solarKo = useMemo(() => normalizePillars(pillars), [pillars]);
    const lunarKo = useMemo(() => normalizePillars(lunarPillars), [lunarPillars]);
    const solarValid = isValidPillars(solarKo);
    const lunarValid = isValidPillars(lunarKo);
    const effectiveBasis = basis === "lunar" ? (lunarValid ? "lunar" : "solar") : (solarValid ? "solar" : "lunar");
    const activePillars = (effectiveBasis === "lunar" ? lunarKo : solarKo);
    // 설정값
    const mode = settings.hiddenStemMode === "classic" ? "classic" : "hgc";
    const hidden = settings.hiddenStem === "regular" ? "regular" : "all";
    // ✅ 운 상태 키 (탭/운이 바뀌면 detailed 재계산)
    const luckKey = useMemo(() => [
        blendTab, // "원국" | "대운" | "세운" | "월운"
        daewoonGz ?? "",
        seGz ?? "",
        wolGz ?? "",
    ].join("|"), [blendTab, daewoonGz, seGz, wolGz]);
    // 운 입력을 별도 memo로 분리 (키/날짜 변화에 맞춰 참조 갱신)
    const luckInput = useMemo(() => ({
        tab: blendTab,
        dae: daewoonGz || undefined,
        se: seGz || undefined,
        wol: wolGz || undefined,
        // 필요하면 주석 해제하여 운 계산에 날짜까지 반영
        // date: picked,
    }), [blendTab, daewoonGz, seGz, wolGz /*, picked*/]);
    const detailed = useMemo(() => {
        if (!solarValid && !lunarValid)
            return null;
        return computePowerDataDetailed({
            pillars: activePillars, // 연월일시
            dayStem: activePillars?.[2]?.charAt(0), // 일간(안전 추출)
            mode, // "hgc" | "classic"
            hidden, // "all" | "regular"
            debug: DEBUG,
            useHarmonyOverlay: false, // 필요 시 true
            criteriaMode, // "modern" | "classic"
            luck: luckInput, // ✅ 운 반영
        });
        // luckInput을 deps에 직접 넣어 참조 변화에 따른 재계산 보장
    }, [criteriaMode, activePillars, mode, hidden, DEBUG, luckInput, solarValid, lunarValid]);
    // 합계/점수 등
    const totals = useMemo(() => detailed?.totals ?? EMPTY_TOTALS, [detailed]);
    const elementScoreRaw = detailed?.elementScoreRaw ?? lightElementScoreFromPillars(activePillars);
    const colorsMap = getTenGodColors(activePillars[2]?.charAt(0));
    const dataForChart = totals.map((d) => ({ ...d, color: colorsMap[d.name] }));
    const totalsMap = useMemo(() => {
        const m = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
        for (const t of totals)
            m[t.name] = t.value;
        return m;
    }, [totals]);
    const mult = useMemo(() => {
        const flags = detailed?.deukFlags;
        if (!flags)
            return { 비겁: 1, 식상: 1, 재성: 1, 관성: 1, 인성: 1 };
        const W_L = 0.08, W_G = 0.05, W_S = 0.07;
        const out = { 비겁: 1, 식상: 1, 재성: 1, 관성: 1, 인성: 1 };
        Object.keys(flags).forEach((k) => {
            const f = flags[k];
            out[k] += (f.령 ? W_L : 0) + (f.지 ? W_G : 0) + (f.세 ? W_S : 0);
        });
        return out;
    }, [detailed?.deukFlags]);
    const strengthPct = useMemo(() => {
        const numerator = (totalsMap.비겁 ?? 0) * mult.비겁 + (totalsMap.인성 ?? 0) * mult.인성;
        const denom = (totalsMap.비겁 ?? 0) * mult.비겁 +
            (totalsMap.식상 ?? 0) * mult.식상 +
            (totalsMap.재성 ?? 0) * mult.재성 +
            (totalsMap.관성 ?? 0) * mult.관성 +
            (totalsMap.인성 ?? 0) * mult.인성;
        if (denom <= 0) {
            const sum = (totalsMap.비겁 ?? 0) +
                (totalsMap.식상 ?? 0) +
                (totalsMap.재성 ?? 0) +
                (totalsMap.관성 ?? 0) +
                (totalsMap.인성 ?? 0) || 1;
            return (((totalsMap.비겁 ?? 0) + (totalsMap.인성 ?? 0)) / sum) * 100;
        }
        return (numerator / denom) * 100;
    }, [totalsMap, mult]);
    // 부재 판단
    const presentMap = useMemo(() => elementPresenceFromPillars(activePillars, { includeBranches: true }), [activePillars]);
    const hasAbsent = useMemo(() => ["목", "화", "토", "금", "수"].some((el) => !presentMap[el]), [presentMap]);
    const elemForFallback = elementScoreRaw ?? lightElementScoreFromPillars(activePillars);
    // 혼합 점수(운 반영)
    //const tenGodOrder: TenGod[] = ["비겁", "식상", "재성", "관성", "인성"];
    const mixed = useMemo(() => blendElementStrength({
        natalElementScore: elementScoreRaw,
        // 탭에 따라 들어갈 운만 넘김
        daewoonGz: blendTab !== "원국" ? daewoonGz ?? undefined : undefined,
        sewoonGz: blendTab === "세운" || blendTab === "월운" ? seGz ?? undefined : undefined,
        wolwoonGz: blendTab === "월운" ? wolGz ?? undefined : undefined,
        tab: blendTab,
    }), [elementScoreRaw, daewoonGz, seGz, wolGz, blendTab]);
    // 용신 (기존 로직 그대로)
    const ysFn = pickYongshinFn(YongshinMod);
    const yongshin = ysFn
        ? ysFn(activePillars, dataForChart, { elementScore: elementScoreRaw })
        : null;
    const yongshinList = useMemo(() => {
        const raw = isRecord(yongshin) && Array.isArray((yongshin).ordered)
            ? (yongshin).ordered
            : [];
        let list = raw.map((rec) => {
            const elementU = rec["element"];
            const scoreU = rec["score"];
            const reasonsU = rec["reasons"];
            const element = typeof elementU === "string" ? elementU : "";
            const elNorm = (() => {
                if (/목|木|wood/i.test(element))
                    return "목";
                if (/화|火|fire/i.test(element))
                    return "화";
                if (/토|土|earth/i.test(element))
                    return "토";
                if (/금|金|metal/i.test(element))
                    return "금";
                if (/수|水|water/i.test(element))
                    return "수";
                return null;
            })();
            const score = typeof scoreU === "number"
                ? scoreU
                : elNorm
                    ? elemForFallback[elNorm] ?? 0
                    : 0;
            const reasons = Array.isArray(reasonsU) ? reasonsU : [];
            return { element, elNorm, score, reasons };
        });
        // 부재후순위
        if (demoteAbsent) {
            list = list.map((it) => it.elNorm && !presentMap[it.elNorm]
                ? {
                    ...it,
                    score: 0,
                    reasons: [...it.reasons, "부재후순위: 원국(천간) 부재 → 0점"],
                }
                : it);
        }
        list.sort((a, b) => {
            if (demoteAbsent) {
                const ap = a.elNorm && presentMap[a.elNorm] ? 1 : 0;
                const bp = b.elNorm && presentMap[b.elNorm] ? 1 : 0;
                if (ap !== bp)
                    return bp - ap;
            }
            if ((b.score ?? 0) !== (a.score ?? 0))
                return (b.score ?? 0) - (a.score ?? 0);
            return (a.elNorm ?? a.element).localeCompare(b.elNorm ?? b.element);
        });
        return list;
    }, [yongshin, presentMap, demoteAbsent, elemForFallback]);
    const maxScoreInList = useMemo(() => Math.max(0, ...yongshinList.map((it) => Number.isFinite(it.score) ? it.score : 0)), [yongshinList]);
    const barWidthPct = (idx, s) => {
        const val = typeof s === "number" && isFinite(s) && s > 0 ? s : 0;
        if (maxScoreInList > 0) {
            const pct = Math.round((val / maxScoreInList) * 100);
            return Math.max(2, Math.min(100, pct));
        }
        const fallback = [70, 55, 40, 25, 15];
        return fallback[idx] ?? 12;
    };
    // (선택) 피커 텍스트
    // const pickedYMDText = useMemo(() => { ... }, [picked, seGz, wolGz]);
    const [bigTab, setBigTab] = useState("일간강약");
    // ✅ PentagonChart에 전달할 데이터/서브/리마운트 키
    const chartData = useMemo(() => {
        const colors = getTenGodColors(activePillars[2]?.charAt(0));
        return ["비겁", "식상", "재성", "관성", "인성"].map(god => {
            const value = ["목", "화", "토", "금", "수"]
                .map(el => (mapElementsToTenGods(el, activePillars[2][0]) === god ? mixed[el] : 0))
                .reduce((a, b) => a + b, 0);
            return { name: god, value, color: colors[god] };
        });
    }, [mixed, activePillars]);
    // detailed.perTenGod을 chartData 값에 맞춰 재스케일
    const round1 = (n) => Math.round((n + Number.EPSILON) * 10) / 10;
    const perTenGodForChart = useMemo(() => {
        if (!detailed?.perTenGod)
            return undefined;
        const cloned = JSON.parse(JSON.stringify(detailed.perTenGod));
        ["비겁", "식상", "재성", "관성", "인성"].forEach(name => {
            const target = chartData.find(d => d.name === name)?.value ?? 0;
            const p = cloned[name];
            const sum = (p?.aVal ?? 0) + (p?.bVal ?? 0);
            if (sum > 0) {
                const aRaw = (target * (p.aVal ?? 0)) / sum;
                const a = round1(aRaw);
                const b = round1(target - a); // 합 보정
                p.aVal = a;
                p.bVal = b;
            }
            else {
                const a = round1(target / 2);
                const b = round1(target - a);
                p.aVal = a;
                p.bVal = b;
            }
        });
        return cloned;
    }, [detailed, chartData]);
    // 운/기둥/값이 바뀌면 달라지는 키
    const revKey = useMemo(() => {
        const subsSig = perTenGodForChart
            ? ["비겁", "식상", "재성", "관성", "인성"]
                .map((k) => {
                const s = (perTenGodForChart)[k];
                const a = s?.aVal ?? s?.비견 ?? s?.정재 ?? 0;
                const b = s?.bVal ?? s?.겁재 ?? s?.편재 ?? 0;
                return `${k}:${Number(a)}|${Number(b)}`;
            })
                .join(",")
            : "none";
        const dataSig = chartData.map((d) => `${d.name}:${d.value}`).join(",");
        return `${luckKey}||${activePillars.join("")}||${dataSig}||${subsSig}`;
    }, [luckKey, activePillars, chartData, perTenGodForChart]);
    // 유효성 체크
    if (!solarValid && !lunarValid) {
        return (_jsx("div", { className: "p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-sm", children: "\uAC04\uC9C0\uB97C \uC778\uC2DD\uD560 \uC218 \uC5C6\uC5B4\uC694." }));
    }
    return (_jsxs("div", { className: "space-y-4 mb-4", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsx("div", { className: "flex gap-2 ", children: BLEND_TABS.map(t => (_jsx("button", { onClick: () => setBlendTab(t), className: "px-2 py-1 text-xs rounded border cursor-pointer " +
                                (blendTab === t
                                    ? "bg-yellow-500 text-black border-yellow-600 "
                                    : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700"), children: t }, t))) }), _jsxs("div", { className: "flex items-center justify-end gap-1 px-1", children: [_jsx("button", { type: "button", "aria-pressed": criteriaMode === "classic", onClick: () => setCriteriaMode("classic"), className: "px-2 py-1 text-xs cursor-pointer rounded border cursor-pointer " +
                                    (criteriaMode === "classic"
                                        ? "bg-yellow-500 text-black border-yellow-600"
                                        : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700"), children: "\uACE0\uC804" }), _jsx("button", { type: "button", "aria-pressed": criteriaMode === "modern", onClick: () => setCriteriaMode("modern"), className: "px-2 py-1 text-xs cursor-pointer rounded border cursor-pointer " +
                                    (criteriaMode === "modern"
                                        ? "bg-yellow-500 text-black border-yellow-600"
                                        : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700"), children: "\uD604\uB300" })] })] }), _jsx("div", { className: "flex gap-2 mb-4", children: ["일간강약", "오행강약", "형충회합", "신살"].map(t => (_jsx("button", { onClick: () => setBigTab(t), className: "px-3 py-1 text-sm rounded border cursor-pointer " +
                        (bigTab === t
                            ? "bg-violet-500 text-white border-violet-600"
                            : "bg-neutral-400 dark:bg-neutral-900 text-neutral-100 dark:text-neutral-300 border-neutral-400 dark:border-neutral-700"), children: t }, t))) }), bigTab === "형충회합" && (_jsx(HarmonyTagPanel, { pillars: activePillars, daewoon: blendTab !== "원국" ? daewoonGz ?? undefined : undefined, sewoon: blendTab === "세운" || blendTab === "월운" ? seGz ?? undefined : undefined, wolwoon: blendTab === "월운" ? wolGz ?? undefined : undefined, tab: blendTab })), bigTab === "일간강약" && (_jsxs("div", { className: "space-y-4", children: [_jsx(StrengthBar, { value: strengthPct }), _jsxs("div", { className: "w-full p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "text-sm font-bold", children: "\uC6A9\uC2E0 \uCD94\uCC9C" }), hasAbsent && (_jsxs("button", { type: "button", onClick: () => setDemoteAbsent(v => !v), className: `text-xs px-2 py-1 rounded-lg border transition cursor-pointer
                    ${demoteAbsent
                                            ? "bg-violet-100 text-violet-800 border-violet-200 whitespace-nowrap dark:bg-violet-900/30 dark:text-violet-200 dark:border-violet-800"
                                            : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-50 dark:bg-neutral-800 dark:text-neutral-200 dark:border-neutral-700"}`, "aria-pressed": demoteAbsent, children: ["\uBD80\uC7AC\uD6C4\uC21C\uC704: ", demoteAbsent ? "ON" : "OFF"] }))] }), _jsx("ul", { className: "space-y-2", children: yongshinList.map((it, idx) => (_jsxs("li", { className: "flex items-start justify-between gap-3 rounded-lg border border-neutral-200 dark:border-neutral-800 p-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "text-xs px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200", children: [idx + 1, "\uC704"] }), _jsx("span", { className: "text-sm font-semibold", children: it.element })] }), _jsxs("div", { className: "flex-1", children: [_jsx("div", { className: "mt-1 h-1.5 w-full rounded bg-neutral-300 dark:bg-neutral-800 overflow-hidden", children: _jsx("div", { className: "h-1.5 rounded bg-white dark:bg-neutral-100", style: { width: `${barWidthPct(idx, it.score)}%` }, title: `점수 ${it.score}` }) }), _jsx("div", { className: "mt-2 flex flex-wrap gap-1.5", children: (it.reasons ?? []).map((r, i) => (_jsx("span", { className: "text-[11px] px-2 py-0.5 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300", children: r }, i))) })] })] }, it.elNorm ?? it.element))) })] })] })), bigTab === "오행강약" && (_jsx(PentagonChart, { data: chartData, perTenGod: perTenGodForChart, revKey: revKey, pillars: activePillars, daewoonGz: blendTab !== "원국" ? daewoonGz ?? undefined : undefined, sewoonGz: blendTab === "세운" || blendTab === "월운" ? seGz ?? undefined : undefined, wolwoonGz: blendTab === "월운" ? wolGz ?? undefined : undefined })), bigTab === "신살" && (_jsx(ShinsalTagPanel, { pillars: pillars, daewoon: blendTab !== "원국" ? daewoonGz ?? undefined : undefined, sewoon: blendTab === "세운" || blendTab === "월운" ? seGz ?? undefined : undefined, wolwoon: blendTab === "월운" ? wolGz ?? undefined : undefined })), blendTab !== "원국" && (_jsx("div", { className: "mt-2", children: _jsx(LuckDatePicker, { value: picked, onChange: onPickChange }) }))] }));
}
