import { useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useLoginNudgeStore } from "@/shared/auth/loginNudgeStore";

// 로그인 UI는 기존 페이지를 그대로 재사용(일단 가장 안전)
import LoginPage from "@/app/layout/login/page";

import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { useSettingsStore } from "@/shared/lib/hooks/useSettingsStore";
import { useMyeongSikStore } from "@/shared/lib/hooks/useMyeongSikStore";

function titleByReason(reason: string): string {
  switch (reason) {
    case "PERSIST_SAVE":
      return "로그인하고 더 많은 기기와 공유해보세요!";
    case "ADD_LIMIT":
      return "로그인하고 더 많은 기기와 공유해보세요!";
    case "HEADER":
      return "로그인";
    default:
      return "로그인";
  }
}

export default function LoginNudgeModal() {
  const open = useLoginNudgeStore((s) => s.open);
  const reason = useLoginNudgeStore((s) => s.reason);
  const close = useLoginNudgeStore((s) => s.close);

  const title = useMemo(() => titleByReason(reason), [reason]);

  // ESC로 닫기
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // ✅ 로그인 성공하면: 모달 닫고 스토어들 새로고침
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) {
        // 로그인 직후: 권한/설정/명식 다시 로드
        void useEntitlementsStore.getState().loadFromServer();
        void useSettingsStore.getState().loadFromServer();
        void useMyeongSikStore.getState().loadFromServer();

        useLoginNudgeStore.getState().close();
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4"
      onClick={close}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-[520px] rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {title}
          </div>

          {/* ✅ 닫기 버튼 */}
          <button
            type="button"
            onClick={close}
            className="w-8 h-8 rounded-full flex items-center justify-center
                       bg-neutral-100 hover:bg-neutral-200
                       dark:bg-neutral-800 dark:hover:bg-neutral-700
                       text-neutral-700 dark:text-neutral-200 cursor-pointer"
            aria-label="닫기"
            title="닫기"
          >
            ×
          </button>
        </div>

        {/* 내용 */}
        <div className="p-4">
          {/* LoginPage가 풀스크린 스타일이면 좀 커보일 수 있음. 일단 기능부터 살리고, 스타일은 너가 다듬자 ㅋㅋ */}
          <LoginPage />
        </div>
      </div>
    </div>
  );
}
