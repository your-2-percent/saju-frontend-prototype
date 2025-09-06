import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable, } from "@hello-pangea/dnd";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
const defaultOptions = [
    { value: "본인", label: "본인 (1인지정만 가능)" },
    { value: "연인/배우자", label: "연인 / 배우자" },
    { value: "가족", label: "가족" },
    { value: "고객", label: "고객" },
    { value: "친구", label: "친구" },
    { value: "동료", label: "동료" },
    { value: "지인", label: "지인" },
];
export const RelationshipSelector = ({ value, onChange }) => {
    const [options, setOptions] = useState(defaultOptions);
    const [selected, setSelected] = useState("");
    const [showEtc, setShowEtc] = useState(false);
    const [etcValue, setEtcValue] = useState("");
    const [showModify, setShowModify] = useState(false);
    const { list } = useMyeongSikStore();
    // 이미 본인 지정된 명식이 있는지 체크
    const hasSelf = list.some((m) => m.relationship === "본인");
    // 옵션 목록에서 본인 제거 (이미 본인이 있는 경우)
    const filteredOptions = hasSelf
        ? options.filter((o) => o.value !== "본인")
        : options;
    useEffect(() => {
        if (value !== undefined)
            setSelected(value);
    }, [value]);
    const handleChange = (e) => {
        const val = e.target.value;
        setSelected(val);
        onChange?.(val);
        if (val === "기타입력") {
            setShowEtc(true);
        }
        else {
            setShowEtc(false);
            setEtcValue("");
        }
    };
    // localStorage 복원
    useEffect(() => {
        const saved = localStorage.getItem("relationshipOptions");
        if (saved) {
            setOptions(JSON.parse(saved));
        }
    }, []);
    // localStorage 저장
    useEffect(() => {
        localStorage.setItem("relationshipOptions", JSON.stringify(options));
    }, [options]);
    const handleAdd = () => {
        if (!etcValue.trim())
            return;
        const newOption = { value: etcValue, label: etcValue };
        setOptions([...options, newOption]);
        setSelected(etcValue);
        setEtcValue("");
        setShowEtc(false);
    };
    const handleDelete = (value) => {
        setOptions(options.filter((opt) => opt.value !== value));
        if (selected === value)
            setSelected("");
    };
    const handleDragEnd = (result) => {
        if (!result.destination)
            return;
        const newOptions = Array.from(options);
        const [moved] = newOptions.splice(result.source.index, 1);
        newOptions.splice(result.destination.index, 0, moved);
        setOptions(newOptions);
    };
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "rel_set flex items-center gap-2", children: [_jsxs("select", { name: "relationship", id: "relationship", value: selected, onChange: handleChange, children: [_jsx("option", { value: "", hidden: true, children: "\uAD00\uACC4\uC120\uD0DD" }), filteredOptions.map((opt) => (_jsx("option", { value: opt.value, children: opt.label }, opt.value))), _jsx("option", { value: "\uAE30\uD0C0\uC785\uB825", children: "\uAE30\uD0C0\uC785\uB825" })] }), _jsx("button", { type: "button", onClick: () => setShowModify(true), className: "btn_style", children: "\uAD00\uACC4\uC218\uC815" })] }), showEtc && !showModify && (_jsxs("div", { className: "rel_set flex items-center mt-2 gap-2", children: [_jsx("input", { type: "text", placeholder: "\uAD00\uACC4 \uAE30\uD0C0\uC785\uB825", value: etcValue, onChange: (e) => setEtcValue(e.target.value) }), _jsx("button", { type: "button", onClick: handleAdd, className: "btn_style", children: "\uAD00\uACC4\uCD94\uAC00" })] })), showModify && (_jsxs("div", { className: "p-3 border mt-2 rounded bg-gray-50 dark:bg-neutral-900", children: [_jsx("h4", { className: "font-bold mb-2", children: "\uAD00\uACC4 \uC218\uC815" }), _jsx(DragDropContext, { onDragEnd: handleDragEnd, children: _jsx(Droppable, { droppableId: "relList", children: (provided) => (_jsxs("ul", { ref: provided.innerRef, ...provided.droppableProps, className: "space-y-1", children: [options.map((opt, idx) => (_jsx(Draggable, { draggableId: opt.value, index: idx, children: (prov) => (_jsxs("li", { ref: prov.innerRef, ...prov.draggableProps, ...prov.dragHandleProps, className: "flex justify-between items-center bg-white dark:bg-neutral-800 p-2 rounded border text-sm desk:text-base", children: [_jsx("span", { className: "cursor-grab mr-2", children: "\u2630" }), _jsx("span", { className: "flex-1 pr-1", children: opt.label }), _jsx("button", { type: "button", className: "text-red-500", onClick: () => handleDelete(opt.value), children: "\uC0AD\uC81C" })] })) }, opt.value))), provided.placeholder] })) }) }), _jsx("button", { type: "button", onClick: () => setShowModify(false), className: "w-full btn_style mt-2", children: "\uB2EB\uAE30" })] }))] }));
};
