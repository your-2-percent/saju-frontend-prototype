import { X, Plus, LogIn, LogOut } from "lucide-react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";

type SidebarHeaderProps = {
  onClose: () => void;
  onAddNew: () => void;
  isLoggedIn: boolean;
  onLogin: () => void;
};

export function SidebarHeader({
  onClose,
  onAddNew,
  isLoggedIn,
  onLogin,
}: SidebarHeaderProps) {
  const listLen = useMyeongSikStore((s) => s.list.length);
  const canAddMyeongsik = useEntitlementsStore((s) => s.canAddMyeongsik);

  const addGate = canAddMyeongsik(listLen);
  const locked = !addGate.ok;
  const lockTitle = locked ? addGate.message : "";

  const tryAdd = () => {
    if (locked) {
      toast(lockTitle || "명식 추가 불가");
      return;
    }
    onAddNew();
  };

  const tryLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      toast("로그아웃 실패");
      return;
    }
    toast("로그아웃 완료");
  };

  return (
    <div className="flex justify-between items-center w-full h-12 desk:h-16 p-4 border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-bold">명식 리스트</h2>
      </div>

      <div className="flex items-center gap-2">
        {isLoggedIn ? (
          <button
            type="button"
            onClick={tryLogout}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm cursor-pointer
                       bg-neutral-200 text-neutral-800 hover:bg-neutral-300
                       dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
            title="로그아웃"
          >
            <LogOut size={16} /> 로그아웃
          </button>
        ) : (
          <button
            type="button"
            onClick={onLogin}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm cursor-pointer
                       bg-neutral-200 text-neutral-800 hover:bg-neutral-300
                       dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700"
            title="로그인"
          >
            <LogIn size={16} /> 로그인
          </button>
        )}

        <button
          type="button"
          onClick={tryAdd}
          disabled={locked}
          title={lockTitle}
          className={
            locked
              ? "inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm bg-neutral-200 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400 cursor-not-allowed opacity-80"
              : "inline-flex items-center gap-1 px-3 py-1.5 rounded text-sm cursor-pointer bg-purple-600 hover:bg-purple-500 text-white"
          }
        >
          <Plus size={16} /> 명식추가 {locked ? "불가" : ""}
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-900"
          aria-label="사이드바 닫기"
          title="닫기"
        >
          <X size={22} />
        </button>
      </div>
    </div>
  );
}
