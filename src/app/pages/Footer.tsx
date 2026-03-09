"use client";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import LegacyMigrateModal from "@/app/pages/LegacyMigrateModal";
import { useAuthUserId } from "@/auth/input/useAuthUserId";
import { supabase } from "@/lib/supabase";

const footerLinkClass =
  "text-[12px] text-neutral-500 transition hover:text-orange-500 dark:text-neutral-400 dark:hover:text-orange-300";

const subtleButtonClass =
  "inline-flex items-center rounded-full border border-neutral-200 px-3 py-1.5 text-[12px] font-medium text-neutral-600 transition hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-orange-500/50 dark:hover:text-orange-300";

const guideButtonClass =
  "inline-flex items-center rounded-full bg-orange-500 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-orange-600";

export default function Footer() {
  const [openDelete, setOpenDelete] = useState(false);
  const [openMigrate, setOpenMigrate] = useState(false);
  const userId = useAuthUserId();
  const isLoggedIn = !!userId;
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인 정보를 다시 확인해 주세요.");
        return;
      }

      const deletedAt = new Date().toISOString();

      await supabase.from("profiles").update({ disabled_at: deletedAt }).eq("id", user.id);
      await supabase.from("myeongsik").update({ deleted_at: deletedAt }).eq("user_id", user.id);

      await supabase.auth.signOut();
      alert("회원탈퇴 처리가 완료되었습니다. 복구가 필요하면 문의해 주세요.");
      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
      alert("회원탈퇴 처리 중 문제가 발생했습니다.");
    }
  };

  return (
    <>
      <footer className="border-t border-neutral-200 bg-neutral-50/70 px-4 py-7 pb-[calc(64px+env(safe-area-inset-bottom,0px)+var(--bottom-dock,0px))] dark:border-neutral-800 dark:bg-neutral-950/70">
        <div className="mx-auto max-w-[900px] space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <p className="text-sm font-semibold tracking-tight text-neutral-800 dark:text-neutral-100">
                화림만세력
              </p>
              <p className="text-[12px] leading-6 text-neutral-500 dark:text-neutral-400">
                사주 명식, 사주노트, 주역·육효점을 한곳에서 볼 수 있는 서비스를 제공합니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link to="/guide" className={guideButtonClass}>
                사이트 가이드
              </Link>
              <button
                type="button"
                onClick={() => setOpenMigrate(true)}
                className={`${subtleButtonClass} cursor-pointer`}
              >
                명식 이관하기
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-neutral-200/80 pt-4 dark:border-neutral-800">
            <Link to="/saju-note" className={footerLinkClass}>
              사주노트
            </Link>
            <Link to="/iching" className={footerLinkClass}>
              주역 · 육효점
            </Link>
            <Link to="/faq" className={footerLinkClass}>
              FAQ
            </Link>
            <Link to="/terms" className={footerLinkClass}>
              서비스 이용약관
            </Link>
            <Link to="/privacy" className={footerLinkClass}>
              개인정보 처리방침
            </Link>
            {isLoggedIn && (
              <button
                type="button"
                onClick={() => setOpenDelete(true)}
                className="text-[12px] text-red-500 transition hover:text-red-400 cursor-pointer"
              >
                회원탈퇴
              </button>
            )}
          </div>

          <div className="flex flex-col gap-1 text-[12px] text-neutral-400 dark:text-neutral-500 sm:flex-row sm:items-center sm:justify-between">
            <p>결과는 참고용이며, 실제 판단은 이용자 본인의 책임입니다.</p>
            <p>Copyright &copy; 2025 Hwarim96. All rights reserved.</p>
          </div>
        </div>
      </footer>

      <LegacyMigrateModal open={openMigrate} onClose={() => setOpenMigrate(false)} />

      {isLoggedIn && openDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setOpenDelete(false)}
        >
          <div
            className="relative w-full max-w-sm rounded-xl bg-white p-6 text-neutral-900 shadow-xl animate-fadeInUp dark:bg-neutral-900 dark:text-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-bold text-red-500">정말 탈퇴하시겠습니까?</h2>

            <p className="mb-6 text-sm leading-relaxed">
              탈퇴 시 계정과 연결된 모든 명식 데이터가 비활성화됩니다.
              <br />
              관리자 문의를 통해 복구를 요청할 수는 있습니다.
            </p>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setOpenDelete(false)}
                className="flex-1 rounded-lg bg-neutral-300 py-2 text-black transition hover:bg-neutral-400 dark:bg-neutral-700 dark:text-white cursor-pointer"
              >
                취소
              </button>

              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 rounded-lg bg-red-600 py-2 text-white transition hover:bg-red-700 cursor-pointer"
              >
                탈퇴하기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
