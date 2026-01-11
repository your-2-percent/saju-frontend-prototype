// src/shared/auth/LoginModal.tsx
import { useEffect } from "react";
import LoginPage from "@/auth/ui/LoginPage";
import { useLoginUiStore } from "@/auth/input/loginUiStore";

export default function LoginModal() {
  const open = useLoginUiStore((s) => s.open);
  const close = useLoginUiStore((s) => s.close);

  // ✅ 열렸을 때 스크롤 잠금
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ✅ ESC로 닫기
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      {/* 배경 딤 */}
      <div
        className="absolute inset-0 bg-black/60"
        onClick={close}
        aria-hidden="true"
      />

      {/* 로그인 화면 (풀스크린) */}
      <div className="absolute inset-0 bg-white dark:bg-neutral-950 overflow-auto">
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={close}
          className="fixed top-3 right-3 z-[10000] w-10 h-10 rounded-full
                     bg-neutral-900/80 text-white border border-neutral-700
                     flex items-center justify-center hover:bg-neutral-800 cursor-pointer"
          aria-label="로그인 닫기"
          title="닫기"
        >
          ×
        </button>

        <LoginPage />
      </div>
    </div>
  );
}
