import { Menu, UserPlus, UserSquare } from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "@/lib/supabase";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";
import { useLoginNudgeStore } from "@/shared/auth/loginNudgeStore";

export default function TopNav({
  onOpenSidebar,
  onAddNew,
  onOpenCustom,
  isLoggedIn,
}: {
  onOpenSidebar: () => void;
  onAddNew: () => void;
  onOpenCustom: () => void;
  isLoggedIn: boolean;
}) {
  const listLen = useMyeongSikStore((s) => s.list.length);
  const canAddMyeongsik = useEntitlementsStore((s) => s.canAddMyeongsik);

  // ✅ auth 상태가 페이지 쪽에서 갱신 안 되는 케이스 대비(로그인 버튼 계속 뜨는 문제 방지)
  const [sessionLoggedIn, setSessionLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      setSessionLoggedIn(!!data.session?.user);
    });

    const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
      setSessionLoggedIn(!!session?.user);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const loggedInNow = isLoggedIn || sessionLoggedIn;

  const addGate = canAddMyeongsik(listLen);
  const addLocked = !addGate.ok;
  const lockTitle = addLocked ? addGate.message : "";

  const tryAdd = () => {
    if (addLocked) {
      toast(lockTitle || "명식 추가 불가 🔒");
      return;
    }
    onAddNew();
  };

  const tryCustom = () => {
    if (addLocked) {
      toast(lockTitle || "명식 추가 불가 🔒");
      return;
    }
    onOpenCustom();
  };

  const openLoginModal = () => {
    useLoginNudgeStore.getState().openWith("HEADER");
  };

  const baseBtn =
    "w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors";
  const enabledPurple = "bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500 cursor-pointer";
  const enabledOrange = "bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-500 cursor-pointer";
  //const enabledNeutral = "bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 cursor-pointer";
  const disabledCls = "bg-neutral-300 dark:bg-neutral-800 text-neutral-100 cursor-not-allowed opacity-80";

  return (
    <header className="fixed min-w-[320px] top-0 left-0 right-0 bg-white dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 z-55 px-2 desk:px-3 transition-colors">
      <div className="relative max-w-[640px] w-full mx-auto h-12 sm:h-14 flex justify-between items-center">
        <button
          type="button"
          onClick={onOpenSidebar}
          aria-label="명식리스트 열기"
          className="p-2 rounded-full text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-purple-600 dark:hover:text-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer transition-colors"
        >
          <Menu size={22} />
        </button>

        <h1 className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mx-auto text-base sm:text-lg font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          화림만세력
        </h1>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={tryAdd}
            aria-label="명식 추가"
            disabled={addLocked}
            title="명식 추가"
            className={`${baseBtn} ${addLocked ? disabledCls : enabledPurple}`}
          >
            <UserPlus size={18} />
            {addLocked ? <span className="ml-1 text-[12px]">🔒</span> : null}
          </button>

          <button
            type="button"
            onClick={tryCustom}
            aria-label="명식 간지로 추가"
            disabled={addLocked}
            title="명식 간지로 추가"
            className={`${baseBtn} ${addLocked ? disabledCls : enabledOrange}`}
          >
            <UserSquare size={18} />
            {addLocked ? <span className="ml-1 text-[12px]">🔒</span> : null}
          </button>

          {/* ✅ 게스트일 때만 로그인 버튼 노출 */}
          {!loggedInNow && (
            <button
              type="button"
              onClick={openLoginModal}
              aria-label="로그인"
              title="로그인"
              className="text-xs cursor-pointer"
            >
              {/* <SquareUserRound size={18} /> */}
              <ins>로그인</ins>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
