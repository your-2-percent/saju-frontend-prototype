import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// features/couple/CoupleViewer.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { computeNatalPillars, buildSijuSchedule, buildIljuFromSiju, buildWolju, buildYeonjuFromWolju, parseBirthLocal, } from "@/features/myoun";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/간지/공통";
import { toCorrected } from "@/shared/domain/meongsik";
import { PillarCardShared } from "@/shared/ui/PillarCardShared";
import { formatDate24 } from "@/shared/utils";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
// 십이운성/십이신살
import * as Twelve from "@/shared/domain/간지/twelve";
import { getTwelveUnseong, getTwelveShinsalBySettings } from "@/shared/domain/간지/twelve";
// dnd + icon
import { DragDropContext, Droppable, Draggable, } from "@hello-pangea/dnd";
import { GripVertical } from "lucide-react";
/* =============== 유틸 =============== */
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
    return Number.isNaN(dt.getTime()) ? null : dt;
}
function nameOf(ms) {
    const r = ms;
    if (typeof r.name === "string" && r.name)
        return r.name;
    if (typeof r.title === "string" && r.title)
        return r.title;
    if (typeof r.memo === "string" && r.memo)
        return r.memo;
    return "이름 없음";
}
function keyOf(ms) {
    const birth = parseBirthLocal(ms);
    return `${nameOf(ms)}-${birth.toISOString()}`;
}
function idOf(ms) {
    const r = ms;
    return (typeof r.id === "string" && r.id) ? r.id : keyOf(ms);
}
/* ===== EraType 안전 매핑 ===== */
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
/* =============== 명식 선택 모달 (드래그 정렬 + 로컬스토리지 저장) =============== */
const ORDER_KEY = "people_picker_order_v1";
function arrayMove(arr, from, to) {
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
}
function PeoplePickerModal({ open, list, onSelect, onClose, }) {
    const [q, setQ] = useState("");
    useEffect(() => { if (!open)
        setQ(""); }, [open]);
    // 현재 들어온 명식들의 ID
    const incomingIds = useMemo(() => list.map(idOf), [list]);
    const incomingIdSet = useMemo(() => new Set(incomingIds), [incomingIds]);
    // 저장된 순서 불러오기 (없거나, 오래된 항목 포함 시 정리)
    const [orderIds, setOrderIds] = useState([]);
    useEffect(() => {
        const raw = localStorage.getItem(ORDER_KEY);
        const saved = raw ? JSON.parse(raw) : [];
        // 1) 현재 리스트에 없는 예전 ID 제거
        const pruned = saved.filter((id) => incomingIdSet.has(id));
        // 2) 새로 들어온 ID를 뒤에 추가
        const withNew = [...pruned, ...incomingIds.filter((id) => !pruned.includes(id))];
        setOrderIds(withNew);
        // 저장본이 다르면 업데이트
        if (JSON.stringify(withNew) !== JSON.stringify(saved)) {
            localStorage.setItem(ORDER_KEY, JSON.stringify(withNew));
        }
    }, [incomingIds, incomingIdSet]);
    const persist = (ids) => {
        setOrderIds(ids);
        localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
    };
    // 표시 순서(저장된 순서를 기준으로 실제 객체 정렬)
    const ordered = useMemo(() => {
        const map = new Map(list.map((ms) => [idOf(ms), ms]));
        const result = [];
        for (const id of orderIds) {
            const it = map.get(id);
            if (it)
                result.push(it);
        }
        // 혹시 모를 누락 보강
        map.forEach((ms, id) => { if (!orderIds.includes(id))
            result.push(ms); });
        return result;
    }, [list, orderIds]);
    // 검색
    const filtered = useMemo(() => {
        const s = q.trim().toLowerCase();
        if (!s)
            return ordered;
        return ordered.filter((m) => nameOf(m).toLowerCase().includes(s));
    }, [ordered, q]);
    // 검색 중엔 드래그 비활성(인덱스 불일치 방지)
    const allowDrag = q.trim() === "";
    const onDragEnd = (r) => {
        const { destination, source, type } = r;
        if (!destination || type !== "ITEM" || !allowDrag)
            return;
        // allowDrag = true ⇒ filtered === ordered ⇒ visibleIds === orderIds
        const visibleIds = ordered.map(idOf);
        const nextVisible = arrayMove(visibleIds, source.index, destination.index);
        // visibleIds가 곧 저장 순서이므로 그대로 저장
        persist(nextVisible);
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: `fixed inset-0 bg-black/60 transition-opacity duration-200 z-[1000] ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`, onClick: onClose }), _jsxs("div", { className: `fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[640px] max-height-[90dvh] bg-white dark:bg-neutral-950 rounded-t-2xl border border-neutral-200 dark:border-neutral-800 p-4 overflow-auto transition-transform duration-300 z-[1001] ${open ? "translate-y-0" : "translate-y-full"}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "text-sm font-semibold text-neutral-900 dark:text-neutral-200", children: "\uBA85\uC2DD \uC120\uD0DD" }), _jsx("button", { onClick: onClose, className: "text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white text-sm cursor-pointer", children: "\uB2EB\uAE30" })] }), _jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx("input", { placeholder: "\uC774\uB984 \uAC80\uC0C9", value: q, onChange: (e) => setQ(e.target.value), className: "flex-1 px-3 py-2 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100" }), !allowDrag && (_jsx("span", { className: "text-[11px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap", children: "\uAC80\uC0C9 \uC911\uC5D4 \uC21C\uC11C \uBCC0\uACBD \uBD88\uAC00" }))] }), _jsx(DragDropContext, { onDragEnd: onDragEnd, children: _jsx(Droppable, { droppableId: "people:list", type: "ITEM", children: (prov) => (_jsxs("div", { ref: prov.innerRef, ...prov.droppableProps, className: "max-h-[60vh] overflow-y-auto grid grid-cols-1 gap-2", children: [filtered.map((m, i) => {
                                        const id = idOf(m);
                                        return (_jsx(Draggable, { draggableId: id, index: i, children: (drag) => (_jsx("div", { ref: drag.innerRef, ...drag.draggableProps, ...(allowDrag ? drag.dragHandleProps : {}), className: `w-full text-left p-3 rounded border bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-800 ${allowDrag ? "cursor-grab" : "cursor-default"}`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(GripVertical, { className: `shrink-0 ${allowDrag ? "opacity-60" : "opacity-30"} text-neutral-500 dark:text-neutral-400`, size: 16 }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-neutral-900 dark:text-neutral-50 text-sm truncate", children: nameOf(m) }), _jsx("div", { className: "text-neutral-500 dark:text-neutral-400 text-xs", children: formatDate24(parseBirthLocal(m)) })] }), _jsx("button", { onClick: () => { onSelect(m); onClose(); }, className: "ml-2 px-3 py-1 rounded text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 hover:opacity-90 cursor-pointer", children: "\uBA85\uC2DD \uC120\uD0DD\uD558\uAE30" })] }) })) }, id));
                                    }), prov.placeholder, filtered.length === 0 && (_jsx("div", { className: "text-center text-neutral-500 dark:text-neutral-400 text-sm py-6", children: "\uAC80\uC0C9 \uACB0\uACFC\uAC00 \uC5C6\uC5B4\uC694" }))] })) }) })] })] }));
}
/* =============== 공용 4기둥 렌더 =============== */
function FourPillarsRow({ label, gzHour, gzDay, gzMonth, gzYear, dayStem, cardSettings, 
// 신살 계산에 필요한 값들
sinsalBaseBranch, sinsalMode, sinsalBloom, }) {
    const calcTexts = (branch) => {
        const unseong = cardSettings.showSibiUnseong
            ? getTwelveUnseong(dayStem, branch)
            : "";
        const shinsal = cardSettings.showSibiSinsal
            ? getTwelveShinsalBySettings({
                baseBranch: sinsalBaseBranch,
                targetBranch: branch,
                era: mapEra(sinsalMode),
                gaehwa: !!sinsalBloom,
            })
            : "";
        return {
            unseongText: unseong || undefined,
            shinsalText: shinsal || undefined,
        };
    };
    const bSi = ensureGZ(gzHour).charAt(1);
    const bIl = ensureGZ(gzDay).charAt(1);
    const bWl = ensureGZ(gzMonth).charAt(1);
    const bYn = ensureGZ(gzYear).charAt(1);
    return (_jsxs("div", { className: "rounded-lg border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 py-2 desk:p-2", children: [_jsx("div", { className: "px-2 py-1 text-xs text-neutral-600 dark:text-neutral-300", children: label }), _jsx("div", { className: "grid grid-cols-4 gap-1 text-neutral-900 dark:text-white", children: [
                    ["시주", ensureGZ(gzHour), bSi],
                    ["일주", ensureGZ(gzDay), bIl],
                    ["월주", ensureGZ(gzMonth), bWl],
                    ["연주", ensureGZ(gzYear), bYn],
                ].map(([lbl, gz, br]) => {
                    const { unseongText, shinsalText } = calcTexts(br);
                    return (_jsx(PillarCardShared, { label: lbl, gz: gz, dayStem: dayStem, settings: cardSettings, unseongText: unseongText, shinsalText: shinsalText, hideBranchSipSin: true, size: "sm" }, `${label}-${lbl}`));
                }) })] }));
}
/* =============== 사람 한 칸(원국/묘운/실시간) =============== */
function tryParseBirthLocal(ms) {
    try {
        return ms ? parseBirthLocal(ms) : null;
    }
    catch {
        return null;
    }
}
function genderOf(ms) {
    if (!ms)
        return "";
    const r = ms;
    const str = (key) => typeof r[key] === "string" ? String(r[key]).trim().toLowerCase() : null;
    const bool = (key) => (typeof r[key] === "boolean" ? r[key] : null);
    const candidates = [
        str("gender"),
        str("sex"),
        str("genderType"),
        str("성별"),
        str("sexType"),
        str("g"),
    ].filter((v) => !!v);
    for (const v of candidates) {
        if (["남", "남자", "male", "m", "boy", "man"].includes(v))
            return "남";
        if (["여", "여자", "female", "f", "girl", "woman"].includes(v))
            return "여";
    }
    const isMale = bool("isMale");
    const isFemale = bool("isFemale");
    if (isMale === true)
        return "남";
    if (isFemale === true)
        return "여";
    return "";
}
function PersonSlot({ label, data, mode, // "원국" | "묘운" | "실시간"
effectiveDate, onPick, }) {
    const cardSettings = useSettingsStore((s) => s.settings);
    const birthLocal = useMemo(() => tryParseBirthLocal(data), [data]);
    const natal = useMemo(() => {
        if (!data)
            return null;
        try {
            return computeNatalPillars(data, data?.mingSikType);
        }
        catch {
            return null;
        }
    }, [data]);
    const natalHour = ensureGZ(natal?.hour);
    const natalDay = ensureGZ(natal?.day);
    const natalMonth = ensureGZ(natal?.month);
    const natalYear = ensureGZ(natal?.year);
    const dayStem = useMemo(() => {
        const ch = natalDay.charAt(0) || "갑";
        return ch;
    }, [natalDay]);
    const birthCorrected = useMemo(() => {
        if (!data)
            return null;
        try {
            return toCorrected(data);
        }
        catch {
            return null;
        }
    }, [data]);
    const lon = useMemo(() => {
        if (!data?.birthPlace || data.birthPlace.name === "모름" || data.birthPlace.lon === 0)
            return 127.5;
        return data.birthPlace.lon;
    }, [data]);
    const ruleForBase = data?.mingSikType ?? "자시";
    const sinsalBaseBranch = useMemo(() => {
        const byDay = birthCorrected ? getDayGanZhi(birthCorrected, ruleForBase).charAt(1) : (natalDay.charAt(1) || "子");
        const byYear = birthCorrected ? getYearGanZhi(birthCorrected, lon).charAt(1) : (natalYear.charAt(1) || "子");
        const pick = cardSettings.sinsalBase === "일지" ? byDay : byYear;
        return pick;
    }, [cardSettings.sinsalBase, birthCorrected, ruleForBase, lon, natalDay, natalYear]);
    const current = useMemo(() => {
        if (mode !== "묘운" || !birthLocal)
            return null;
        try {
            const siju = buildSijuSchedule(birthLocal, natalHour, data?.dir, 120, data?.mingSikType);
            const ilju = buildIljuFromSiju(siju, natalDay, data?.dir, data?.DayChangeRule);
            const wolju = buildWolju(birthLocal, natalMonth, data?.dir, 120, data?.birthPlace?.lon);
            const yeonju = buildYeonjuFromWolju(wolju, natalYear, data?.dir, data?.DayChangeRule, birthLocal);
            const t = effectiveDate;
            return {
                si: ensureGZ(lastAtOrNull(siju.events, t)?.gz, natalHour),
                il: ensureGZ(lastAtOrNull(ilju.events, t)?.gz, natalDay),
                wl: ensureGZ(lastAtOrNull(wolju.events, t)?.gz, natalMonth),
                yn: ensureGZ(lastAtOrNull(yeonju.events, t)?.gz, natalYear),
            };
        }
        catch {
            return null;
        }
    }, [mode, birthLocal, natalHour, natalDay, natalMonth, natalYear, data?.dir, data?.DayChangeRule, data?.mingSikType, data?.birthPlace?.lon, effectiveDate]);
    const live = useMemo(() => {
        if (mode !== "실시간")
            return null;
        const t = effectiveDate;
        return {
            si: ensureGZ(getHourGanZhi(t, "자시")),
            il: ensureGZ(getDayGanZhi(t, "자시")),
            wl: ensureGZ(getMonthGanZhi(t)),
            yn: ensureGZ(getYearGanZhi(t)),
        };
    }, [mode, effectiveDate]);
    const titleName = data ? nameOf(data) : "";
    const titleBirth = birthLocal ? formatDate24(birthLocal) : "";
    const titleGender = data ? genderOf(data) : "";
    if (!data) {
        return (_jsx("div", { className: "flex items-center justify-center h-48 rounded-lg border border-dashed bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700", children: _jsx("button", { onClick: onPick, className: "px-3 py-2 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-sm hover:opacity-90 cursor-pointer", children: "\uBA85\uC2DD \uC120\uD0DD\uD558\uAE30" }) }));
    }
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-start justify-between", children: [_jsxs("div", { className: "text-[11px] text-neutral-600 dark:text-neutral-300 max-w-[calc(100%_-_100px)]", children: [_jsx("span", { className: "font-semibold text-neutral-900 dark:text-neutral-200", children: label }), _jsx("span", { className: "ml-2 text-neutral-900 dark:text-neutral-50", children: titleName }), titleGender && _jsxs("span", { className: "ml-1 text-neutral-500 dark:text-neutral-400", children: ["\u00B7 ", titleGender] }), titleBirth && _jsx("span", { className: "block desk:inline-block mt-1 text-neutral-500 dark:text-neutral-400 text-[10px]", children: titleBirth })] }), _jsx("button", { onClick: onPick, className: "px-3 py-1 rounded text-xs bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 border border-neutral-900 dark:border-white hover:opacity-90 cursor-pointer", title: "\uBA85\uC2DD \uBC14\uAFB8\uAE30", children: "\uBA85\uC2DD \uC120\uD0DD" })] }), mode === "원국" && (_jsx(FourPillarsRow, { label: "\uC6D0\uAD6D", gzHour: natalHour, gzDay: natalDay, gzMonth: natalMonth, gzYear: natalYear, dayStem: dayStem, cardSettings: cardSettings, sinsalBaseBranch: sinsalBaseBranch, sinsalMode: cardSettings.sinsalMode, sinsalBloom: !!cardSettings.sinsalBloom })), mode === "묘운" && current && (_jsx(FourPillarsRow, { label: "\uBB18\uC6B4", gzHour: current.si, gzDay: current.il, gzMonth: current.wl, gzYear: current.yn, dayStem: dayStem, cardSettings: cardSettings, sinsalBaseBranch: sinsalBaseBranch, sinsalMode: cardSettings.sinsalMode, sinsalBloom: !!cardSettings.sinsalBloom })), mode === "실시간" && live && (_jsx(FourPillarsRow, { label: "\uC2E4\uC2DC\uAC04", gzHour: live.si, gzDay: live.il, gzMonth: live.wl, gzYear: live.yn, dayStem: dayStem, cardSettings: cardSettings, sinsalBaseBranch: sinsalBaseBranch, sinsalMode: cardSettings.sinsalMode, sinsalBloom: !!cardSettings.sinsalBloom }))] }));
}
/* =============== 메인 =============== */
export default function CoupleViewer({ people = [], }) {
    const [dataA, setDataA] = useState();
    const [dataB, setDataB] = useState();
    const [showMyoUn, setShowMyoUn] = useState(false);
    const [showLive, setShowLive] = useState(false);
    // picker (공유)
    const nowRef = useRef(new Date());
    const [pick, setPick] = useState(() => toLocalInput(nowRef.current));
    const lastValidRef = useRef(fromLocalInput(pick) ?? nowRef.current);
    const effectiveDate = useMemo(() => {
        const d = fromLocalInput(pick);
        if (d)
            lastValidRef.current = d;
        return lastValidRef.current;
    }, [pick]);
    // 모달
    const [openPickA, setOpenPickA] = useState(false);
    const [openPickB, setOpenPickB] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "w-[96%] max-w-[640px] mx-auto bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 rounded-xl shadow border border-neutral-200 dark:border-neutral-800 px-2 py-4 desk:p-4", children: [_jsxs("header", { className: "flex flex-wrap gap-3 justify-between items-center mb-4", children: [_jsx("div", { className: "font-semibold text-sm text-neutral-900 dark:text-neutral-200", children: "\uAD81\uD569 \uBCF4\uAE30" }), _jsxs("div", { className: "flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400", children: [_jsxs("label", { className: "flex items-center gap-1 cursor-pointer", children: [_jsx("input", { type: "checkbox", checked: showMyoUn, onChange: (e) => setShowMyoUn(e.target.checked), className: "accent-indigo-500" }), "\uBB18\uC6B4 \uD45C\uC2DC"] }), _jsx("button", { onClick: () => setShowLive((v) => !v), className: "px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 hover:border-indigo-500 text-neutral-700 dark:text-neutral-300 bg-white dark:bg-neutral-900 cursor-pointer", children: showLive ? "실시간 간지 접기" : "실시간 간지 펼치기" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-2 desk:gap-4", children: [_jsx(PersonSlot, { label: "\uC6D0\uAD6D A", data: dataA, mode: "\uC6D0\uAD6D", effectiveDate: effectiveDate, onPick: () => setOpenPickA(true) }), _jsx(PersonSlot, { label: "\uC6D0\uAD6D B", data: dataB, mode: "\uC6D0\uAD6D", effectiveDate: effectiveDate, onPick: () => setOpenPickB(true) }), showMyoUn && dataA && (_jsx(PersonSlot, { label: "\uBB18\uC6B4 A", data: dataA, mode: "\uBB18\uC6B4", effectiveDate: effectiveDate, onPick: () => setOpenPickA(true) })), showMyoUn && dataB && (_jsx(PersonSlot, { label: "\uBB18\uC6B4 B", data: dataB, mode: "\uBB18\uC6B4", effectiveDate: effectiveDate, onPick: () => setOpenPickB(true) })), showLive && dataA && (_jsx(PersonSlot, { label: "\uC2E4\uC2DC\uAC04 A", data: dataA, mode: "\uC2E4\uC2DC\uAC04", effectiveDate: effectiveDate, onPick: () => setOpenPickA(true) })), showLive && dataB && (_jsx(PersonSlot, { label: "\uC2E4\uC2DC\uAC04 B", data: dataB, mode: "\uC2E4\uC2DC\uAC04", effectiveDate: effectiveDate, onPick: () => setOpenPickB(true) }))] }), _jsxs("div", { className: "mt-4", children: [_jsx("label", { className: "block text-xs text-neutral-600 dark:text-neutral-400 mb-2", children: "\uB0A0\uC9DC/\uC2DC\uAC04 \uC120\uD0DD" }), _jsx("input", { type: "datetime-local", value: pick, onChange: (e) => setPick(e.target.value), className: "bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded px-3 py-1 text-xs w-full text-neutral-900 dark:text-neutral-100 h-30", min: "1900-01-01T00:00", max: "2100-12-31T23:59" })] })] }), _jsx(PeoplePickerModal, { open: openPickA, list: people || [], onSelect: (m) => setDataA(m), onClose: () => setOpenPickA(false) }), _jsx(PeoplePickerModal, { open: openPickB, list: people || [], onSelect: (m) => setDataB(m), onClose: () => setOpenPickB(false) })] }));
}
