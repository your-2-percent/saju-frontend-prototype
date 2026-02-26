import { Draggable } from "@hello-pangea/dnd";
import { Star } from "lucide-react";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import { useMyeongsikCardInput } from "@/sidebar/input/useMyeongsikCardInput";
import { useMyeongsikCardCalc } from "@/sidebar/calc/useMyeongsikCardCalc";
import { useMyeongsikCardSave } from "@/sidebar/save/useMyeongsikCardSave";

type MemoToggleFn = (id: string) => void;

type MyeongsikCardProps = {
  m: MyeongSik;
  index: number;
  orderedFolders: string[];
  unassignedLabel: string;
  isDragDisabled: boolean;
  collapsed: boolean;
  memoOpen: boolean;
  onToggleMemo: MemoToggleFn;
  onToggleCollapsed: () => void;
  onChangeFolder: (id: string, folder: string | undefined) => void;
  onChangeMingSikType: (m: MyeongSik, nextRule: DayBoundaryRule) => void;
  onView: (m: MyeongSik) => void;
  onEdit: (m: MyeongSik) => void;
  onDelete: (m: MyeongSik) => void;
  onToggleFavorite: (id: string) => void;
};

export function MyeongsikCard({
  m,
  index,
  orderedFolders,
  unassignedLabel,
  isDragDisabled,
  collapsed,
  memoOpen,
  onToggleMemo,
  onToggleCollapsed,
  onChangeFolder,
  onChangeMingSikType,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
}: MyeongsikCardProps) {
  // 드래그 제한은 외부에서 준 값만 따른다
  const { canManage } = useMyeongsikCardInput();
  const calc = useMyeongsikCardCalc({ m, memoOpen, isDragDisabled, canManage });
  const effectiveCollapsed = collapsed;

  const save = useMyeongsikCardSave({
    m,
    unassignedLabel,
    onToggleMemo,
    onChangeFolder,
    onChangeMingSikType,
    onView,
    onEdit,
    onDelete,
    onToggleFavorite,
  });

  return (
    <Draggable
      draggableId={calc.keyId}
      index={index}
      key={calc.keyId}
      isDragDisabled={isDragDisabled} // prop 제한만 따른다
    >
      {(prov) => (
        <li
          ref={prov.innerRef}
          {...prov.draggableProps}
          {...prov.dragHandleProps}
          style={prov.draggableProps.style}
          className={`list-none select-none rounded-xl border bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 ${
            isDragDisabled ? "cursor-default" : "cursor-grab active:cursor-grabbing"
          }`}
          onClick={() => {
            if (effectiveCollapsed) save.handleView();
          }}
        >
          <div className="p-3">
            <div className="flex items-center gap-2">
              <div className="font-semibold text-sm desk:text-base">
                {m.name} ({calc.age}세{calc.genderLabel})
              </div>
              <span className="opacity-40">·</span>
              <div className="text-sm text-neutral-600 dark:text-neutral-300 text-nowrap">
                {calc.relationshipLabel}
              </div>

              {/* 드래그 힌트 */}
              <div className="ml-auto flex items-center gap-2">
                <span className="opacity-50 select-none">{calc.dragHandleLabel}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapsed();
                  }}
                  className="text-nowrap text-xs px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
                >
                  {effectiveCollapsed ? "카드 펼치기" : "카드 접기"}
                </button>
              </div>
            </div>

            {!effectiveCollapsed && (
              <div className="text-sm text-neutral-600 dark:text-neutral-300 mt-1">
                {calc.birthDisplay}, {calc.calendarLabel}
              </div>
            )}

            {!effectiveCollapsed && calc.showMetaLine && (
              <div className="text-sm text-neutral-500 dark:text-neutral-400">
                {calc.placeDisplay}
                {calc.correctedLabel && (
                  <span className="opacity-70"> 보정시각 {calc.correctedLabel}</span>
                )}
              </div>
            )}

            {calc.ganji && (
              <div className="text-sm text-neutral-800 dark:text-neutral-200 mt-1 whitespace-pre-wrap break-keep">
                {calc.ganji}
              </div>
            )}

            {!effectiveCollapsed && calc.showMemo && (
              <div>
                <button
                  type="button"
                  className="text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 inline-flex items-center gap-1 cursor-pointer"
                  onClick={save.handleToggleMemo}
                >
                  {calc.memoToggleLabel}
                </button>
                <div
                  className={
                    memoOpen
                      ? "mt-1 text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap"
                      : "hidden"
                  }
                >
                  {m.memo}
                </div>
              </div>
            )}

            {!effectiveCollapsed && (
              <div className="flex flex-wrap gap-2 mt-3">
                <select
                  className="h-30 text-xs rounded px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
                  value={m.folder ?? unassignedLabel}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    save.handleFolderChange(e.target.value);
                  }}
                >
                  {[unassignedLabel, ...orderedFolders].map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>

                <select
                  className="h-30 text-xs rounded px-2 py-1 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40 cursor-pointer"
                  value={calc.mingSikTypeValue}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    e.stopPropagation();
                    save.handleMingSikTypeChange(e.target.value);
                  }}
                >
                  <option value="자시">자시</option>
                  <option value="조자시/야자시">조자시/야자시</option>
                  <option value="인시">인시</option>
                </select>
              </div>
            )}

            {!effectiveCollapsed && (
              <div className="flex gap-2 mt-3">
                <button
                  type="button"
                  onClick={save.handleView}
                  className="px-3 py-1 rounded text-white text-sm cursor-pointer bg-indigo-600 hover:bg-indigo-500"
                >
                  보기
                </button>

                <button
                  type="button"
                  title="수정"
                  onClick={save.handleEdit}
                  className="px-3 py-1 rounded text-white text-sm bg-amber-600 hover:bg-amber-500 cursor-pointer"
                >
                  {calc.editLabel}
                </button>

                <button
                  type="button"
                  title="삭제"
                  onClick={save.handleDelete}
                  className="px-3 py-1 rounded text-white text-sm bg-red-600 hover:bg-red-500 cursor-pointer"
                >
                  {calc.deleteLabel}
                </button>

                <button
                  type="button"
                  title={calc.favoriteLabel}
                  onClick={save.handleToggleFavorite}
                  className={`ml-auto p-1 rounded cursor-pointer ${
                    m.favorite ? "text-yellow-400" : "text-neutral-400"
                  } hover:text-yellow-400`}
                  aria-label={calc.favoriteLabel}
                >
                  <Star size={16} fill={m.favorite ? "currentColor" : "none"} />
                </button>
              </div>
            )}
          </div>
        </li>
      )}
    </Draggable>
  );
}
