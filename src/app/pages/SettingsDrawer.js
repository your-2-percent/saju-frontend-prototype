import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// components/SettingsDrawer.tsx
import { X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import Toast from "@/shared/ui/feedback/Toast";
import { useSettingsStore, } from "@/shared/lib/hooks/useSettingsStore";
import { useApplyTheme } from "@/shared/lib/hooks/useTheme";
import { setStoredTheme } from "@/shared/lib/theme";
// ─────────────────────────────────────────────────────────────
// 로컬스토리지 키
const LS_KEY = "harim.settings.v1";
// 섹션 ID 고정 목록(렌더 키)
const DEFAULT_SECTION_KEYS = [
    "theme", // ✅ 테마 토글(신규)
    "hiddenStem", // 지장간 표시 타입
    "hiddenStemMode", // 지장간 유형
    "ilunRule", // 일운 달력 시간타입
    "sinsalMode", // 십이신살타입
    "sinsalBase", // 십이신살기준
    "sinsalBloom", // 개화론 적용여부
    "exposure", // 상단 노출
    "charType", // 글자 타입
    "thinEum", // 음간 얇게
    "visibility", // 표시 항목(묶음)
];
// 유효 키 가드
function isSectionKey(v) {
    return typeof v === "string" && DEFAULT_SECTION_KEYS.includes(v);
}
// 저장된 섹션 순서 정규화: 유효 키만 살리고 누락은 뒤에 보충
function normalizeOrder(saved) {
    const base = Array.isArray(saved) ? saved.filter(isSectionKey) : [];
    const missing = DEFAULT_SECTION_KEYS.filter(k => !base.includes(k));
    return [...base, ...missing];
}
function readLS() {
    if (typeof window === "undefined")
        return null;
    try {
        const raw = localStorage.getItem(LS_KEY);
        if (!raw)
            return null;
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function writeLS(payload) {
    if (typeof window === "undefined")
        return;
    try {
        const prev = readLS() ?? {};
        const next = { ...prev, ...payload };
        localStorage.setItem(LS_KEY, JSON.stringify(next));
    }
    catch {
        /* noop */
    }
}
// ─────────────────────────────────────────────────────────────
export default function SettingsDrawer({ open, onClose }) {
    const { settings, setSettings } = useSettingsStore();
    // 섹션 순서 (기본은 스토어, 열 때 LS 있으면 덮어씀)
    const initialOrder = useMemo(() => normalizeOrder(settings.sectionOrder), [settings.sectionOrder]);
    const [order, setOrder] = useState(initialOrder);
    const [localSettings, setLocalSettings] = useState(settings);
    const [toastMessage, setToastMessage] = useState(null);
    // 테마 클래스 적용(실시간)
    useApplyTheme(localSettings.theme ?? "dark");
    // 드로어 열 때 LS값 우선 로드(있으면 스토어보다 최신으로 간주)
    useEffect(() => {
        if (!open)
            return;
        const ls = readLS();
        if (ls) {
            const merged = { ...settings, ...ls };
            setLocalSettings(merged);
            setOrder(normalizeOrder(ls.sectionOrder ?? merged.sectionOrder));
        }
        else {
            setLocalSettings(settings);
            setOrder([...initialOrder]);
        }
    }, [open, settings, initialOrder]);
    const update = (key, value) => {
        setLocalSettings((prev) => {
            const next = { ...prev, [key]: value };
            // 기존 writeLS(next) 호출이 있다면 유지
            // 테마면 전용 키에도 즉시 저장
            if (key === "theme")
                setStoredTheme(value);
            return next;
        });
    };
    const applyChanges = () => {
        setSettings({ ...localSettings, sectionOrder: order });
        if (localSettings.theme)
            setStoredTheme(localSettings.theme);
        // 기존 writeLS({...}) 유지
        setToastMessage("설정이 적용되었습니다");
        onClose();
    };
    /* ── Drag & Drop ──────────────────────────────────────────── */
    const dragIdRef = useRef(null);
    // 스택 전체 드래그 시작(인터랙티브 요소면 무시)
    const onDragStartContainer = (e, id) => {
        const t = e.target;
        if (t.closest("[data-no-drag]") ||
            ["BUTTON", "INPUT", "SELECT", "TEXTAREA", "A", "LABEL"].includes(t.tagName)) {
            e.preventDefault();
            return;
        }
        dragIdRef.current = id;
        e.dataTransfer.setData("text/plain", id);
        e.dataTransfer.effectAllowed = "move";
    };
    const onDragStartHandle = (e, id) => onDragStartContainer(e, id);
    const onDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };
    const onDrop = (_e, targetId) => {
        const src = dragIdRef.current;
        dragIdRef.current = null;
        if (!src || src === targetId)
            return;
        setOrder((prev) => {
            const arr = prev.slice();
            const from = arr.indexOf(src);
            const to = arr.indexOf(targetId);
            if (from === -1 || to === -1)
                return prev;
            arr.splice(to, 0, ...arr.splice(from, 1));
            const nextOrder = arr;
            // ✅ 드랍 순간 즉시 LS 저장(자동 저장)
            writeLS({ ...localSettings, sectionOrder: nextOrder });
            return nextOrder;
        });
    };
    /* ── 섹션 렌더러 ──────────────────────────────────────────── */
    const renderSection = (key) => {
        switch (key) {
            case "theme":
                return (_jsx(Section, { title: "\uD14C\uB9C8", children: _jsx(ThemeSwitch, { value: localSettings.theme ?? "dark", onChange: (v) => update("theme", v) }) }));
            case "hiddenStem":
                return (_jsx(Section, { title: "\uC9C0\uC7A5\uAC04 \uD45C\uC2DC \uD0C0\uC785", children: _jsx(SegmentedControl, { value: localSettings.hiddenStem, onChange: (v) => update("hiddenStem", v), options: [
                            { label: "전체보기", value: "all" },
                            { label: "정기만 보기", value: "regular" },
                        ] }) }));
            case "hiddenStemMode":
                return (_jsx(Section, { title: "\uC9C0\uC7A5\uAC04 \uC720\uD615", children: _jsx(SegmentedControl, { value: localSettings.hiddenStemMode, onChange: (v) => update("hiddenStemMode", v), options: [
                            { label: "고전", value: "classic" },
                            { label: "하건충", value: "hgc" },
                        ] }) }));
            case "ilunRule":
                return (_jsx(Section, { title: "\uC77C\uC6B4 \uB2EC\uB825 \uC2DC\uAC04\uD0C0\uC785", children: _jsx(SegmentedControl, { value: localSettings.ilunRule, onChange: (v) => update("ilunRule", v), options: [
                            { label: "자시", value: "자시" },
                            { label: "야자시", value: "야자시" },
                            { label: "인시", value: "인시" },
                        ] }) }));
            case "sinsalMode":
                return (_jsx(Section, { title: "\uC2ED\uC774\uC2E0\uC0B4\uD0C0\uC785", children: _jsx(SegmentedControl, { value: localSettings.sinsalMode, onChange: (v) => update("sinsalMode", v), options: [
                            { label: "고전", value: "classic" },
                            { label: "현대", value: "modern" },
                        ] }) }));
            case "sinsalBase":
                return (_jsx(Section, { title: "\uC2ED\uC774\uC2E0\uC0B4\uAE30\uC900", children: _jsx(SegmentedControl, { value: localSettings.sinsalBase, onChange: (v) => update("sinsalBase", v), options: [
                            { label: "일지", value: "일지" },
                            { label: "연지", value: "연지" },
                        ] }) }));
            case "sinsalBloom":
                return (_jsx(Section, { title: "\uAC1C\uD654\uB860 \uC801\uC6A9\uC5EC\uBD80", children: _jsx(Switch, { label: "\uAC1C\uD654\uB860 \uC801\uC6A9", checked: localSettings.sinsalBloom, onChange: (v) => update("sinsalBloom", v) }) }));
            case "exposure":
                return (_jsx(Section, { title: "\uC0C1\uB2E8 \uB178\uCD9C", children: _jsx(SegmentedControl, { value: localSettings.exposure, onChange: (v) => update("exposure", v), options: [
                            { label: "원국", value: "원국" },
                            { label: "대운", value: "대운" },
                            { label: "세운", value: "세운" },
                            { label: "월운", value: "월운" },
                        ] }) }));
            case "charType":
                return (_jsx(Section, { title: "\uAE00\uC790 \uD0C0\uC785", children: _jsx(SegmentedControl, { value: localSettings.charType, onChange: (v) => update("charType", v), options: [
                            { label: "한자", value: "한자" },
                            { label: "한글", value: "한글" },
                        ] }) }));
            case "thinEum":
                return (_jsx(Section, { title: "\uC74C\uAC04 \uC587\uAC8C", children: _jsx(Switch, { label: "\uC74C\uAC04 \uC587\uAC8C", checked: localSettings.thinEum, onChange: (v) => update("thinEum", v) }) }));
            case "visibility":
                return (_jsx(Section, { title: "\uD45C\uC2DC \uD56D\uBAA9", children: _jsxs("div", { className: "space-y-2 w-full max-w-[140px] mx-auto", children: [_jsx(Switch, { label: "\uC2ED\uC2E0 \uD45C\uC2DC", checked: localSettings.showSipSin, onChange: (v) => update("showSipSin", v) }), _jsx(Switch, { label: "\uC6B4\uC131 \uD45C\uC2DC", checked: localSettings.showSibiUnseong, onChange: (v) => update("showSibiUnseong", v) }), _jsx(Switch, { label: "\uC2E0\uC0B4 \uD45C\uC2DC", checked: localSettings.showSibiSinsal, onChange: (v) => update("showSibiSinsal", v) })] }) }));
            default:
                return null;
        }
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: `fixed inset-0 bg-black/60 transition-opacity duration-300 z-90 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`, onClick: onClose }), _jsxs("div", { className: `fixed bottom-0 left-1/2 translate-x-[-50%] w-full max-w-[640px] h-[88dvh] bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white shadow-lg rounded-t-2xl transform transition-transform duration-300 z-99 ${open ? "translate-y-0" : "translate-y-full"}`, children: [_jsxs("div", { className: "flex justify-between items-center p-4 border-b border-neutral-200 dark:border-neutral-800", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h2", { className: "text-lg font-bold", children: "\uC124\uC815" }), _jsx("button", { onClick: applyChanges, className: "px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-sm cursor-pointer", children: "\uC801\uC6A9\uD558\uAE30" })] }), _jsx("button", { onClick: onClose, className: "p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer", children: _jsx(X, { size: 22 }) })] }), _jsx("div", { className: "p-4 overflow-y-auto h-[calc(100%-56px)] space-y-3", children: order.map((id) => (_jsxs("div", { draggable: true, onDragStart: (e) => onDragStartContainer(e, id), onDragOver: onDragOver, onDrop: (e) => onDrop(e, id), className: "relative group cursor-grab active:cursor-grabbing", children: [_jsx("div", { "data-drag-handle": true, draggable: true, onDragStart: (e) => onDragStartHandle(e, id), className: "absolute left-[14px] top-1/2 -translate-y-1/2 select-none text-neutral-400 group-hover:text-neutral-200 dark:group-hover:text-white cursor-grab active:cursor-grabbing", title: "\uB4DC\uB798\uADF8\uD558\uC5EC \uC21C\uC11C \uBCC0\uACBD", 
                                    //aria-grabbed={dragIdRef.current === id}
                                    role: "button", children: "\u2630" }), renderSection(id)] }, id))) })] }), toastMessage && (_jsx(Toast, { message: toastMessage, onClose: () => setToastMessage(null), ms: 1800 }))] }));
}
/* ===== Sub Components ===== */
function ThemeSwitch({ value, onChange, }) {
    const isDark = value === "dark";
    return (_jsxs("button", { "data-no-drag": true, onClick: () => onChange(isDark ? "light" : "dark"), className: "flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm cursor-pointer border-neutral-300 bg-white hover:bg-neutral-100 text-neutral-700 dark:border-neutral-700 dark:bg-neutral-900 dark:hover:bg-neutral-800 dark:text-neutral-200", title: "\uB2E4\uD06C/\uB77C\uC774\uD2B8 \uC804\uD658", "aria-pressed": isDark, children: [_jsx("span", { className: "inline-block w-10 h-5 bg-neutral-300 rounded-full relative after:content-[''] after:w-4 after:h-4 after:bg-white after:rounded-full after:absolute after:top-0.5 after:left-0.5 after:transition-all dark:bg-neutral-700" }), _jsx("span", { children: isDark ? "다크" : "라이트" })] }));
}
function Section({ title, children }) {
    return (_jsxs("div", { className: "p-3 rounded-lg bg-neutral-50 border border-neutral-200 text-neutral-900 dark:bg-neutral-900 dark:border-neutral-800 dark:text-neutral-100 space-y-3", children: [_jsx("h3", { className: "text-sm font-semibold text-center", children: title }), _jsx("div", { className: "flex justify-center", children: children })] }));
}
function SegmentedControl({ value, onChange, options, }) {
    return (_jsx("div", { "data-no-drag": true, className: "inline-flex rounded-md overflow-hidden border border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-800", children: options.map((opt) => {
            const active = value === opt.value;
            return (_jsx("button", { onClick: () => onChange(opt.value), className: `px-3 py-1 text-sm transition-colors ${active
                    ? "bg-indigo-600 text-white"
                    : "text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700 cursor-pointer"}`, children: opt.label }, opt.value));
        }) }));
}
function Switch({ label, checked, onChange, }) {
    const id = `switch-${label}`;
    return (_jsxs("label", { "data-no-drag": true, htmlFor: id, className: "flex items-center justify-between w-full max-w-[160px] text-sm cursor-pointer", children: [_jsx("span", { children: label }), _jsx("input", { id: id, type: "checkbox", checked: checked, onChange: (e) => onChange(e.target.checked), className: "peer hidden" }), _jsx("span", { className: "w-10 h-5 bg-neutral-300 rounded-full relative after:content-[''] after:w-4 after:h-4 after:bg-white after:rounded-full after:absolute after:top-0.5 after:left-0.5 after:transition-all peer-checked:bg-green-600 peer-checked:after:translate-x-5 dark:bg-neutral-700" })] }));
}
