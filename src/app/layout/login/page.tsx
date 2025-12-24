// src/app/layout/login/page.tsx
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
    // ✅ 브라우저 탭 제목(검색엔 index.html이 더 중요하지만, UX/공유엔 도움이 됨)
    document.title = "화림만세력 - 사주/만세력/궁합";

    const t1 = window.setTimeout(() => setShowBg(true), 50);
    const t2 = window.setTimeout(() => setShowTitle(true), 250);
    const t3 = window.setTimeout(() => setShowCard(true), 450);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, []);

  const requireAgreeOrToast = (): boolean => {
    if (agree) return true;
    toast.error("개인정보 처리방침에 동의를 하셔야\n시작하실 수 있습니다.");
    return false;
  };

  const handleGoogleLogin = async () => {
    if (!requireAgreeOrToast()) return;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error("Google Login Error:", error);
      toast.error("로그인 중 오류가 발생했습니다.");
    }
  };

  const handleKakaoLogin = async () => {
    if (!requireAgreeOrToast()) return;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      console.error("Kakao Login Error:", error);
      toast.error("로그인 중 오류가 발생했습니다.");
    }
  };

  return (
    <main
      className={`relative py-6 max-h-[70vh] overflow-auto bg-neutral-950 text-white transition-opacity duration-500 ${
        showBg ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* ✅ 상단 타이틀 (H1은 여기 하나만) */}
      <header
        className={`transform transition-all duration-500 mb-8 ${
          showTitle ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        } text-center max-w-[680px]`}
      >
        <h1 className="text-3xl font-bold tracking-tight mb-2">화림만세력</h1>

        {/* ✅ 검색 키워드가 실제 텍스트로 들어가게 */}
        <p className="text-sm text-neutral-300 leading-relaxed">
          사주 · 만세력 · 궁합 · 대운/세운 흐름을 한 화면에서 보는 개인용 분석 도구.
          <br />
          로그인 후 명식 저장/관리 기능을 사용할 수 있어요 🌿
        </p>
      </header>

      {/* 로그인 카드 */}
      <section
        className={`w-full max-w-sm mx-auto rounded-2xl bg-neutral-900 p-4 shadow-xl border border-neutral-800 transition-all duration-500 ${
          showCard ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
        aria-label="로그인"
      >
        {/* ✅ H1 중복 방지: 카드 제목은 H2 */}
        <h2 className="mb-2 text-2xl font-bold tracking-tight text-center">로그인</h2>

        <p className="mb-5 text-sm text-neutral-400 text-center leading-relaxed">
          화림만세력에 방문해주셔서 감사합니다.
          <br />
          아래 약관 동의 후 로그인해 주세요 🌿
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

        <div className="space-y-2">
          {/* 구글 로그인 버튼 */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={!agree}
            aria-disabled={!agree}
            className={`flex items-center justify-center gap-3 w-full py-3 rounded-lg font-medium text-sm shadow transition-all 
              ${
                agree
                  ? "bg-white text-black hover:bg-neutral-100 active:scale-[0.98] cursor-pointer"
                  : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
              }`}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google Logo"
              className="w-5 h-5 opacity-90"
            />
            <span>구글 계정으로 로그인</span>
          </button>

          {/* 카카오 로그인 버튼 */}
          <button
            type="button"
            onClick={handleKakaoLogin}
            disabled={!agree}
            aria-disabled={!agree}
            className={`flex items-center justify-center gap-3 w-full py-3 rounded-lg font-medium text-sm shadow transition-all
              ${
                agree
                  ? "bg-[#FEE500] text-black hover:brightness-95 active:scale-[0.98] cursor-pointer"
                  : "bg-neutral-700 text-neutral-400 cursor-not-allowed"
              }`}
          >
            <img src="/icons/KakaoTalk_logo.png" alt="KakaoTalk" className="h-5" />
            <span>카카오로 로그인</span>
          </button>
        </div>

        {/* ✅ 로그인 아래에 “텍스트 콘텐츠” 조금 더(검색/심사에 도움) */}
        <div className="mt-6 border-t border-neutral-800 pt-4 text-xs text-neutral-400 leading-relaxed">
          <p className="font-semibold text-neutral-300 mb-2">화림만세력에서 할 수 있는 것</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>사주 원국/대운·세운·월운 흐름 보기</li>
            <li>명식 저장 및 폴더 정리</li>
            <li>궁합/비교 보기(기능 제공 시)</li>
          </ul>

          <p className="mt-3 text-[11px] text-neutral-500">
            문의: unique950318@gmail.com 및 카카오톡 오픈채팅
          </p>
        </div>
      </section>

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
            <h3 className="text-lg font-bold mb-4">개인정보 처리방침</h3>

            <div className="text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
              <p className="mb-2">
                화림만세력(이하 ‘서비스’)은 사용자의 개인정보를 매우 소중히 여기며, 아래와 같은 목적과
                방식으로 개인정보를 처리합니다.
              </p>

              <p className="font-semibold mt-4 mb-1">1. 수집 항목</p>
              <p className="mb-2">
                · 구글 로그인 이메일, 프로필 정보(이름, 프로필 이미지)
                <br />· 서비스 이용 과정에서 자동 생성되는 로그 정보(사용 기록, 디바이스 정보)
              </p>

              <p className="font-semibold mt-4 mb-1">2. 수집 목적</p>
              <p className="mb-2">
                · 사용자 계정 인증 및 로그인
                <br />· 개인 맞춤형 명식 저장 기능 제공
                <br />· 서비스 품질 개선 및 안정성 확보
              </p>

              <p className="font-semibold mt-4 mb-1">3. 보관 기간</p>
              <p className="mb-2">
                · 탈퇴 요청 시 즉시 삭제
                <br />· 법령에 따른 데이터 보관 의무가 있는 경우 해당 기간 동안 보관
              </p>

              <p className="font-semibold mt-4 mb-1">4. 제3자 제공</p>
              <p className="mb-2">· 본 서비스는 사용자의 동의 없이는 어떠한 개인정보도 외부에 제공하지 않습니다.</p>

              <p className="font-semibold mt-4 mb-1">5. 보안</p>
              <p className="mb-2">· Supabase 인증 및 데이터베이스 암호화 기준을 준수하여 정보를 보호합니다.</p>

              <p className="font-semibold mt-4 mb-1">6. 문의</p>
              <p>· 개인정보 관련 문의: unique950318@gmail.com</p>
            </div>

            <button
              onClick={() => setPolicyOpen(false)}
              className="mt-4 w-full py-2 bg-neutral-900 dark:bg-neutral-700 text-white rounded-lg hover:bg-neutral-800 transition cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
