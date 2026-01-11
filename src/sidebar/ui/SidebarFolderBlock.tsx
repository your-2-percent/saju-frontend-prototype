import { ChevronDown, ChevronUp, Star } from "lucide-react";
import { Draggable } from "@hello-pangea/dnd";
import type { ReactNode } from "react";

type SidebarFolderBlockProps = {
  folderName: string;
  folderIndex: number;
  isOpen: boolean;
  isFavorite: boolean;
  itemCount: number;
  isDragDisabled: boolean;
  onToggleOpen: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  inner: ReactNode;
};

export function SidebarFolderBlock({
  folderName,
  folderIndex,
  isOpen,
  isFavorite,
  itemCount,
  isDragDisabled,
  onToggleOpen,
  onToggleFavorite,
  onDelete,
  inner,
}: SidebarFolderBlockProps) {
  return (
    <Draggable
      key={`folder-${folderName}`}
      draggableId={`folder-${folderName}`}
      index={folderIndex}
      isDragDisabled={isDragDisabled}
    >
      {(prov) => (
        <div
          ref={prov.innerRef}
          {...prov.draggableProps}
          {...prov.dragHandleProps}
          className="mb-4 cursor-grab active:cursor-grabbing select-none"
        >
          <div className="flex items-center justify-between px-2 py-2 rounded bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleOpen();
                }}
                className="inline-flex items-center gap-1 text-sm font-semibold cursor-pointer"
              >
                {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                <span className="text-sm font-semibold">{folderName}</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className={`p-1 rounded cursor-pointer ${
                  isFavorite ? "text-yellow-400" : "text-neutral-400"
                } hover:text-yellow-400`}
                aria-label="폴더 즐겨찾기 토글"
                title={isFavorite ? "즐겨찾기 해제" : "즐겨찾기"}
              >
                <Star size={16} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="opacity-60 text-xs">{itemCount}개</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="px-2 py-1 rounded text-xs cursor-pointer border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                삭제
              </button>
            </div>
          </div>

          {isOpen ? inner : null}
        </div>
      )}
    </Draggable>
  );
}
