import { XCircle } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
import type { MyeongsikSearchMode } from "@/myeongsik/calc/myeongsikList/ops";

type SidebarSearchBarProps = {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  searchMode: MyeongsikSearchMode;
  setSearchMode: Dispatch<SetStateAction<MyeongsikSearchMode>>;
  isFiltering: boolean;
  totalMatches: number;
};

export function SidebarSearchBar({
  search,
  setSearch,
  searchMode,
  setSearchMode,
  isFiltering,
  totalMatches,
}: SidebarSearchBarProps) {
  return (
    <div className="mb-3 sticky top-[-16px] z-10 pb-2 pt-2 bg-white dark:bg-neutral-950 z-50">
      <div className="flex items-center gap-2">
        <select
          value={searchMode}
          onChange={(e) => setSearchMode(e.target.value as MyeongsikSearchMode)}
          className="h-30 text-xs rounded px-2 py-1 cursor-pointer bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
        >
          <option value="name">이름</option>
          <option value="ganji">간지</option>
          <option value="birth">생년월일</option>
        </select>

        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              searchMode === "name"
                ? "이름 검색"
                : searchMode === "ganji"
                ? "간지 검색 (예: 경자·갑신)"
                : "생년월일 검색 (예: 19961229, 1996-12-29)"
            }
            className="w-full pl-7 pr-8 py-1 h-30 rounded bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-[16px] text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-60 hover:opacity-100"
              aria-label="검색 지우기"
              title="검색 지우기"
            >
              <XCircle size={16} />
            </button>
          )}
        </div>

        {isFiltering && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
            {totalMatches}개
          </span>
        )}
      </div>
    </div>
  );
}
