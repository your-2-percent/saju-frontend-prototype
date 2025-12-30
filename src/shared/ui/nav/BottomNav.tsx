// src/shared/ui/nav/BottomNav.tsx
import { useEffect, useState, type ReactNode } from "react";
import { Home, HeartHandshake, Settings, LogOut, LogIn, HelpCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import SettingsDrawer from "@/app/pages/SettingsDrawer";
import { useLoginNudgeStore } from "@/shared/auth/loginNudgeStore";

export default function BottomNav({
  onShowToday,
  onShowCouple,
  onShowFaq, // ✅ 추가
}: {
  onShowToday: () => void;
  onShowCouple: () => void;
  onShowFaq: () => void;
}) {
  const [openSettings, setOpenSettings] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);

  // ✅ BottomNav 자체에서 세션 기반 로그인 상태 추적
  const [sessionLoggedIn, setSessionLoggedIn] = useState(false);

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

  const loggedInNow = sessionLoggedIn;

  // 로그아웃 상태로 바뀌면 확인 모달 닫기(꼬임 방지)
  useEffect(() => {
    if (!loggedInNow && confirmLogout) setConfirmLogout(false);
  }, [loggedInNow, confirmLogout]);

  const openLoginModal = () => {
    useLoginNudgeStore.getState().openWith("BOTTOM_NAV");
  };

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.reload();
    } catch (e) {
      console.error(e);
      alert("로그아웃에 실패했습니다. 다시 시도해주세요.");
      setLoggingOut(false);
    }
  };

  // ✅ dock은 위치 이동(채팅바 있을 때만 위로)
  // ✅ safe-area는 패딩/높이로 흡수(바닥까지 붙어 보이게)
  const bottomDock = "var(--bottom-dock, 0px)";
  const safeBottom = "env(safe-area-inset-bottom, 0px)";

  const bottomStyle = {
    bottom: bottomDock,
    paddingBottom: safeBottom,
  } as const;

  return (
    <>
      {/* 네비게이션 바 */}
      <div
        className="fixed min-w-[320px] h-[64px] box-border left-0 right-0 bg-white border-t border-neutral-200 py-2 text-xs sm:text-sm z-50 dark:bg-neutral-950 dark:border-neutral-800"
        style={bottomStyle}
      >
        <nav className="flex justify-around items-center max-w-[640px] w-full mx-auto">
          <NavItem icon={<Home size={22} />} label="오늘의 사주" onClick={onShowToday} />
          <NavItem icon={<HeartHandshake size={22} />} label="궁합" onClick={onShowCouple} />

          {/* ✅ FAQ */}
          <NavItem icon={<HelpCircle size={22} />} label="FAQ" onClick={onShowFaq} />

          <NavItem icon={<Settings size={22} />} label="기타설정" onClick={() => setOpenSettings(true)} />

          {/* ✅ 로그인/로그아웃 토글 */}
          {loggedInNow ? (
            <NavItem
              icon={<LogOut size={22} />}
              label="로그아웃"
              onClick={() => setConfirmLogout(true)}
              disabled={loggingOut}
            />
          ) : (
            <NavItem icon={<LogIn size={22} />} label="로그인" onClick={openLoginModal} />
          )}
        </nav>
      </div>

      {/* 설정 Drawer */}
      <SettingsDrawer open={openSettings} onClose={() => setOpenSettings(false)} />

      {/* 로그아웃 확인 모달 (로그인 상태에서만) */}
      {loggedInNow && confirmLogout && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50"
          onClick={() => setConfirmLogout(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 p-6 rounded-xl shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">로그아웃 하시겠습니까?</h3>
            <div className="flex gap-3">
              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 cursor-pointer"
                onClick={() => setConfirmLogout(false)}
              >
                취소
              </button>
              <button
                type="button"
                className="flex-1 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 cursor-pointer"
                onClick={() => {
                  setConfirmLogout(false);
                  handleLogout();
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function NavItem({
  icon,
  label,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex flex-col items-center justify-center text-neutral-600 hover:text-purple-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed dark:text-neutral-300 dark:hover:text-purple-400"
    >
      {icon}
      <span className="mt-1">{label}</span>
    </button>
  );
}
