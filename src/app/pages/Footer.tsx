"use client";

import { useState } from "react";
import { Link } from "react-router-dom";

import { useAuthUserId } from "@/auth/input/useAuthUserId";
import LegacyMigrateModal from "@/app/pages/LegacyMigrateModal";
import { supabase } from "@/lib/supabase";

const linkClass =
  "text-[12px] text-neutral-500 underline transition hover:text-orange-500 dark:text-neutral-300";

export default function Footer() {
  const [openDelete, setOpenDelete] = useState(false);
  const [openMigrate, setOpenMigrate] = useState(false);
  const userId = useAuthUserId();
  const isLoggedIn = !!userId;

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
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("회원탈퇴 처리 중 문제가 발생했습니다.");
    }
  };

  return (
    <>
      <footer className="border-t border-neutral-200 px-4 py-8 pb-[calc(64px+env(safe-area-inset-bottom,0px)+var(--bottom-dock,0px))] dark:border-neutral-700">
        <div className="text-center text-[12px] text-orange-600 dark:text-orange-300">
          Copyright &copy; 2025 Hwarim96. All rights reserved.
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
          <Link to="/saju-note" className={linkClass}>
            사주노트
          </Link>

          <Link to="/terms" className={linkClass}>
            서비스 이용약관
          </Link>

          <Link to="/privacy" className={linkClass}>
            개인정보 처리방침
          </Link>

          <button
            onClick={() => setOpenMigrate(true)}
            className="text-[12px] text-neutral-500 underline transition hover:text-orange-500 dark:text-neutral-300 cursor-pointer"
          >
            명식 이관하기
          </button>

          {isLoggedIn && (
            <button
              onClick={() => setOpenDelete(true)}
              className="text-[12px] text-red-500 underline transition hover:text-red-400 cursor-pointer"
            >
              회원탈퇴
            </button>
          )}
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
                onClick={() => setOpenDelete(false)}
                className="flex-1 rounded-lg bg-neutral-300 py-2 text-black transition hover:bg-neutral-400 dark:bg-neutral-700 dark:text-white cursor-pointer"
              >
                취소
              </button>

              <button
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
