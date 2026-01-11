import type { Dispatch, SetStateAction } from "react";

type SidebarNewFolderRowProps = {
  newFolderName: string;
  setNewFolderName: Dispatch<SetStateAction<string>>;
  onCreate: () => void;
  isFiltering: boolean;
  totalCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
};

export function SidebarNewFolderRow({
  newFolderName,
  setNewFolderName,
  onCreate,
  isFiltering,
  totalCount,
  collapsed,
  onToggleCollapse,
}: SidebarNewFolderRowProps) {
  return (
    <>
      <div className="flex items-center mb-2 gap-2">
        <input
          type="text"
          value={newFolderName}
          onChange={(e) => setNewFolderName(e.target.value)}
          placeholder="폴더 이름 입력"
          className="flex-1 w-[60%] px-2 py-1 rounded h-30 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500"
          onClick={(e) => e.stopPropagation()}
        />
        <button
          type="button"
          className="px-3 rounded h-30 text-sm cursor-pointer bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 border border-neutral-200 dark:border-neutral-700"
          onClick={(e) => {
            e.stopPropagation();
            onCreate();
          }}
        >
          폴더추가
        </button>
      </div>
      <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-1">
        {isFiltering
          ? "필터링 중에는 드래그가 비활성화돼요."
          : "명식/폴더를 드래그 하여 순서를 바꿀 수 있어요."}
      </p>
      <div className="flex items-center justify-between text-xs text-neutral-600 dark:text-neutral-400 mb-2">
        <div>
          <span className="font-semibold text-neutral-900 dark:text-neutral-100">총 명식 수</span>
          <span className="mx-1">·</span>
          <span className="font-semibold text-amber-500 dark:text-amber-600">{totalCount}개</span>
        </div>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="px-2 py-1 rounded border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
        >
          {collapsed ? "명식 카드 펼치기" : "명식 카드 접기"}
        </button>
      </div>
      <div className="text-xs mb-2 text-neutral-900 dark:text-neutral-100">
        카드를 접어놓았을 때는 카드만 눌러도 명식을 볼 수 있어요 !
      </div>
    </>
  );
}
