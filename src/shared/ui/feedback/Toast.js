import { jsx as _jsx } from "react/jsx-runtime";
// components/ui/Toast.tsx
import { useEffect } from "react";
export default function Toast({ message, onClose, ms = 2000 }) {
    useEffect(() => {
        const timer = setTimeout(onClose, ms);
        return () => clearTimeout(timer);
    }, [onClose, ms]);
    return (_jsx("div", { className: "fixed top-4 left-1/2 -translate-x-1/2 bg-black text-white px-4 py-2 rounded-lg shadow-lg z-[9999]", children: message }));
}
