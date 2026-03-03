"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthUserId } from "@/auth/input/useAuthUserId";

export default function Footer() {
  const [openPolicy, setOpenPolicy] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const userId = useAuthUserId();
  const isLoggedIn = !!userId;

  // 계정 탈퇴(소프트 삭제)
  const handleDeleteAccount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인 정보를 확인해 주세요.");
        return;
      }

      const deletedAt = new Date().toISOString();

      await supabase.from("profiles").update({ disabled_at: deletedAt }).eq("id", user.id);
      await supabase.from("myeongsik").update({ deleted_at: deletedAt }).eq("user_id", user.id);

      await supabase.auth.signOut();
      alert("탈퇴 처리되었습니다. 복구가 필요하면 문의해 주세요.");
      window.location.href = "/";
    } catch (e) {
      console.error(e);
      alert("탈퇴 처리 중 문제가 발생했습니다.");
    }
  };

  return (
    <>
      <footer className="py-8 pb-[calc(64px+env(safe-area-inset-bottom,0px)+var(--bottom-dock,0px))] px-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="text-center text-[12px] text-orange-600 dark:text-orange-300">
          Copyright &copy; 2025 Hwarim96. All rights reserved.
        </div>

        <div className="flex justify-center items-center gap-4 mt-3">
          <button
            onClick={() => setOpenPolicy(true)}
            className="text-[12px] text-neutral-500 dark:text-neutral-300 underline cursor-pointer hover:text-orange-500 transition"
          >
            개인정보 처리방침
          </button>

          {isLoggedIn && (
            <button
              onClick={() => setOpenDelete(true)}
              className="text-[12px] text-red-500 underline hover:text-red-400 transition cursor-pointer"
            >
              회원탈퇴
            </button>
          )}
        </div>
      </footer>

      {openPolicy && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpenPolicy(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200 p-6 rounded-xl shadow-xl relative animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">개인정보 처리방침</h2>

            <div className="text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
              <p className="mb-2">
                화림만세력 서비스는 이용자의 개인정보를 중요하게 생각하며, 아래 목적과 방식으로 처리합니다.
              </p>

              <p className="font-semibold mt-4 mb-1">1. 수집 항목</p>
              <p className="mb-2">
                구글/카카오 로그인 정보(이름, 이메일), 서비스 이용 과정에서 생성되는 이용 기록 및 명식 데이터
              </p>

              <p className="font-semibold mt-4 mb-1">2. 수집 목적</p>
              <p className="mb-2">로그인 인증, 명식 저장/조회, 서비스 개선 및 오류 대응</p>

              <p className="font-semibold mt-4 mb-1">3. 보관 기간</p>
              <p className="mb-2">탈퇴 요청 시 비활성화 처리하며, 관련 법령에 따른 보관 의무가 있는 경우 해당 기간 보관</p>

              <p className="font-semibold mt-4 mb-1">4. 제3자 제공</p>
              <p className="mb-2">법령 근거 또는 이용자 동의가 없는 경우 제3자에게 제공하지 않습니다.</p>

              <p className="font-semibold mt-4 mb-1">5. 문의</p>
              <p>개인정보 관련 문의: unique950318@gmail.com</p>
            </div>

            <button
              onClick={() => setOpenPolicy(false)}
              className="cursor-pointer mt-4 w-full py-2 bg-neutral-900 dark:bg-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {isLoggedIn && openDelete && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setOpenDelete(false)}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-200 p-6 rounded-xl shadow-xl relative animate-fadeInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4 text-red-500">정말 탈퇴하시겠습니까?</h2>

            <p className="text-sm leading-relaxed mb-6">
              탈퇴 시 계정과 연결된 모든 명식 데이터가 비활성화됩니다.
              <br />
              관리자 문의를 통해 복구를 요청할 수 있습니다.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setOpenDelete(false)}
                className="cursor-pointer flex-1 py-2 bg-neutral-300 dark:bg-neutral-700 text-black dark:text-white rounded-lg hover:bg-neutral-400 transition"
              >
                취소
              </button>

              <button
                onClick={handleDeleteAccount}
                className="cursor-pointer flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
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

