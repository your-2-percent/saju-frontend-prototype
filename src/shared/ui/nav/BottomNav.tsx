// components/BottomNav.tsx
import { useState } from "react";
import { Home, HeartHandshake, Settings } from "lucide-react";
import SettingsDrawer from "@/app/pages/SettingsDrawer";

export default function BottomNav({ onShowToday, onShowCouple }: { onShowToday: () => void; onShowCouple: () => void }) {
  const [openSettings, setOpenSettings] = useState(false);

  return (
    <>
      {/* 네비게이션 바 */}
      <div className="fixed min-w-[320px] h-[64px] bottom-0 left-0 right-0 bg-white border-t border-neutral-200 py-2 text-xs sm:text-sm z-50 dark:bg-neutral-950 dark:border-neutral-800">
        <nav className="flex justify-around items-center max-w-[640px] w-full mx-auto">
          <NavItem icon={<Home size={22} />} label="오늘의 사주" onClick={onShowToday} />
          <NavItem icon={<HeartHandshake size={22} />} label="궁합" onClick={onShowCouple} />
          <NavItem icon={<Settings size={22} />} label="기타설정" onClick={() => setOpenSettings(true)} />
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
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center text-neutral-600 hover:text-purple-600 transition-colors cursor-pointer dark:text-neutral-300 dark:hover:text-purple-400"
    >
      {icon}
      <span className="mt-1">{label}</span>
    </button>
  );
}
