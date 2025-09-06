import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
// components/form/FolderField.tsx
import { useEffect, useMemo, useState } from "react";
import { UNASSIGNED_LABEL, getFolderOptionsForInputNow, normalizeFolderValue, addCustomFolder, } from "@/features/sidebar/model/folderModel";
export default function FolderField({ value, onChange }) {
    const [options, setOptions] = useState([UNASSIGNED_LABEL]);
    const [inputMode, setInputMode] = useState(false);
    const [text, setText] = useState("");
    useEffect(() => {
        const raw = getFolderOptionsForInputNow();
        setOptions(Array.from(new Set(raw)));
    }, []);
    const selectValue = useMemo(() => (value ? value : UNASSIGNED_LABEL), [value]);
    return (_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { className: "flex-1 border rounded-lg p-2", value: inputMode ? "__custom__" : selectValue, onChange: (e) => {
                            const v = e.target.value;
                            if (v === "__custom__") {
                                setInputMode(true);
                                onChange(undefined);
                                return;
                            }
                            setInputMode(false);
                            onChange(normalizeFolderValue(v));
                        }, children: [options.map((f) => (_jsx("option", { value: f, children: f }, f))), _jsx("option", { value: "__custom__", children: "+ \uC0C8 \uD3F4\uB354 \uC9C1\uC811\uC785\uB825\u2026" })] }), inputMode && (_jsxs(_Fragment, { children: [_jsx("input", { type: "text", value: text, onChange: (e) => setText(e.target.value), placeholder: "\uC0C8 \uD3F4\uB354 \uC774\uB984", className: "flex-1 border rounded-lg p-2" }), _jsx("button", { type: "button", className: "px-3 py-2 rounded bg-neutral-800 hover:bg-neutral-700 text-sm", onClick: () => {
                                    const name = text.trim();
                                    if (!name)
                                        return;
                                    addCustomFolder(name);
                                    setOptions(getFolderOptionsForInputNow()); // 최신 옵션 반영
                                    onChange(name);
                                    setInputMode(false);
                                    setText("");
                                }, children: "\uCD94\uAC00" })] }))] }), _jsxs("p", { className: "text-xs text-gray-500", children: ["\uD3F4\uB354\uB97C \uC9C0\uC815\uD558\uC9C0 \uC54A\uC73C\uB824\uBA74 \"", UNASSIGNED_LABEL, "\"\uC744 \uC120\uD0DD\uD558\uC138\uC694. \uC9C1\uC811\uC785\uB825\uC73C\uB85C \uC0C8 \uD3F4\uB354\uB97C \uB9CC\uB4E4 \uC218 \uC788\uC5B4\uC694."] })] }));
}
