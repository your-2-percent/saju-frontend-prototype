// components/TopNav.tsx
import { Menu, UserPlus, UserSquare } from "lucide-react";

export default function TopNav({
  onOpenSidebar,
  onAddNew,    // ✅ 명식 추가 콜백
  onOpenCustom // ✅ 커스텀 명식 모달 열기 콜백 (추가)
}: {
  onOpenSidebar: () => void;
  onAddNew: () => void;
  onOpenCustom: () => void;
}) {
  return (
    <header className="fixed min-w-[320px] top-0 left-0 right-0 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 z-55 px-2 desk:px-3 transition-colors">
      <div className="max-w-[640px] w-full mx-auto h-12 sm:h-14 flex items-center">
        {/* 햄버거: 명식리스트 열기 */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="명식리스트 열기"
          className="p-2 rounded-full text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-purple-600 dark:hover:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-colors"
        >
          <Menu size={22} />
        </button>

        {/* 가운데 타이틀 */}
        <h1 className="mx-auto text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          화림만세력
        </h1>

        {/* 오른쪽: 추가 버튼들 */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onAddNew}
            aria-label="명식 추가"
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-colors"
          >
            <UserPlus size={18} />
          </button>
          <button
            type="button"
            onClick={onOpenCustom}  // ✅ 연결
            aria-label="명식 커스텀"
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-colors"
          >
            <UserSquare size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}