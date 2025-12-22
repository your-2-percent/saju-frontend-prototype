import { useEffect, useMemo, useState } from "react";
import type { MyeongSik } from "@/shared/lib/storage";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { formatDate24 } from "@/shared/utils";
import { baseSolarDate, idOf, nameOf } from "./coupleUtils";

const ORDER_KEY = "people_picker_order_v1";

function arrayMove<T>(arr: readonly T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function PeoplePickerModal({
  open,
  list,
  onSelect,
  onClose,
}: {
  open: boolean;
  list: MyeongSik[];
  onSelect: (m: MyeongSik) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState("");
  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const incomingIds = useMemo(() => list.map(idOf), [list]);
  const incomingIdSet = useMemo(() => new Set(incomingIds), [incomingIds]);

  const [orderIds, setOrderIds] = useState<string[]>([]);
  useEffect(() => {
    const raw = localStorage.getItem(ORDER_KEY);
    const saved: string[] = raw ? (JSON.parse(raw) as string[]) : [];

    const pruned = saved.filter((id) => incomingIdSet.has(id));
    const withNew = [...pruned, ...incomingIds.filter((id) => !pruned.includes(id))];

    setOrderIds(withNew);

    if (JSON.stringify(withNew) !== JSON.stringify(saved)) {
      localStorage.setItem(ORDER_KEY, JSON.stringify(withNew));
    }
  }, [incomingIds, incomingIdSet]);

  const persist = (ids: string[]) => {
    setOrderIds(ids);
    localStorage.setItem(ORDER_KEY, JSON.stringify(ids));
  };

  const ordered = useMemo(() => {
    const map = new Map(list.map((ms) => [idOf(ms), ms]));
    const result: MyeongSik[] = [];
    for (const id of orderIds) {
      const it = map.get(id);
      if (it) result.push(it);
    }
    map.forEach((ms, id) => {
      if (!orderIds.includes(id)) result.push(ms);
    });
    const self: MyeongSik[] = [];
    const rest: MyeongSik[] = [];
    for (const ms of result) {
      const relation = typeof ms.relationship === "string" ? ms.relationship.trim() : "";
      if (relation === "본인") self.push(ms);
      else rest.push(ms);
    }
    return [...self, ...rest];
  }, [list, orderIds]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ordered;
    return ordered.filter((m) => {
      const relation = typeof m.relationship === "string" ? m.relationship.trim() : "";
      const target = `${nameOf(m)} ${relation}`.toLowerCase();
      return target.includes(s);
    });
  }, [ordered, q]);

  const allowDrag = q.trim() === "";

  const onDragEnd = (r: DropResult) => {
    const { destination, source } = r;
    if (!destination) return;
    if (!allowDrag) return;
    if (destination.index === source.index) return;

    const visibleIds = filtered.map(idOf);
    const movedVisible = arrayMove(visibleIds, source.index, destination.index);

    const allIds = ordered.map(idOf);
    const invisibleIds = allIds.filter((id) => !visibleIds.includes(id));

    const nextIds = [...movedVisible, ...invisibleIds].filter(
      (id, i, arr) => arr.indexOf(id) === i
    );

    persist(nextIds);
  };

  return (
    <>
      <style>{`[data-rbd-drag-handle-context-id]{touch-action:none!important}`}</style>

      <div
        className={`fixed inset-0 bg-black/60 transition-opacity duration-200 z-[1000] ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />
      <div
        className={`fixed bottom-0 inset-x-0 mx-auto w-full max-w-[640px] max-h-[80dvh] bg-white dark:bg-neutral-950 rounded-t-2xl border border-neutral-200 dark:border-neutral-800 p-4 overflow-auto transition-transform duration-300 z-[1001] ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-200">
            명식 선택
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white text-sm cursor-pointer"
          >
            닫기
          </button>
        </div>

        <div className="mb-3">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름 검색"
            className="w-full px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm"
          />
          <div className="text-[11px] text-neutral-500 mt-1">
            검색 중에는 드래그 정렬이 비활성화됩니다.
          </div>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="people-picker">
            {(dropProvided) => (
              <ul
                className="space-y-2"
                ref={dropProvided.innerRef}
                {...dropProvided.droppableProps}
              >
                {filtered.map((m, idx) => {
                  const display = baseSolarDate(m);
                  const relationRaw =
                    typeof m.relationship === "string" ? m.relationship.trim() : "";
                  const relationLabel = relationRaw || "관계 미선택";
                  const name = nameOf(m);
                  const displayName =
                    relationRaw && name === "이름 없음" ? relationRaw : name;
                  return (
                    <Draggable key={idOf(m)} draggableId={idOf(m)} index={idx} isDragDisabled={!allowDrag}>
                      {(dragProvided) => (
                        <li
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900"
                        >
                          <button
                            onClick={() => onSelect(m)}
                            className="flex-1 text-left cursor-pointer"
                          >
                            <div className="flex items-center gap-2 text-sm text-neutral-900 dark:text-neutral-100">
                              <span>{displayName}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded border border-neutral-300 dark:border-neutral-700 ${
                                  relationRaw
                                    ? "text-neutral-600 dark:text-neutral-300"
                                    : "text-neutral-400 dark:text-neutral-500"
                                }`}
                              >
                                {relationLabel}
                              </span>
                            </div>
                            <div className="text-neutral-500 dark:text-neutral-400 text-xs">
                              {formatDate24(display)}
                            </div>
                          </button>
                        </li>
                      )}
                    </Draggable>
                  );
                })}
                {dropProvided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </>
  );
}
