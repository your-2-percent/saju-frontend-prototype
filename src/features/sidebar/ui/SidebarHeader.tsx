import { X, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";

type SidebarHeaderProps = {
  onClose: () => void;
  onAddNew: () => void;
};

export function SidebarHeader({ onClose, onAddNew }: SidebarHeaderProps) {
  const listLen = useMyeongSikStore((s) => s.list.length);
  const canAddMyeongsik = useEntitlementsStore((s) => s.canAddMyeongsik);

  const addGate = canAddMyeongsik(listLen);
  const locked = !addGate.ok;
  const lockTitle = locked ? addGate.message : "";

  const tryAdd = () => {
    if (locked) {
      toast(lockTitle || "명식 추가 불가 🔒");
      return;
    }
    onAddNew();
  };

  return (
    <div className="flex justify-between items-center w-full h-12 desk:h-16 p-4 border-b border-neutral-200 dark:border-neutral-800">
      <h2 className="text-lg font-bold">명식 리스트</h2>
      <div className="flex items-center gap-2">
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
          <Plus size={16} /> 명식추가 {locked ? "🔒" : ""}
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
