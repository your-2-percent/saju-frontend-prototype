import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// components/BottomNav.tsx
import { useState } from "react";
import { Home, HeartHandshake, Settings } from "lucide-react";
import SettingsDrawer from "@/app/pages/SettingsDrawer";
export default function BottomNav({ onShowToday, onShowCouple }) {
    const [openSettings, setOpenSettings] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed h-[64px] bottom-0 left-0 right-0 bg-white border-t border-neutral-200 py-2 text-xs sm:text-sm z-50 dark:bg-neutral-950 dark:border-neutral-800", children: _jsxs("nav", { className: "flex justify-around items-center max-w-[640px] w-full mx-auto", children: [_jsx(NavItem, { icon: _jsx(Home, { size: 22 }), label: "\uC624\uB298\uC758 \uC0AC\uC8FC", onClick: onShowToday }), _jsx(NavItem, { icon: _jsx(HeartHandshake, { size: 22 }), label: "\uAD81\uD569", onClick: onShowCouple }), _jsx(NavItem, { icon: _jsx(Settings, { size: 22 }), label: "\uAE30\uD0C0\uC124\uC815", onClick: () => setOpenSettings(true) })] }) }), _jsx(SettingsDrawer, { open: openSettings, onClose: () => setOpenSettings(false) })] }));
}
function NavItem({ icon, label, onClick, }) {
    return (_jsxs("button", { onClick: onClick, className: "flex flex-col items-center justify-center text-neutral-600 hover:text-purple-600 transition-colors cursor-pointer dark:text-neutral-300 dark:hover:text-purple-400", children: [icon, _jsx("span", { className: "mt-1", children: label })] }));
}
