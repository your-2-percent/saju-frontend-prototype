import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
// components/Sidebar.tsx
import { X, Plus, ChevronDown, ChevronUp, Star } from "lucide-react";
import { DragDropContext, Droppable, Draggable, } from "@hello-pangea/dnd";
import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { useSidebarLogic } from "@/features/sidebar/lib/sidebarLogic";
import { fmtBirthKR, formatPlaceDisplay, calcAgeFromBirthDay, getGanjiString, } from "@/features/sidebar/lib/sidebarUtils";
import { normalizeFolderValue } from "@/features/sidebar/model/folderModel";
import { useLocalStorageState } from "@/shared/lib/hooks/useLocalStorageState";
import { recalcGanjiSnapshot } from "@/shared/domain/간지/recalcGanjiSnapshot";
import { formatLocalHM } from "@/shared/utils";
import { isDST } from "@/shared/lib/core/timeCorrection";
/** ITEM 드롭영역 id 규칙 */
const DROPPABLE_UNASSIGNED = "list:__unassigned__";
const listDroppableId = (folderName) => `list:${folderName}`;
const decodeListIdToFolder = (droppableId) => {
    if (!droppableId.startsWith("list:"))
        return undefined;
    const key = droppableId.slice(5);
    return key === "__unassigned__" ? undefined : key;
};
/** 드래그 중인 노드를 body로 포털 */
function useDragPortal() {
    const portalEl = useMemo(() => {
        const el = document.createElement("div");
        el.style.position = "fixed";
        el.style.top = "0";
        el.style.left = "0";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.zIndex = "9999";
        el.style.pointerEvents = "none";
        return el;
    }, []);
    useEffect(() => {
        document.body.appendChild(portalEl);
        return () => {
            try {
                document.body.removeChild(portalEl);
            }
            catch {
                console.log("에러");
            }
        };
    }, [portalEl]);
    return (node, isDragging) => isDragging ? createPortal(node, portalEl) : node;
}
export default function Sidebar({ open, onClose, onView, onAddNew, onEdit, }) {
    const { list, remove, update } = useMyeongSikStore();
    const { folderFavMap, setFolderFavMap, folderOpenMap, setFolderOpenMap, memoOpenMap, setMemoOpenMap, newFolderName, setNewFolderName, orderedFolders, grouped, unassignedItems, confirmThrottled, handleDragEnd: handleFolderDragEnd, // 폴더 재정렬용
    createFolder, deleteFolder, UNASSIGNED_LABEL, displayFolderLabel, } = useSidebarLogic(list, update);
    // 리스트별 아이템 순서(로컬 전용)
    const [orderMap, setOrderMap] = useLocalStorageState("ms_order_map", {});
    const [folderOrder, setFolderOrder] = useLocalStorageState("folder_order", []);
    // 포털
    const portalize = useDragPortal();
    /** 현재 렌더기준 배열을 orderMap 순서로 정렬 */
    const orderItems = (droppableId, arr) => {
        const byId = new Map(arr.map((it) => [it.id, it]));
        const order = orderMap[droppableId] ?? [];
        const out = [];
        for (const id of order) {
            const it = byId.get(id);
            if (it) {
                out.push(it);
                byId.delete(id);
            }
        }
        byId.forEach((it) => out.push(it));
        return out;
    };
    // 드롭다운 옵션: 바깥 선택 포함
    const folderOptions = [UNASSIGNED_LABEL, ...orderedFolders];
    /** orderMap 초기화 (누락 id 보강) */
    useEffect(() => {
        setOrderMap((prev) => {
            let changed = false;
            const next = { ...prev };
            // 바깥(미지정)
            const outId = DROPPABLE_UNASSIGNED;
            if (!next[outId]) {
                next[outId] = unassignedItems.map((it) => it.id);
                changed = true;
            }
            else {
                const missing = unassignedItems.map((it) => it.id).filter((id) => !next[outId].includes(id));
                if (missing.length) {
                    next[outId] = [...next[outId], ...missing];
                    changed = true;
                }
            }
            // 각 폴더
            for (const folderName of orderedFolders) {
                const listId = listDroppableId(folderName);
                const arr = grouped[folderName] || [];
                if (!next[listId]) {
                    next[listId] = arr.map((it) => it.id);
                    changed = true;
                }
                else {
                    const missing = arr.map((it) => it.id).filter((id) => !next[listId].includes(id));
                    if (missing.length) {
                        next[listId] = [...next[listId], ...missing];
                        changed = true;
                    }
                }
            }
            return changed ? next : prev;
        });
    }, [unassignedItems, grouped, orderedFolders, setOrderMap]);
    // 화면에 “현재 보이는 순서”의 id 배열을 만든다 (인덱스 일치 보장용)
    const getDisplayOrder = (droppableId) => {
        const folder = decodeListIdToFolder(droppableId);
        const baseArr = folder ? (grouped[folder] || []) : unassignedItems;
        return orderItems(droppableId, baseArr).map((it) => it.id);
    };
    // 카드(아이템) Draggable (포털 적용)
    const renderCard = (m, index) => {
        const memoOpen = !!memoOpenMap[m.id];
        const ganji = getGanjiString(m);
        const placeDisplay = formatPlaceDisplay(m.birthPlace?.name);
        const keyId = `item:${m.id}`;
        let correctedDate = new Date(m.corrected);
        const useDST = isDST(correctedDate.getFullYear(), correctedDate.getMonth() + 1, // JS는 0~11월 → +1 필요
        correctedDate.getDate());
        if (useDST) {
            correctedDate = new Date(correctedDate.getTime() - 60 * 60 * 1000);
        }
        return (_jsx(Draggable, { draggableId: keyId, index: index, children: (drag, snapshot) => portalize(_jsx("li", { ref: drag.innerRef, ...drag.draggableProps, ...drag.dragHandleProps, style: drag.draggableProps.style, className: "list-none select-none rounded-xl border\n                         bg-white dark:bg-neutral-900\n                         border-neutral-200 dark:border-neutral-800\n                         text-neutral-900 dark:text-neutral-100", children: _jsxs("div", { className: "p-3", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-2", children: [_jsxs("div", { className: "font-semibold text-sm desk:text-base", children: [m.name, " (", calcAgeFromBirthDay(m.birthDay), "\uC138, ", m.gender, ")"] }), _jsx("span", { className: "opacity-40", children: "\uFF5C" }), _jsx("div", { className: "text-sm text-neutral-600 dark:text-neutral-300", children: m.relationship ? m.relationship : "관계 미지정" })] }), _jsxs("div", { className: "text-sm text-neutral-600 dark:text-neutral-300 mt-1", children: [fmtBirthKR(m.birthDay, m.birthTime), ", ", m.calendarType === "lunar" ? "음력" : "양력"] }), (placeDisplay || correctedDate) && (_jsxs("div", { className: "text-sm text-neutral-500 dark:text-neutral-400", children: [placeDisplay, correctedDate && (_jsxs("span", { className: "opacity-70", children: [" \u00B7 \uBCF4\uC815\uC2DC ", formatLocalHM(correctedDate)] }))] })), ganji && (_jsx("div", { className: "text-sm text-neutral-800 dark:text-neutral-200 mt-1 whitespace-pre-wrap break-keep", children: ganji })), m.memo && m.memo.trim() !== "" && (_jsxs("div", { className: "", children: [_jsx("button", { type: "button", className: "text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 inline-flex items-center gap-1 cursor-pointer", onClick: (e) => {
                                        e.stopPropagation();
                                        setMemoOpenMap((s) => ({
                                            ...s,
                                            [m.id]: !s[m.id],
                                        }));
                                    }, children: memoOpen ? "메모 닫기" : "메모 열기" }), _jsx("div", { className: memoOpen ? "mt-1 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap" : "hidden", children: m.memo })] })), _jsxs("div", { className: "flex flex-wrap gap-2 mt-3", children: [_jsx("select", { className: "h-30 text-xs rounded px-2 py-1 cursor-pointer\n                               bg-white dark:bg-neutral-900\n                               border border-neutral-300 dark:border-neutral-700\n                               text-neutral-900 dark:text-neutral-100\n                               focus:outline-none focus:ring-2 focus:ring-amber-500/40", value: displayFolderLabel(m.folder), onChange: (e) => {
                                        const raw = e.target.value;
                                        const normalized = normalizeFolderValue(raw);
                                        const itemId = m.id;
                                        const srcListId = m.folder ? listDroppableId(m.folder) : DROPPABLE_UNASSIGNED;
                                        const dstListId = normalized ? listDroppableId(normalized) : DROPPABLE_UNASSIGNED;
                                        if (normalized && !orderedFolders.includes(normalized)) {
                                            createFolder(normalized);
                                        }
                                        // orderMap 갱신 (항상 화면 기준 배열로)
                                        setOrderMap((prev) => {
                                            const next = { ...prev };
                                            const src = getDisplayOrder(srcListId);
                                            const dst = srcListId === dstListId ? src.slice() : getDisplayOrder(dstListId).slice();
                                            // src에서 제거
                                            const si = src.indexOf(itemId);
                                            if (si >= 0)
                                                src.splice(si, 1);
                                            // dst 맨앞으로
                                            const di = dst.indexOf(itemId);
                                            if (di >= 0)
                                                dst.splice(di, 1);
                                            dst.unshift(itemId);
                                            next[srcListId] = src;
                                            next[dstListId] = dst;
                                            return next;
                                        });
                                        // 실제 데이터 이동
                                        update(itemId, { folder: normalized });
                                    }, children: folderOptions.map((f) => (_jsx("option", { value: f, children: f }, f))) }), _jsxs("select", { className: "h-30 text-xs rounded px-2 py-1 cursor-pointer\n                               bg-white dark:bg-neutral-900\n                               border border-neutral-300 dark:border-neutral-700\n                               text-neutral-900 dark:text-neutral-100\n                               focus:outline-none focus:ring-2 focus:ring-amber-500/40", value: m.mingSikType ?? "자시", onChange: (e) => {
                                        const nextRule = e.target.value;
                                        const updated = { ...m, mingSikType: nextRule };
                                        const snapshot = recalcGanjiSnapshot(updated);
                                        update(m.id, { mingSikType: nextRule, ...snapshot });
                                        onView({ ...updated, ...snapshot });
                                        onClose();
                                    }, children: [_jsx("option", { value: "\uC790\uC2DC", children: "\uC790\uC2DC\uBA85\uC2DD" }), _jsx("option", { value: "\uC57C\uC790\uC2DC", children: "\uC57C\uC790\uC2DC\uBA85\uC2DD" }), _jsx("option", { value: "\uC778\uC2DC", children: "\uC778\uC2DC\uBA85\uC2DD" })] })] }), _jsxs("div", { className: "flex gap-2 mt-3", children: [_jsx("button", { onClick: (e) => {
                                        e.stopPropagation();
                                        onView(m);
                                        onClose();
                                    }, className: "px-3 py-1 rounded text-white text-sm cursor-pointer\n                               bg-indigo-600 hover:bg-indigo-500", children: "\uBCF4\uAE30" }), _jsx("button", { onClick: (e) => {
                                        e.stopPropagation();
                                        onEdit?.(m);
                                    }, className: "px-3 py-1 rounded text-white text-sm cursor-pointer\n                               bg-amber-600 hover:bg-amber-500", children: "\uC218\uC815" }), _jsx("button", { onClick: (e) => {
                                        e.stopPropagation();
                                        confirmThrottled(`'${m.name}' 명식을 삭제할까요?`, () => remove(m.id));
                                    }, className: "px-3 py-1 rounded text-white text-sm cursor-pointer\n                               bg-red-600 hover:bg-red-500", children: "\uC0AD\uC81C" }), _jsx("button", { type: "button", onClick: (e) => {
                                        e.stopPropagation();
                                        update(m.id, { favorite: !m.favorite });
                                    }, className: `ml-auto p-1 rounded cursor-pointer ${m.favorite ? "text-yellow-400" : "text-neutral-400"} hover:text-yellow-400`, children: _jsx(Star, { size: 16, fill: m.favorite ? "currentColor" : "none" }) })] })] }) }), snapshot.isDragging) }, keyId));
    };
    // onDragEnd: 화면에 보이는 순서를 기준으로 재배열
    const onDragEnd = (r) => {
        const { source, destination, draggableId, type } = r;
        if (!destination)
            return;
        if (type === "FOLDER") {
            handleFolderDragEnd(r);
            const newOrder = Array.from(folderOrder);
            const [moved] = newOrder.splice(source.index, 1);
            newOrder.splice(destination.index, 0, moved);
            setFolderOrder(newOrder);
            return;
        }
        if (type === "ITEM") {
            const itemId = draggableId.replace(/^item:/, "");
            const srcListId = source.droppableId;
            const dstListId = destination.droppableId;
            setOrderMap((prev) => {
                const next = { ...prev };
                // ✅ 지금 화면에 보이는 순서를 기준으로 가져옴
                const srcDisplay = getDisplayOrder(srcListId);
                const dstDisplay = srcListId === dstListId ? srcDisplay.slice() : getDisplayOrder(dstListId).slice();
                // 같은 리스트 재정렬
                if (srcListId === dstListId) {
                    const [moved] = dstDisplay.splice(source.index, 1);
                    dstDisplay.splice(destination.index, 0, moved);
                    next[srcListId] = dstDisplay;
                    return next;
                }
                // 서로 다른 리스트 이동
                const fromIdx = srcDisplay.indexOf(itemId);
                if (fromIdx >= 0)
                    srcDisplay.splice(fromIdx, 1);
                // 목적지에 끼워넣기 (드랍 인덱스 기준)
                const existIdx = dstDisplay.indexOf(itemId);
                if (existIdx >= 0)
                    dstDisplay.splice(existIdx, 1);
                dstDisplay.splice(destination.index, 0, itemId);
                next[srcListId] = srcDisplay;
                next[dstListId] = dstDisplay;
                return next;
            });
            // 폴더 이동 반영
            const srcFolder = decodeListIdToFolder(srcListId);
            const dstFolder = decodeListIdToFolder(dstListId);
            if (srcFolder !== dstFolder) {
                update(itemId, { folder: dstFolder });
            }
        }
    };
    // 폴더 렌더 순서
    const foldersToRender = [
        ...folderOrder.filter((f) => orderedFolders.includes(f)),
        ...orderedFolders.filter((f) => !folderOrder.includes(f)),
    ];
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: `fixed inset-0 bg-black/70 transition-opacity duration-300 z-90 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`, onClick: onClose }), _jsxs("div", { className: `fixed top-0 left-0 h-[calc(100dvh_-_0px)] w-full sm:w-1/3
                    bg-white dark:bg-neutral-950
                    text-neutral-900 dark:text-white
                    shadow-lg transform transition-transform duration-300 z-99
                    ${open ? "translate-x-0" : "-translate-x-full"}`, children: [_jsxs("div", { className: "flex justify-between items-center h-12 desk:h-16 p-4 border-b border-neutral-200 dark:border-neutral-800", children: [_jsx("h2", { className: "text-lg font-bold", children: "\uBA85\uC2DD \uB9AC\uC2A4\uD2B8" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: () => {
                                            onAddNew();
                                            onClose();
                                        }, className: "inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm cursor-pointer\n                         bg-purple-600 hover:bg-purple-500 text-white", children: [_jsx(Plus, { size: 16 }), " \uBA85\uC2DD\uCD94\uAC00"] }), _jsx("button", { onClick: onClose, className: "p-1 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900", children: _jsx(X, { size: 22 }) })] })] }), _jsx(DragDropContext, { onDragEnd: onDragEnd, children: _jsxs("div", { className: "p-4 overflow-y-auto h-[calc(100%-56px)]", children: [_jsxs("div", { className: "flex items-center mb-2 gap-2", children: [_jsx("input", { type: "text", value: newFolderName, onChange: (e) => setNewFolderName(e.target.value), placeholder: "\uC0C8 \uD3F4\uB354 \uC774\uB984", className: "flex-1 w-[60%] px-2 py-1 rounded h-30\n                           bg-white dark:bg-neutral-900\n                           border border-neutral-300 dark:border-neutral-700\n                           text-sm text-neutral-900 dark:text-neutral-100\n                           placeholder-neutral-400 dark:placeholder-neutral-500" }), _jsx("button", { type: "button", onClick: () => createFolder(newFolderName), className: "px-3 rounded h-30 text-sm cursor-pointer\n                           bg-neutral-100 hover:bg-neutral-200\n                           dark:bg-neutral-800 dark:hover:bg-neutral-700\n                           text-neutral-900 dark:text-neutral-100\n                           border border-neutral-200 dark:border-neutral-700", children: "\uC0DD\uC131" })] }), _jsx("p", { className: "text-xs text-neutral-600 dark:text-neutral-400 mb-2", children: "\uBA85\uC2DD/\uD3F4\uB354\uB97C \uB4DC\uB798\uADF8 \uD558\uC5EC \uC21C\uC11C\uB97C \uBC14\uAFC0 \uC218 \uC788\uC2B5\uB2C8\uB2E4." }), _jsx(Droppable, { droppableId: DROPPABLE_UNASSIGNED, type: "ITEM", children: (prov) => {
                                        const outItems = orderItems(DROPPABLE_UNASSIGNED, unassignedItems);
                                        return (_jsx("div", { ref: prov.innerRef, ...prov.droppableProps, className: "mb-6", children: _jsxs("ul", { className: "space-y-3", children: [outItems.map((m, i) => renderCard(m, i)), prov.placeholder] }) }));
                                    } }), _jsx(Droppable, { droppableId: "folders:root", type: "FOLDER", children: (foldersProv) => (_jsxs("div", { ref: foldersProv.innerRef, ...foldersProv.droppableProps, children: [foldersToRender.map((folderName, folderIndex) => {
                                                const listId = listDroppableId(folderName);
                                                const inItems = orderItems(listId, grouped[folderName] || []);
                                                const openF = !!folderOpenMap[folderName];
                                                const isFavFolder = !!folderFavMap[folderName];
                                                return (_jsx(Draggable, { draggableId: `folder-${folderName}`, index: folderIndex, children: (folderDrag, folderSnap) => portalize(_jsxs("div", { ref: folderDrag.innerRef, ...folderDrag.draggableProps, style: folderDrag.draggableProps.style, className: "mb-4", children: [_jsxs("div", { ...folderDrag.dragHandleProps, className: "flex items-center justify-between px-2 py-2 rounded cursor-grab\n                                           bg-neutral-50 dark:bg-neutral-900/70\n                                           border border-neutral-200 dark:border-neutral-800\n                                           text-neutral-800 dark:text-neutral-200", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { type: "button", onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    setFolderOpenMap((s) => ({
                                                                                        ...s,
                                                                                        [folderName]: !openF,
                                                                                    }));
                                                                                }, className: "inline-flex items-center gap-1 text-sm font-semibold cursor-pointer", children: [openF ? _jsx(ChevronUp, { size: 16 }) : _jsx(ChevronDown, { size: 16 }), _jsx("span", { className: "text-sm font-semibold", children: folderName })] }), _jsx("button", { type: "button", onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    setFolderFavMap((s) => ({
                                                                                        ...s,
                                                                                        [folderName]: !s[folderName],
                                                                                    }));
                                                                                }, className: `p-1 rounded cursor-pointer ${isFavFolder ? "text-yellow-400" : "text-neutral-400"} hover:text-yellow-400`, children: _jsx(Star, { size: 16, fill: isFavFolder ? "currentColor" : "none" }) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("span", { className: "opacity-60 text-xs", children: [inItems.length, "\uAC1C"] }), _jsx("button", { type: "button", onClick: (e) => {
                                                                                    e.stopPropagation();
                                                                                    if (folderFavMap[folderName]) {
                                                                                        confirmThrottled(`'${folderName}' 폴더는 즐겨찾기 되어 있습니다.\n즐겨찾기 해제 후 삭제해주세요.`, () => { });
                                                                                        return;
                                                                                    }
                                                                                    confirmThrottled(`'${folderName}' 폴더를 삭제할까요?\n(소속 항목은 바깥으로 이동합니다)`, () => deleteFolder(folderName));
                                                                                }, className: "px-2 py-1 rounded text-xs cursor-pointer\n                                               border border-red-300 dark:border-red-700\n                                               text-red-700 dark:text-red-300\n                                               hover:bg-red-50 dark:hover:bg-red-900/30", children: "\uC0AD\uC81C" })] })] }), openF && (_jsx(Droppable, { droppableId: listId, type: "ITEM", children: (prov) => (_jsx("div", { ref: prov.innerRef, ...prov.droppableProps, className: "mt-2", children: _jsxs("ul", { className: "space-y-3", children: [inItems.map((m, i) => renderCard(m, i)), prov.placeholder] }) })) }))] }), folderSnap.isDragging) }, `folder-${folderName}`));
                                            }), foldersProv.placeholder] })) })] }) })] })] }));
}
