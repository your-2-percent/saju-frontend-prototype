// src/shared/ui/nav/BottomNav.tsx
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Home, HeartHandshake, Settings, HelpCircle, Sparkles } from "lucide-react";
import SettingsDrawer from "@/settings/ui/SettingsDrawerPage";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";

export default function BottomNav({
  onShowToday,
  onShowCouple,
  onShowFaq,
}: {
  onShowToday: () => void;
  onShowCouple: () => void;
  onShowFaq: () => void;
}) {
  const [openSettings, setOpenSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const list = useMyeongSikStore((s) => s.list);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(useMyeongSikStore.getState().loading);
    const unsub = useMyeongSikStore.subscribe((state) => {
      setLoading(state.loading);
    });
    return () => unsub();
  }, []);

  const handleIChing = () => {
    if (loading) return;
    if (list.length === 0) {
      alert("명식을 먼저 생성하시고 다시 클릭해주세요!");
      return;
    }
    navigate("/iching");
  };

  // dock 위치 이동(채팅바 있을 때만 아래로)
  // safe-area padding/높이 보정(바닥에 붙어 보이게)
  const bottomDock = "var(--bottom-dock, 0px)";
  const safeBottom = "env(safe-area-inset-bottom, 0px)";

  const bottomStyle = {
    bottom: bottomDock,
    paddingBottom: safeBottom,
  } as const;

  return (
    <>
      {/* 내비게이션바 */}
      <div
        className="fixed min-w-[320px] h-[64px] px-2 box-border left-0 right-0 bg-white border-t border-neutral-200 py-2 text-xs sm:text-sm z-50 dark:bg-neutral-950 dark:border-neutral-800"
        style={bottomStyle}
      >
        <nav className="flex justify-around items-center max-w-[640px] w-full mx-auto">
          <NavItem icon={<Home size={22} />} label="오늘운세" onClick={onShowToday} />
          <NavItem icon={<HeartHandshake size={22} />} label="궁합" onClick={onShowCouple} />
          <NavItem icon={<HelpCircle size={22} />} label="FAQ" onClick={onShowFaq} />
          <NavItem icon={<Settings size={22} />} label="설정" onClick={() => setOpenSettings(true)} />
          <NavItem icon={<Sparkles size={22} />} label="주역·육효점" onClick={handleIChing} />
        </nav>
      </div>

      {/* 설정 Drawer */}
      <SettingsDrawer open={openSettings} onClose={() => setOpenSettings(false)} />
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
      className="flex flex-1 flex-col items-center justify-center text-neutral-600 hover:text-purple-600 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed dark:text-neutral-300 dark:hover:text-purple-400"
    >
      {icon}
      <span className="mt-1">{label}</span>
    </button>
  );
}