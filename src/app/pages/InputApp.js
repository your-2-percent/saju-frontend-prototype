import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useMemo } from "react";
import { v4 as uuidv4 } from "uuid";
import { getYearGanZhi, getMonthGanZhi, getDayGanZhi, getHourGanZhi } from "@/shared/domain/간지/공통";
import BirthPlacePickerBridge from "@/features/place-picker/BirthPlacePicker";
import { RelationshipSelector } from "@/features/relationship/RelationshipSelector";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { getCorrectedDate, isDST } from "@/shared/lib/core/timeCorrection";
import FolderField from "@/features/sidebar/ui/FolderField";
import Toast from "@/shared/ui/feedback/Toast";
import { UNASSIGNED_LABEL, normalizeFolderValue } from "@/features/sidebar/model/folderModel";
import * as solarlunar from "solarlunar";
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
    const y = v["cYear"];
    const m = v["cMonth"];
    const d = v["cDay"];
    const leap = v["isLeap"];
    if (typeof y !== "number" || typeof m !== "number" || typeof d !== "number") {
        throw new Error("Invalid lunar2solar fields");
    }
    return {
        cYear: y,
        cMonth: m,
        cDay: d,
        isLeap: typeof leap === "boolean" ? leap : undefined,
    };
}
function pickSolarLunar(mod) {
    const base = hasDefault(mod) ? mod.default : mod;
    if (!hasLunar2Solar(base))
        throw new Error("solarlunar.lunar2solar not found");
    const lunar2solar = (y, m, d, isLeap) => {
        const res = base
            .lunar2solar(y, m, d, isLeap);
        return assertL2S(res);
    };
    return { lunar2solar };
}
const SL = pickSolarLunar(solarlunar);
function lunarToSolarStrict(y, m, d) {
    const out = SL.lunar2solar(y, m, d, false); // 윤달 미사용 고정
    return { y: out.cYear, m: out.cMonth, d: out.cDay };
}
/* ===== 폼 정의 & 키보드 네비 헬퍼 ===== */
const steps = [
    { key: "name", label: "이름", placeholder: "이름을 입력하세요", type: "text" },
    { key: "birthDay", label: "생년월일", placeholder: "예: 19900101", type: "tel" },
    { key: "birthTime", label: "태어난 시간", placeholder: "예: 1524", type: "tel" },
    { key: "mingSikType", label: "명식 기준", type: "mingrule" },
    { key: "gender", label: "성별", type: "radio" },
    { key: "birthPlace", label: "태어난 지역", type: "place" },
    { key: "relationship", label: "관계", type: "relationship" },
    { key: "folder", label: "폴더 선택", type: "folder" },
    { key: "memo", label: "메모", placeholder: "메모를 입력하세요", type: "textarea" },
];
const CALENDAR_OPTIONS = [
    { value: "solar", label: "양력", id: "calendarType_solar" },
    { value: "lunar", label: "음력", id: "calendarType_lunar" },
];
const MING_OPTIONS = ["자시", "야자시", "인시"];
const GENDER_OPTIONS = ["남자", "여자"];
function nextIndex(cur, len, key) {
    if (key === "ArrowRight" || key === "ArrowDown")
        return (cur + 1) % len;
    if (key === "ArrowLeft" || key === "ArrowUp")
        return (cur - 1 + len) % len;
    if (key === "Home")
        return 0;
    if (key === "End")
        return len - 1;
    return cur;
}
function focusById(id) {
    const el = document.getElementById(id);
    if (el instanceof HTMLElement)
        el.focus();
}
/* ===== 컴포넌트 ===== */
export default function InputWizard({ onSave }) {
    const { add } = useMyeongSikStore();
    const [stepIndex, setStepIndex] = useState(0);
    const [form, setForm] = useState({
        gender: "남자",
        mingSikType: "자시",
        DayChangeRule: "자시일수론",
        calendarType: "solar",
    });
    const [toast, setToast] = useState(null);
    const [unknownTime, setUnknownTime] = useState(false);
    const [unknownPlace, setUnknownPlace] = useState(false);
    const currentStep = steps[stepIndex];
    const showToast = (msg) => setToast(msg);
    /* 스텝 이동 시, 올바른 타깃에 포커스 이동 */
    useEffect(() => {
        // 1) Text/textarea
        if (["name", "birthDay", "birthTime", "memo"].includes(currentStep.key)) {
            const firstInput = document.querySelector(".current-step input[type='text']:not([disabled]), .current-step textarea:not([disabled])");
            if (firstInput) {
                firstInput.focus();
                return;
            }
        }
        // 2) 라디오 스텝
        if (currentStep.key === "mingSikType") {
            const sel = document.querySelector("[id^='ming_'][id$='_lbl'][aria-checked='true']");
            if (sel) {
                sel.focus();
                return;
            }
        }
        if (currentStep.key === "gender") {
            const sel = document.querySelector("[id^='gender_'][id$='_lbl'][aria-checked='true']");
            if (sel) {
                sel.focus();
                return;
            }
        }
        // 3) 출생지
        if (form.birthPlace || unknownPlace) {
            const focusConfirm = () => {
                const btn = document.querySelector(".current-step form button[type='submit']");
                if (btn)
                    btn.focus();
            };
            focusConfirm();
            setTimeout(focusConfirm, 0);
        }
        else {
            const btn = document.getElementById("inputBirthPlaceBtn");
            if (btn)
                btn.focus();
        }
        // 4) 관계
        if (currentStep.key === "relationship") {
            setTimeout(() => {
                const sel = document.querySelector(".current-step select");
                if (sel)
                    sel.focus();
            }, 0);
            return;
        }
        // 5) 폴더
        if (currentStep.key === "folder") {
            setTimeout(() => {
                const sel = document.querySelector(".current-step select");
                if (sel)
                    sel.focus();
            }, 0);
            return;
        }
        // 6) fallback
        const fallback = document.querySelector(".current-step button, .current-step [tabindex='0']");
        fallback?.focus();
    }, [unknownPlace, stepIndex, currentStep.key, form.birthPlace]);
    // 음력 → 양력 미리보기
    const lunarPreview = useMemo(() => {
        if (form.calendarType !== "lunar")
            return null;
        if (!form.birthDay || form.birthDay.length !== 8)
            return null;
        try {
            const y = Number(form.birthDay.slice(0, 4));
            const m = Number(form.birthDay.slice(4, 6));
            const d = Number(form.birthDay.slice(6, 8));
            const out = lunarToSolarStrict(y, m, d);
            return `→ 양력 ${out.y}-${String(out.m).padStart(2, "0")}-${String(out.d).padStart(2, "0")}`;
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : undefined;
            return `→ 변환 실패${msg ? `: ${msg}` : ""}`;
        }
    }, [form.calendarType, form.birthDay]);
    const validateStep = () => {
        const step = steps[stepIndex];
        if (step.key === "name") {
            if (!form.name) {
                setForm({ ...form, name: "이름없음" });
                showToast("이름을 적지 않으시면 '이름없음'으로 대체됩니다.");
            }
        }
        if (step.key === "birthDay") {
            const regex = /^\d{8}$/;
            if (!form.birthDay || !regex.test(form.birthDay)) {
                showToast("생년월일은 YYYYMMDD 형식으로 입력해주세요.");
                return false;
            }
            const y = Number(form.birthDay.substring(0, 4));
            const m = Number(form.birthDay.substring(4, 6));
            const d = Number(form.birthDay.substring(6, 8));
            if (y < 1900 || y > 2100) {
                showToast("출생 연도는 1900~2100년 사이여야 합니다.");
                return false;
            }
            if (m < 1 || m > 12) {
                showToast("출생 월은 01~12 사이여야 합니다.");
                return false;
            }
            if (d < 1 || d > 31) {
                showToast("출생 일은 01~31 사이여야 합니다.");
                return false;
            }
            if (form.calendarType === "solar") {
                const date = new Date(y, m - 1, d);
                if (date.getFullYear() !== y || date.getMonth() + 1 !== m || date.getDate() !== d) {
                    showToast("존재하지 않는 날짜입니다.");
                    return false;
                }
            }
            else {
                try {
                    lunarToSolarStrict(y, m, d);
                }
                catch (e) {
                    showToast(e instanceof Error ? e.message : "음력 날짜가 유효하지 않습니다.");
                    return false;
                }
            }
        }
        if (step.key === "birthTime") {
            if (!form.birthTime && !unknownTime) {
                showToast("태어난 시간을 입력하거나 '모름'을 체크해야 합니다.");
                return false;
            }
            if (form.birthTime) {
                const t = Number(form.birthTime);
                if (Number.isNaN(t) || t < 0 || t > 2359) {
                    showToast("태어난 시간은 0000–2359 범위여야 합니다.");
                    return false;
                }
                const hh = Number(form.birthTime.slice(0, 2));
                const mm = Number(form.birthTime.slice(2, 4));
                if (hh > 23 || mm > 59) {
                    showToast("태어난 시간은 0000–2359 범위여야 합니다.");
                    return false;
                }
            }
        }
        if (step.key === "birthPlace") {
            if (!form.birthPlace && !unknownPlace) {
                showToast("태어난 지역을 선택하거나 '모름'을 체크해야 합니다.");
                return false;
            }
        }
        return true;
    };
    const handleNext = () => {
        if (!validateStep())
            return;
        if (stepIndex < steps.length - 1) {
            setStepIndex(stepIndex + 1);
            return;
        }
        // ===== 저장 단계 =====
        const folderVal = normalizeFolderValue(form.folder);
        const isUnknownTime = !form.birthTime || form.birthTime === "모름";
        let y = Number(form.birthDay.slice(0, 4));
        let mo = Number(form.birthDay.slice(4, 6));
        let d = Number(form.birthDay.slice(6, 8));
        if (form.calendarType === "lunar") {
            const solar = lunarToSolarStrict(y, mo, d);
            y = solar.y;
            mo = solar.m;
            d = solar.d;
        }
        const hh = isUnknownTime ? 0 : Number(form.birthTime.slice(0, 2) || "0");
        const mi = isUnknownTime ? 0 : Number(form.birthTime.slice(2, 4) || "0");
        const rawBirth = new Date(y, mo - 1, d, hh, mi, 0, 0);
        const lon = unknownPlace || !form.birthPlace || form.birthPlace.lon === 0
            ? 127.5
            : form.birthPlace.lon;
        const corr = getCorrectedDate(rawBirth, lon);
        const hourRule = (form.mingSikType ?? "자시");
        const correctedLocal = !isUnknownTime
            ? corr.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
            : "";
        const yGZ = getYearGanZhi(corr, lon);
        const mGZ = getMonthGanZhi(corr, lon);
        const dGZ = getDayGanZhi(corr, hourRule);
        const hGZ = isUnknownTime ? null : getHourGanZhi(corr, hourRule);
        const ganjiText = [`원국 : ${yGZ}년 ${mGZ}월 ${dGZ}일`, hGZ ? `${hGZ}시` : null]
            .filter(Boolean)
            .join(" ");
        function calcDaewoonDir(yearStem, gender) {
            const yangStems = ["甲", "丙", "戊", "庚", "壬", "갑", "병", "무", "경", "임"];
            const isYang = yangStems.includes(yearStem);
            const isMale = gender === "남자";
            if (isYang) {
                return isMale ? "forward" : "backward";
            }
            else {
                return isMale ? "backward" : "forward";
            }
        }
        const yearStem = yGZ.charAt(0); // 출생 연간
        const dir = calcDaewoonDir(yearStem, form.gender);
        const payload = {
            id: uuidv4(),
            name: form.name?.trim() || "이름없음",
            birthDay: form.birthDay || "",
            birthTime: isUnknownTime ? "모름" : form.birthTime || "",
            gender: form.gender ?? "남자",
            birthPlace: unknownPlace
                ? { name: "모름", lat: 0, lon: 127.5 }
                : form.birthPlace ?? { name: "", lat: 0, lon: 127.5 },
            relationship: form.relationship ?? "",
            memo: form.memo ?? "",
            mingSikType: form.mingSikType ?? "자시",
            DayChangeRule: form.mingSikType === "인시" ? "인시일수론" : "자시일수론",
            folder: folderVal,
            correctedLocal,
            ganji: ganjiText,
            calendarType: form.calendarType ?? "solar",
            dir,
            corrected: corr
        };
        add(payload);
        onSave(payload);
        setToast("저장 완료!");
        setForm({ gender: "남자", mingSikType: "자시", calendarType: "solar" });
        setUnknownTime(false);
        setUnknownPlace(false);
        setStepIndex(0);
    };
    /* ★ 폼 차원의 Enter 처리: 라벨(role=radio/checkbox)은 자체 핸들러에 맡김 */
    const handleFormKeyDown = (e) => {
        if (e.key !== "Enter")
            return;
        const target = e.target;
        const role = target.getAttribute("role");
        if (role === "radio" || role === "checkbox")
            return;
        const modal = document.getElementById("mapModal");
        if (modal && modal.contains(target))
            return;
        const tag = target.tagName.toLowerCase();
        const type = target instanceof HTMLInputElement ? target.type : "";
        if (tag === "textarea") {
            if (e.shiftKey)
                return;
            e.preventDefault();
            handleNext();
            return;
        }
        if (type === "radio" || type === "checkbox") {
            e.preventDefault();
            if (target instanceof HTMLInputElement)
                target.click();
            return;
        }
        if (tag === "button" && target.type !== "submit") {
            return;
        }
        e.preventDefault();
        handleNext();
    };
    const displayValue = (key) => {
        switch (key) {
            case "birthPlace":
                return unknownPlace ? "모름" : form.birthPlace?.name || "";
            case "birthTime":
                return unknownTime ? "모름" : form.birthTime || "";
            case "folder":
                return form.folder ? String(form.folder) : UNASSIGNED_LABEL;
            default: {
                const rec = form;
                const v = rec[key];
                return typeof v === "string" ? v : v != null ? String(v) : "";
            }
        }
    };
    return (_jsxs("div", { className: "mx-auto mt-10 space-y-2 max-w-[640px] w-[96%] text-neutral-900 dark:text-neutral-100", children: [toast && _jsx(Toast, { message: toast, onClose: () => setToast(null) }), steps.slice(0, stepIndex).map((s, idx) => (_jsxs("button", { onClick: () => setStepIndex(idx), className: "p-3 rounded-lg bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex justify-between w-full text-left hover:bg-neutral-200 dark:hover:bg-neutral-800/80 transition-colors", children: [_jsx("span", { className: "font-semibold", children: s.label }), _jsx("span", { className: "text-neutral-600 dark:text-neutral-300", children: displayValue(s.key) })] }, s.key))), _jsx("div", { className: "p-4 border rounded-lg shadow current-step bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800", children: _jsxs("form", { onSubmit: (e) => {
                        e.preventDefault();
                        handleNext();
                    }, onKeyDown: handleFormKeyDown, children: [_jsx("label", { className: "block mb-2 font-bold", children: currentStep.label }), currentStep.key === "name" && (_jsx("input", { type: "text", className: "w-full border rounded-lg p-2 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100", placeholder: currentStep.placeholder, value: form.name || "", onChange: (e) => setForm({ ...form, name: e.target.value }) })), currentStep.key === "birthDay" && (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex gap-1 items-center", children: [_jsx("input", { type: "text", className: "flex-1 border rounded-lg p-2 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100", placeholder: currentStep.placeholder, value: form.birthDay || "", onChange: (e) => {
                                                const onlyNums = e.target.value.replace(/\D/g, "");
                                                setForm({ ...form, birthDay: onlyNums.slice(0, 8) });
                                            }, inputMode: "numeric", pattern: "\\d*", maxLength: 8 }), _jsx("fieldset", { role: "radiogroup", "aria-label": "\uB2EC\uB825 \uC720\uD615", className: "flex gap-1 text-sm", children: CALENDAR_OPTIONS.map(({ value, label, id }) => {
                                                const selected = form.calendarType === value;
                                                return (_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx("input", { id: id, name: "calendarType", type: "radio", style: { display: "none" } }), _jsx("label", { htmlFor: id, id: `${id}_lbl`, role: "radio", "aria-checked": selected, tabIndex: 0, className: "cursor-pointer select-none px-2 py-1 rounded-md border\n                                     border-neutral-300 dark:border-neutral-700\n                                     bg-white dark:bg-neutral-900\n                                     focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500\n                                     data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50\n                                     dark:data-[checked=true]:bg-amber-500/10", "data-checked": selected ? "true" : "false", onKeyDown: (e) => {
                                                                e.stopPropagation();
                                                                if (e.key === " " || e.key === "Enter") {
                                                                    e.preventDefault();
                                                                    setForm({ ...form, calendarType: value });
                                                                    return;
                                                                }
                                                                const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];
                                                                if (!keys.includes(e.key))
                                                                    return;
                                                                e.preventDefault();
                                                                const idx = CALENDAR_OPTIONS.findIndex(o => o.value === form.calendarType);
                                                                const ni = nextIndex(idx < 0 ? 0 : idx, CALENDAR_OPTIONS.length, e.key);
                                                                const nv = CALENDAR_OPTIONS[ni].value;
                                                                setForm({ ...form, calendarType: nv });
                                                                focusById(`${CALENDAR_OPTIONS[ni].id}_lbl`);
                                                            }, onClick: (e) => {
                                                                e.preventDefault();
                                                                setForm({ ...form, calendarType: value });
                                                            }, children: label })] }, value));
                                            }) })] }), form.calendarType === "lunar" && (_jsx("div", { className: "flex items-center justify-end", children: _jsx("span", { className: "text-xs text-neutral-600 dark:text-neutral-300", children: lunarPreview }) })), form.birthDay && form.birthDay.length === 8 && (() => {
                                    const y = Number(form.birthDay.slice(0, 4));
                                    const m = Number(form.birthDay.slice(4, 6));
                                    const d = Number(form.birthDay.slice(6, 8));
                                    if (isDST(y, m, d)) {
                                        return _jsx("div", { className: "text-xs text-red-600 dark:text-red-400 mt-1", children: "\uC378\uBA38\uD0C0\uC784 \uBA85\uC2DD\uC785\uB2C8\uB2E4." });
                                    }
                                    return null;
                                })()] })), currentStep.key === "birthTime" && (_jsxs("div", { className: "space-y-2", children: [_jsx("input", { type: "text", className: "w-full border rounded-lg p-2 disabled:opacity-50 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100", placeholder: currentStep.placeholder, value: unknownTime ? "" : form.birthTime || "", onChange: (e) => {
                                        const onlyNums = e.target.value.replace(/\D/g, "");
                                        setForm({ ...form, birthTime: onlyNums.slice(0, 4) });
                                    }, inputMode: "numeric", pattern: "\\d*", maxLength: 4, disabled: unknownTime }), _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx("input", { id: "birthTimeX", type: "checkbox", style: { display: "none" } }), _jsx("label", { htmlFor: "birthTimeX", role: "checkbox", "aria-checked": unknownTime, tabIndex: 0, className: "text-sm select-none cursor-pointer px-2 py-1 rounded-md border\n                             border-neutral-300 dark:border-neutral-700\n                             bg-white dark:bg-neutral-900\n                             focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500\n                             data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50\n                             dark:data-[checked=true]:bg-amber-500/10", "data-checked": unknownTime ? "true" : "false", onKeyDown: (e) => {
                                                e.stopPropagation();
                                                if (e.key === " " || e.key === "Enter") {
                                                    e.preventDefault();
                                                    setUnknownTime(!unknownTime);
                                                }
                                            }, onClick: (e) => {
                                                e.preventDefault();
                                                setUnknownTime(!unknownTime);
                                            }, children: "\uBAA8\uB984" })] })] })), currentStep.key === "mingSikType" && (_jsx("fieldset", { role: "radiogroup", "aria-label": "\uBA85\uC2DD \uAE30\uC900", className: "flex flex-wrap gap-3", children: MING_OPTIONS.map((v) => {
                                const id = `ming_${v}`;
                                const selected = (form.mingSikType ?? "자시") === v;
                                return (_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx("input", { id: id, name: "mingSikType", type: "radio", style: { display: "none" } }), _jsxs("label", { htmlFor: id, id: `${id}_lbl`, role: "radio", "aria-checked": selected, tabIndex: 0, className: "cursor-pointer select-none px-2 py-1 rounded-md border\n                                 border-neutral-300 dark:border-neutral-700\n                                 bg-white dark:bg-neutral-900\n                                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500\n                                 data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50\n                                 dark:data-[checked=true]:bg-amber-500/10", "data-checked": selected ? "true" : "false", onKeyDown: (e) => {
                                                e.stopPropagation();
                                                if (e.key === " " || e.key === "Enter") {
                                                    e.preventDefault();
                                                    setForm({ ...form, mingSikType: v });
                                                    return;
                                                }
                                                const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];
                                                if (!keys.includes(e.key))
                                                    return;
                                                e.preventDefault();
                                                const cur = (form.mingSikType ?? "자시");
                                                const idx = MING_OPTIONS.indexOf(cur);
                                                const ni = nextIndex(idx, MING_OPTIONS.length, e.key);
                                                const nv = MING_OPTIONS[ni];
                                                setForm({ ...form, mingSikType: nv });
                                                focusById(`ming_${nv}_lbl`);
                                            }, onClick: (e) => {
                                                e.preventDefault();
                                                setForm({ ...form, mingSikType: v });
                                            }, children: [v, "\uBA85\uC2DD"] })] }, v));
                            }) })), currentStep.key === "gender" && (_jsx("fieldset", { role: "radiogroup", "aria-label": "\uC131\uBCC4", className: "flex gap-2", children: GENDER_OPTIONS.map((g) => {
                                const id = `gender_${g}`;
                                const selected = (form.gender ?? "남자") === g;
                                return (_jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx("input", { id: id, name: "gender", type: "radio", style: { display: "none" } }), _jsx("label", { htmlFor: id, id: `${id}_lbl`, role: "radio", "aria-checked": selected, tabIndex: 0, className: "cursor-pointer select-none px-2 py-1 rounded-md border\n                                 border-neutral-300 dark:border-neutral-700\n                                 bg-white dark:bg-neutral-900\n                                 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500\n                                 data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50\n                                 dark:data-[checked=true]:bg-amber-500/10", "data-checked": selected ? "true" : "false", onKeyDown: (e) => {
                                                e.stopPropagation();
                                                if (e.key === " " || e.key === "Enter") {
                                                    e.preventDefault();
                                                    setForm({ ...form, gender: g });
                                                    return;
                                                }
                                                const keys = ["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "Home", "End"];
                                                if (!keys.includes(e.key))
                                                    return;
                                                e.preventDefault();
                                                const cur = (form.gender ?? "남자");
                                                const idx = GENDER_OPTIONS.indexOf(cur);
                                                const ni = nextIndex(idx, GENDER_OPTIONS.length, e.key);
                                                const nv = GENDER_OPTIONS[ni];
                                                setForm({ ...form, gender: nv });
                                                focusById(`gender_${nv}_lbl`);
                                            }, onClick: (e) => {
                                                e.preventDefault();
                                                setForm({ ...form, gender: g });
                                            }, children: g })] }, g));
                            }) })), currentStep.key === "birthPlace" && (_jsxs("div", { className: "space-y-2", children: [_jsx(BirthPlacePickerBridge, { onSelect: (p) => setForm({ ...form, birthPlace: p }) }), _jsxs("span", { className: "inline-flex items-center gap-1", children: [_jsx("input", { id: "birthPlaceX", type: "checkbox", style: { display: "none" } }), _jsx("label", { htmlFor: "birthPlaceX", role: "checkbox", "aria-checked": unknownPlace, tabIndex: 0, className: "text-sm select-none cursor-pointer px-2 py-1 rounded-md border\n                             border-neutral-300 dark:border-neutral-700\n                             bg-white dark:bg-neutral-900\n                             focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-500\n                             data-[checked=true]:border-amber-400 data-[checked=true]:bg-amber-50\n                             dark:data-[checked=true]:bg-amber-500/10", "data-checked": unknownPlace ? "true" : "false", onKeyDown: (e) => {
                                                e.stopPropagation();
                                                if (e.key === " " || e.key === "Enter") {
                                                    e.preventDefault();
                                                    setUnknownPlace(!unknownPlace);
                                                }
                                            }, onClick: (e) => {
                                                e.preventDefault();
                                                setUnknownPlace(!unknownPlace);
                                            }, children: "\uBAA8\uB984" })] })] })), currentStep.key === "relationship" && (_jsx(RelationshipSelector, { value: form.relationship || "", onChange: (value) => setForm({ ...form, relationship: value }) })), currentStep.key === "folder" && (_jsx(FolderField, { value: normalizeFolderValue(form.folder), onChange: (v) => setForm({ ...form, folder: v }) })), currentStep.key === "memo" && (_jsx("textarea", { className: "w-full border rounded-lg p-2 bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 placeholder-neutral-400 dark:placeholder-neutral-500 text-neutral-900 dark:text-neutral-100", placeholder: currentStep.placeholder, value: form.memo || "", onChange: (e) => setForm({ ...form, memo: e.target.value }) })), _jsx("button", { type: "submit", className: "mt-4 w-full btn_style dark:focus:ring-amber-500", children: stepIndex === steps.length - 1 ? "저장하기" : "확인" })] }) })] }));
}
