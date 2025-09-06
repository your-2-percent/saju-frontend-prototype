import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { initBirthPlacePicker } from "@/features/place-picker/place-picker";
import "leaflet/dist/leaflet.css";
/* ========= 헬퍼 함수들: 모듈 스코프로 이동 (의존성 경고 방지) ========= */
function getSuggestionsEl() {
    return document.getElementById("suggestions");
}
function getItems(container) {
    // li 또는 role=option 요소를 모두 허용
    const items = Array.from(container.querySelectorAll('li, [role="option"]'));
    items.forEach((node, idx) => {
        if (!node.getAttribute("role"))
            node.setAttribute("role", "option");
        node.setAttribute("aria-selected", node === document.activeElement ? "true" : "false");
        node.tabIndex = -1; // 활성화 항목만 0으로
        if (!node.id)
            node.id = `suggestion-item-${idx}`;
    });
    return items;
}
function focusItem(container, index) {
    const items = getItems(container);
    if (items.length === 0)
        return;
    const len = items.length;
    let next = index;
    if (next < 0)
        next = len - 1;
    if (next >= len)
        next = 0;
    items.forEach((el) => {
        el.tabIndex = -1;
        el.setAttribute("aria-selected", "false");
    });
    const target = items[next];
    target.tabIndex = 0;
    target.setAttribute("aria-selected", "true");
    target.focus();
}
/* ========================================================================= */
export default function BirthPlacePickerBridge({ onSelect, placeholderText = "출생지선택", buttonStyle, value, }) {
    const [btnText, setBtnText] = useState(placeholderText);
    const [open, setOpen] = useState(false);
    const [localValue, setLocalValue] = useState(value ?? "");
    const nameRef = useRef(null);
    const latRef = useRef(null);
    const lonRef = useRef(null);
    const triggerBtnRef = useRef(null);
    // value prop이 바뀌면 표시 텍스트 동기화
    useEffect(() => {
        if (value !== undefined)
            setLocalValue(value);
    }, [value]);
    // 모달 열렸을 때: init + 포커스 트랩 + 제안 리스트 키보드 네비
    useEffect(() => {
        if (!open)
            return;
        // 1) init
        const cleanupPicker = initBirthPlacePicker({
            ids: {
                buttonInputId: "inputBirthPlace",
                buttonId: "inputBirthPlaceBtn",
                modalId: "mapModal",
                closeMapId: "closeMap",
                mapCloseBtnId: "mapCloseBtn",
                searchBoxId: "searchBox",
                suggestionsId: "suggestions",
                mapId: "map",
            },
            onSelected: (p) => {
                setBtnText("선택완료");
                setLocalValue(p.name);
                if (nameRef.current)
                    nameRef.current.value = p.name;
                if (latRef.current)
                    latRef.current.value = String(p.lat);
                if (lonRef.current)
                    lonRef.current.value = String(p.lon);
                onSelect?.(p);
                setOpen(false);
            },
        });
        // 내부 로직이 버튼 클릭을 트리거로 초기화할 수 있으므로 클릭 한번 쏴줌
        const btn = document.getElementById("inputBirthPlaceBtn");
        if (btn)
            btn.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        const modal = document.getElementById("mapModal");
        const searchBox = document.getElementById("searchBox");
        const suggestions = getSuggestionsEl();
        // 모달 열리면 검색창 포커스
        setTimeout(() => searchBox?.focus(), 0);
        // 2) 포커스 트랩 + ESC 닫기
        const FOCUSABLE = 'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])';
        const trapKeydown = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                setOpen(false);
                return;
            }
            if (e.key !== "Tab")
                return;
            // 제안 리스트 내부에서의 Tab은 별도 처리
            const s = getSuggestionsEl();
            if (s && s.contains(document.activeElement))
                return;
            const nodes = Array.from(modal.querySelectorAll(FOCUSABLE))
                .filter(el => !el.hasAttribute("disabled") && el.tabIndex !== -1);
            if (nodes.length === 0)
                return;
            const first = nodes[0];
            const last = nodes[nodes.length - 1];
            const active = document.activeElement;
            if (e.shiftKey) {
                if (active === first || !modal.contains(active)) {
                    e.preventDefault();
                    last.focus();
                }
            }
            else {
                if (active === last || !modal.contains(active)) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        modal.addEventListener("keydown", trapKeydown);
        // 3) 검색창: ↓ 누르면 첫 제안으로 이동
        const searchBoxKeydown = (e) => {
            if (e.key !== "ArrowDown")
                return;
            const s = getSuggestionsEl();
            if (!s)
                return;
            const items = getItems(s);
            if (items.length === 0)
                return;
            e.preventDefault();
            focusItem(s, 0);
        };
        searchBox?.addEventListener("keydown", searchBoxKeydown);
        // 3-1) 검색창: 입력 이벤트 → 비워지면 리스트 닫기
        const searchBoxInput = (e) => {
            const target = e.target;
            if (target.value.trim() === "") {
                const s = getSuggestionsEl();
                if (s) {
                    s.innerHTML = ""; // ✅ 리스트 비우기 = 닫기
                }
            }
        };
        searchBox?.addEventListener("input", searchBoxInput);
        // 4) 제안 리스트: Tab/방향키/Enter/Space 네비
        const suggestionsKeydown = (e) => {
            const s = getSuggestionsEl();
            if (!s)
                return;
            const items = getItems(s);
            if (items.length === 0)
                return;
            const activeEl = document.activeElement;
            const idx = activeEl ? items.indexOf(activeEl) : -1;
            if (idx === -1)
                return;
            const move = (delta) => {
                e.preventDefault();
                focusItem(s, idx + delta);
            };
            switch (e.key) {
                case "Tab":
                    e.preventDefault();
                    move(e.shiftKey ? -1 : 1);
                    break;
                case "ArrowDown":
                    e.preventDefault();
                    move(1);
                    break;
                case "ArrowUp":
                    e.preventDefault();
                    move(-1);
                    break;
                case "Home":
                    e.preventDefault();
                    focusItem(s, 0);
                    break;
                case "End":
                    e.preventDefault();
                    focusItem(s, items.length - 1);
                    break;
                case "Enter":
                case " ":
                    e.preventDefault();
                    activeEl.click(); // 내부 선택 핸들러 호출
                    break;
                case "Backspace": // ✅ 추가
                    e.preventDefault();
                    s.innerHTML = ""; // 리스트 닫기
                    searchBox?.focus(); // 다시 인풋으로 포커스 이동
                    break;
                default:
                    break;
            }
            e.stopPropagation();
        };
        // 5) 제안 리스트 변화 감지 → 첫 항목 자동 포커스
        let mo = null;
        if (suggestions) {
            suggestions.addEventListener("keydown", suggestionsKeydown);
            mo = new MutationObserver(() => {
                const s = getSuggestionsEl();
                if (!s)
                    return;
                const items = getItems(s);
                if (items.length === 0)
                    return;
                focusItem(s, 0);
            });
            mo.observe(suggestions, { childList: true, subtree: false });
        }
        return () => {
            modal.removeEventListener("keydown", trapKeydown);
            searchBox?.removeEventListener("keydown", searchBoxKeydown);
            searchBox?.removeEventListener("input", searchBoxInput);
            if (suggestions)
                suggestions.removeEventListener("keydown", suggestionsKeydown);
            mo?.disconnect();
            cleanupPicker?.();
        };
    }, [open, onSelect]); // ← 헬퍼는 모듈 스코프라 의존성에 포함 불필요
    // 모달 닫힐 때 트리거 버튼으로 포커스 복귀
    useEffect(() => {
        if (!open) {
            setTimeout(() => triggerBtnRef.current?.focus(), 0);
        }
    }, [open]);
    return (_jsxs("li", { className: "flex items-center gap-2", children: [_jsx("input", { className: "w-[60%] desk:w-[70%] mr-2 border rounded-lg p-2\n                   bg-white dark:bg-neutral-900\n                   border-neutral-300 dark:border-neutral-700\n                   text-neutral-900 dark:text-neutral-100\n                   placeholder-neutral-400 dark:placeholder-neutral-500", type: "text", id: "inputBirthPlace", readOnly: true, "aria-readonly": "true", value: localValue && localValue.trim() !== "" ? localValue : placeholderText }), _jsx("button", { ref: triggerBtnRef, type: "button", id: "inputBirthPlaceBtn", className: "btn_style text-sm desk:text-base w-[calc(40%_-_8px)] desk:w-[calc(30%_-_8px)] p-0", style: buttonStyle, onClick: () => setOpen(true), "aria-haspopup": "dialog", "aria-expanded": open, "aria-controls": "mapModal", children: btnText }), _jsx("input", { ref: nameRef, type: "hidden", name: "birthPlace_name", defaultValue: "" }), _jsx("input", { ref: latRef, type: "hidden", name: "birthPlace_lat", defaultValue: "" }), _jsx("input", { ref: lonRef, type: "hidden", name: "birthPlace_lon", defaultValue: "" }), open && (_jsx("div", { id: "mapModal", role: "dialog", "aria-modal": "true", "aria-labelledby": "mapModalTitle", className: "fixed inset-0 z-[999] flex items-center justify-center bg-black/40 dark:bg-black/60 p-4", children: _jsxs("div", { className: "w-[96vw] desk:w-[920px] rounded-2xl shadow-2xl overflow-hidden flex flex-col\n                          bg-white dark:bg-neutral-950\n                          text-neutral-900 dark:text-neutral-100\n                          border border-neutral-200 dark:border-neutral-800", children: [_jsxs("div", { className: "flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800", children: [_jsx("div", { id: "mapModalTitle", className: "font-bold", children: "\uCD9C\uC0DD\uC9C0\uC120\uD0DD" }), _jsx("button", { id: "mapCloseBtn", "aria-label": "\uB2EB\uAE30", className: "text-xl hover:opacity-70 cursor-pointer", onClick: () => setOpen(false), children: "\u2715" })] }), _jsxs("div", { className: "relative grid gap-2 px-3 py-3 border-t border-neutral-200 dark:border-neutral-800", children: [_jsx("label", { htmlFor: "searchBox", className: "text-xs text-neutral-500 dark:text-neutral-400", children: "\uB3C4\uC2DC/\uC9C0\uC5ED \uAC80\uC0C9" }), _jsxs("div", { className: "relative", children: [_jsx("input", { id: "searchBox", placeholder: "\uC608: \uC11C\uC6B8 \uAC15\uB0A8\uAD6C / seoul / \uB3C4\uCFC4\uB3C4 / tokyo", className: "h-10 w-full rounded-lg border px-3 outline-none\n                             bg-white dark:bg-neutral-900\n                             border-neutral-300 dark:border-neutral-700\n                             placeholder-neutral-400 dark:placeholder-neutral-500\n                             text-neutral-900 dark:text-neutral-100\n                             focus:border-neutral-400 dark:focus:border-neutral-600", autoComplete: "off" }), _jsx("ul", { id: "suggestions", role: "listbox", "aria-label": "\uC790\uB3D9\uC644\uC131 \uBAA9\uB85D", className: "absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto rounded-lg border shadow-xl z-[1005]\n                             bg-white dark:bg-neutral-900\n                             border-neutral-200 dark:border-neutral-700\n                             text-neutral-900 dark:text-neutral-100\n                             divide-y divide-neutral-200 dark:divide-neutral-800" })] })] }), _jsx("div", { className: "relative h-[250px] desk:h-[360px] border-y border-neutral-200 dark:border-neutral-800", children: _jsx("div", { id: "map", className: "h-full w-full" }) }), _jsxs("div", { className: "gap-2 p-3", children: [_jsxs("div", { id: "footerHint", className: "pr-2 text-xs text-neutral-600 dark:text-neutral-300 flex-1", children: [_jsxs("p", { className: "flex mb-1", children: [_jsx("span", { className: "mr-1", children: "*" }), _jsx("span", { children: "\uC9C0\uB3C4\uC5D0\uC11C \uAC80\uC0C9\uD558\uC5EC, \uBAA9\uB85D\uC5D0\uC11C \uC120\uD0DD\uD558\uC138\uC694." })] }), _jsxs("p", { className: "flex", children: [_jsx("span", { className: "mr-1", children: "*" }), _jsx("span", { children: "\uD574\uC678\uB97C \uAC80\uC0C9\uD560 \uACBD\uC6B0 \uC9C0\uB3C4\uAC00 \uC548 \uB730 \uC218 \uC788\uC73C\uB098, \uC120\uD0DD\uB9CC \uB20C\uB7EC\uC8FC\uC2DC\uBA74 \uB429\uB2C8\uB2E4." })] })] }), _jsx("button", { id: "closeMap", style: { display: "none" }, "aria-hidden": "true", tabIndex: -1 })] })] }) }))] }));
}
