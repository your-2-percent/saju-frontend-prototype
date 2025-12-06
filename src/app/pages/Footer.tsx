// app/components/Footer.tsx
"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Footer() {
  const [openPolicy, setOpenPolicy] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);

  // 🔥 탈퇴 실행 함수
  const handleDeleteAccount = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("로그인 정보가 없습니다.");
        return;
      }

      const userId = user.id;

      // DB 삭제
      await supabase.from("profiles").delete().eq("id", userId);
      await supabase.from("myeongsik").delete().eq("user_id", userId);

      // 계정 삭제 (admin API 불가할 경우 오류 가능)
      await supabase.auth.admin.deleteUser(userId);

      await supabase.auth.signOut();

      alert("탈퇴가 완료되었습니다.");
      window.location.href = "/";

    } catch (e) {
      console.error(e);
      alert("탈퇴 중 오류가 발생했습니다.");
    }
  };

  return (
    <>
      <footer className="py-8 px-4 border-t border-neutral-200 dark:border-neutral-700">
        <div className="text-center text-[12px] text-orange-600 dark:text-orange-300">
          Copyright © 2025 Hwarim96. All rights reserved.
        </div>

        {/* 버튼 영역 */}
        <div className="flex flex-col items-center gap-2 mt-3">

          {/* 개인정보 처리방침 */}
          <button
            onClick={() => setOpenPolicy(true)}
            className="text-[12px] text-neutral-500 dark:text-neutral-300 underline cursor-pointer hover:text-orange-500 transition"
          >
            개인정보 처리방침
          </button>

          {/* 🔥 탈퇴하기 버튼 */}
          <button
            onClick={() => setOpenDelete(true)}
            className="text-[12px] text-red-500 underline hover:text-red-400 transition cursor-pointer"
          >
            탈퇴하기
          </button>
        </div>
      </footer>

      {/* ========== 개인정보 처리방침 모달 ========== */}
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
                화림만세력(이하 ‘서비스’)은 사용자의 개인정보를 매우 소중히
                여기며, 아래와 같은 목적과 방식으로 개인정보를 처리합니다.
              </p>

              <p className="font-semibold mt-4 mb-1">1. 수집 항목</p>
              <p className="mb-2">
                · 구글 로그인 이메일, 프로필 정보(이름, 프로필 이미지)  
                · 서비스 이용 과정에서 자동 생성되는 로그 정보(사용 기록, 디바이스 정보)
              </p>

              <p className="font-semibold mt-4 mb-1">2. 수집 목적</p>
              <p className="mb-2">
                · 사용자 계정 인증 및 로그인  
                · 개인 맞춤형 명식 저장 기능 제공  
                · 서비스 품질 개선 및 안정성 확보
              </p>

              <p className="font-semibold mt-4 mb-1">3. 보관 기간</p>
              <p className="mb-2">
                · 탈퇴 요청 시 즉시 삭제  
                · 법령에 따른 데이터 보관 의무가 있는 경우 해당 기간 동안 보관
              </p>

              <p className="font-semibold mt-4 mb-1">4. 제3자 제공</p>
              <p className="mb-2">
                · 본 서비스는 사용자의 동의 없이는 어떠한 개인정보도 외부에 제공하지 않습니다.
              </p>

              <p className="font-semibold mt-4 mb-1">5. 보안</p>
              <p className="mb-2">
                · Supabase 인증 및 데이터베이스 암호화 기준을 준수하여 정보를 보호합니다.
              </p>

              <p className="font-semibold mt-4 mb-1">6. 문의</p>
              <p>· 개인정보 관련 문의: unique950318@gmail.com</p>
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

      {/* ========== 🔥 탈퇴 확인 모달 ========== */}
      {openDelete && (
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
              탈퇴 시 계정 및 저장된 모든 명식 데이터가 영구적으로 삭제됩니다.
              <br />
              삭제된 데이터는 복구할 수 없습니다.
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
