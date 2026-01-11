import { LogIn } from "lucide-react";
import { useLoginNudgeStore } from "@/auth/input/loginNudgeStore";

export default function LoginInlineNudge() {
  const openWith = useLoginNudgeStore((s) => s.openWith);

  return (
    <div className="max-w-[640px] mx-auto px-3">
      <div className="rounded-xl border border-amber-300/60 bg-amber-50 text-amber-950
                      dark:border-amber-500/30 dark:bg-amber-950/30 dark:text-amber-100
                      shadow-sm px-4 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">
            지금은 게스트 저장 중이에요
          </div>
          <div className="text-xs opacity-90 mt-0.5 leading-relaxed">
            로그인하면 새로고침/기기 변경해도 명식이 유지됩니다.
          </div>
        </div>

        <button
          type="button"
          onClick={() => openWith("PERSIST_SAVE")}
          className="shrink-0 inline-flex items-center gap-1.5
                     px-3 py-2 rounded-lg text-xs font-semibold
                     bg-amber-500 hover:bg-amber-600 text-white
                     border border-amber-600/30
                     cursor-pointer"
          aria-label="로그인하기"
          title="로그인"
        >
          <LogIn size={16} />
          로그인
        </button>
      </div>
    </div>
  );
}
