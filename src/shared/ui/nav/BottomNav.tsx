// src/shared/ui/nav/BottomNav.tsx
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Home, HeartHandshake, Settings, HelpCircle, BookOpen } from "lucide-react";
import SettingsDrawer from "@/settings/ui/SettingsDrawerPage";

export default function BottomNav() {
  const [openSettings, setOpenSettings] = useState(false);
  const navigate = useNavigate();


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
          <NavItem icon={<Home size={22} />} label="오늘운세" onClick={() => navigate("/")} />
          <NavItem icon={<HeartHandshake size={22} />} label="궁합" onClick={() => navigate("/couple")} />
          <NavItem icon={<HelpCircle size={22} />} label="FAQ" onClick={() => navigate("/faq")} />
          <NavItem icon={<Settings size={22} />} label="설정" onClick={() => setOpenSettings(true)} />
          <NavItem icon={<BookOpen size={22} />} label="사주노트" onClick={() => navigate("/saju-note")} />
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
