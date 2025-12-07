"use client";

import { supabase } from "@/lib/supabase";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";

export default function LoginPage() {
  const [showBg, setShowBg] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showCard, setShowCard] = useState(false);

  const [policyOpen, setPolicyOpen] = useState(false);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
    setTimeout(() => setShowBg(true), 50);
    setTimeout(() => setShowTitle(true), 250);
    setTimeout(() => setShowCard(true), 450);
  }, []);

  const handleGoogleLogin = async () => {
    if (!agree) {
      toast.error("개인정보 처리방침에 동의를 하셔야\n시작하실 수 있습니다.");
      return;
    }

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error("Google Login Error:", error);
      alert("로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <main
      className={`flex min-h-screen items-center justify-center bg-neutral-950 text-white px-4 transition-opacity duration-500 ${
        showBg ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* 상단 타이틀 */}
      <div
        className={`transform transition-all duration-500 ${
          showTitle ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        } absolute top-16 text-center`}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-1">화림만세력</h1>
        <p className="text-sm text-neutral-400">오늘도 편안한 하루 되세요 🌿</p>
      </div>

      {/* 로그인 카드 */}
      <div
        className={`w-full max-w-sm rounded-2xl bg-neutral-900 p-8 shadow-xl border border-neutral-800 transition-all duration-500 ${
          showCard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-center">
          로그인
        </h1>

        <p className="mb-6 text-sm text-neutral-400 text-center leading-relaxed">
          화림만세력에 방문해주셔서 감사합니다.  
          <br />로그인을 위해 아래 내용을 확인해주세요 🌿
        </p>

        {/* 개인정보 처리방침 동의 */}
        <div className="mb-5 space-y-2">
          <label className="flex items-start gap-2 text-sm text-neutral-300 cursor-pointer">
            <input
              type="checkbox"
              checked={agree}
              onChange={() => setAgree(!agree)}
              className="mt-[2px]"
            />
            <span>
              개인정보 처리방침에 동의합니다.
              <button
                type="button"
                onClick={() => setPolicyOpen(true)}
                className="ml-1 underline text-orange-400 hover:text-orange-300 cursor-pointer"
              >
                (전문 보기)
              </button>
            </span>
          </label>
        </div>

        {/* 구글 로그인 버튼 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          aria-disabled={!agree}
          className={`flex items-center justify-center gap-3 w-full py-3 rounded-lg font-medium text-sm shadow transition-all 
            ${
              agree
                ? "bg-white text-black hover:bg-neutral-100 active:scale-[0.98] cursor-pointer"
                : "bg-neutral-700 text-neutral-400 cursor-pointer"
            }`}
        >
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google Logo"
            className="w-5 h-5 opacity-90"
          />
          <span>구글 계정으로 로그인</span>
        </button>
      </div>

      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />

      {/* 개인정보 처리방침 모달 */}
      {policyOpen && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setPolicyOpen(false)}
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
              onClick={() => setPolicyOpen(false)}
              className="mt-4 w-full py-2 bg-neutral-900 dark:bg-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
