import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import toast from "react-hot-toast";
import { createPortal } from "react-dom";
import { useEffect, useRef } from "react";
export function confirmToast(message, opts = {}) {
    const { onConfirm, onCancel, duration = Number.POSITIVE_INFINITY, id = "confirm-center", disableBackdropClose = false, } = opts;
    return toast.custom((t) => {
        if (typeof window === "undefined" || !document?.body)
            return null;
        const handleCancel = () => {
            toast.dismiss(t.id);
            onCancel?.();
        };
        const handleConfirm = () => {
            toast.dismiss(t.id);
            onConfirm?.();
        };
        const Dialog = () => {
            const ref = useRef(null);
            useEffect(() => {
                // 토스트가 뜨자마자 div에 포커스 줌
                ref.current?.focus();
            }, []);
            const onKeyDown = (e) => {
                if (e.key === "Escape") {
                    e.preventDefault();
                    handleCancel();
                }
                if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirm();
                }
            };
            return (_jsxs("div", { ref: ref, role: "alertdialog", "aria-modal": "true", "aria-live": "assertive", tabIndex: -1, onKeyDown: onKeyDown, className: "fixed inset-0 z-[9999] flex items-center justify-center pointer-events-auto", children: [_jsx("div", { className: "absolute inset-0 bg-black/40", onClick: disableBackdropClose ? undefined : handleCancel }), _jsxs("div", { className: "relative bg-neutral-900 text-white px-4 py-3 rounded-lg shadow-lg border border-neutral-700 w-[min(92vw,520px)]\r\n                         transition-all duration-100 ease-out" // ← 애니메이션 100ms로 더 빠르게
                        , children: [_jsx("p", { className: "text-sm mb-3 whitespace-pre-line", children: message }), _jsxs("div", { className: "flex gap-2 justify-end", children: [_jsx("button", { type: "button", className: "px-3 py-1 text-sm rounded bg-neutral-700 hover:bg-neutral-600", onClick: handleCancel, children: "\uCDE8\uC18C" }), _jsx("button", { type: "button", className: "px-3 py-1 text-sm rounded bg-red-600 hover:bg-red-500", onClick: handleConfirm, children: "\uD655\uC778" })] })] })] }));
        };
        return createPortal(_jsx(Dialog, {}), document.body);
    }, { duration: duration === Number.POSITIVE_INFINITY ? 4000 : duration, id });
}
