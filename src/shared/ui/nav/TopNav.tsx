// components/TopNav.tsx
import { Menu, UserPlus } from "lucide-react";

export default function TopNav({
  onOpenSidebar,
  onAddNew,   // ✅ 명식 추가 콜백 prop
}: {
  onOpenSidebar: () => void;
  onAddNew: () => void;
}) {
  return (
    <header className="fixed top-0 left-0 right-0 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 z-55 px-2 desk:px-3 transition-colors">
      <div className="max-w-[640px] w-full mx-auto h-12 sm:h-14 flex items-center">
        {/* 햄버거 메뉴 (명식리스트 열기) */}
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="명식리스트 열기"
          className="p-2 rounded-full text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-purple-600 dark:hover:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-colors"
        >
          <Menu size={22} />
        </button>

        {/* 가운데 로고/타이틀 */}
        <h1 className="mx-auto text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          화림만세력
        </h1>

        {/* 오른쪽: 명식 추가 버튼 */}
        <button
          type="button"
          onClick={onAddNew}
          aria-label="명식 추가"
          className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-colors"
        >
          <UserPlus size={18} />
        </button>
      </div>
    </header>
  );
}
