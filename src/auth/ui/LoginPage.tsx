"use client";

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

import { supabase } from "@/lib/supabase";

const PROJECT_BASENAME = "/saju-frontend-prototype";

function getAuthRedirectTo() {
  const { origin, hostname, pathname } = window.location;
  const isGitHubPagesHost = /\.github\.io$/i.test(hostname);
  const isProjectPath =
    pathname === PROJECT_BASENAME || pathname.startsWith(PROJECT_BASENAME + "/");
  const basename = isGitHubPagesHost && isProjectPath ? PROJECT_BASENAME : "";

  return `${origin}${basename}/auth/callback`;
}

export default function LoginPage() {
  const [showBg, setShowBg] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [agree, setAgree] = useState(false);

  useEffect(() => {
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
    toast.error("개인정보 처리방침에 동의하셔야 시작하실 수 있습니다.");
    return false;
  };

  const handleGoogleLogin = async () => {
    if (!requireAgreeOrToast()) return;

    const redirectTo = getAuthRedirectTo();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error("Google Login Error:", error);
      toast.error("로그인 중 오류가 발생했습니다.");
      return;
    }

    if (!data?.url) {
      toast.error("로그인 URL 생성에 실패했습니다.");
      return;
    }

    window.location.assign(data.url);
  };

  const handleKakaoLogin = async () => {
    if (!requireAgreeOrToast()) return;

    const redirectTo = getAuthRedirectTo();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      console.error("Kakao Login Error:", error);
      toast.error("로그인 중 오류가 발생했습니다.");
      return;
    }

    if (!data?.url) {
      toast.error("로그인 URL 생성에 실패했습니다.");
      return;
    }

    window.location.assign(data.url);
  };

  return (
    <main
      className={`relative max-h-[70vh] overflow-auto bg-neutral-950 py-6 text-white transition-opacity duration-500 ${
        showBg ? "opacity-100" : "opacity-0"
      }`}
    >
      <header
        className={`mb-8 max-w-[680px] text-center transition-all duration-500 ${
          showTitle ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
        }`}
      >
        <h1 className="mb-2 text-3xl font-bold tracking-tight">화림만세력</h1>

        <p className="text-sm leading-relaxed text-neutral-300">
          사주, 만세력, 궁합, 대운과 세운 흐름을 한 화면에서 정리해 보는 개인 분석 도구입니다.
          <br />
          로그인하면 명식 저장과 불러오기 기능을 사용할 수 있습니다.
        </p>
      </header>

      <section
        className={`mx-auto w-full max-w-sm rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-xl transition-all duration-500 ${
          showCard ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
        }`}
        aria-label="로그인"
      >
        <h2 className="mb-2 text-center text-2xl font-bold tracking-tight">로그인</h2>

        <p className="mb-5 text-center text-sm leading-relaxed text-neutral-400">
          화림만세력에 방문해 주셔서 감사합니다.
          <br />
          아래 동의 후 로그인해 주세요.
        </p>

        <div className="mb-5 space-y-2">
          <label className="flex cursor-pointer items-start gap-2 text-sm text-neutral-300">
            <input
              type="checkbox"
              checked={agree}
              onChange={() => setAgree(!agree)}
              className="mt-[2px]"
            />
            <span>
              개인정보 처리방침에 동의합니다.
              <Link
                to="/privacy"
                target="_blank"
                rel="noreferrer"
                className="ml-1 underline text-orange-400 hover:text-orange-300"
              >
                (전문 보기)
              </Link>
            </span>
          </label>

          <p className="text-xs leading-relaxed text-neutral-500">
            이용 전{" "}
            <Link
              to="/terms"
              target="_blank"
              rel="noreferrer"
              className="underline text-neutral-300 hover:text-orange-300"
            >
              서비스 이용약관
            </Link>
            도 함께 확인해 주세요.
          </p>
        </div>

        <div className="space-y-2">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={!agree}
            aria-disabled={!agree}
            className={`flex w-full items-center justify-center gap-3 rounded-lg py-3 text-sm font-medium shadow transition-all ${
              agree
                ? "cursor-pointer bg-white text-black hover:bg-neutral-100 active:scale-[0.98]"
                : "cursor-not-allowed bg-neutral-700 text-neutral-400"
            }`}
          >
            <img
              src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
              alt="Google Logo"
              className="h-5 w-5 opacity-90"
            />
            <span>Google 계정으로 로그인</span>
          </button>

          <button
            type="button"
            onClick={handleKakaoLogin}
            disabled={!agree}
            aria-disabled={!agree}
            className={`flex w-full items-center justify-center gap-3 rounded-lg py-3 text-sm font-medium shadow transition-all ${
              agree
                ? "cursor-pointer bg-[#FEE500] text-black hover:brightness-95 active:scale-[0.98]"
                : "cursor-not-allowed bg-neutral-700 text-neutral-400"
            }`}
          >
            <img src="/icons/KakaoTalk_logo.png" alt="KakaoTalk" className="h-5" />
            <span>카카오로 로그인</span>
          </button>
        </div>

        <div className="mt-6 border-t border-neutral-800 pt-4 text-xs leading-relaxed text-neutral-400">
          <p className="mb-2 font-semibold text-neutral-300">로그인하면 사용할 수 있는 기능</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>사주 원국, 대운, 세운과 월운 기록 보기</li>
            <li>명식 저장 및 폴더 정리</li>
            <li>궁합 및 비교 기능 이용</li>
          </ul>

          <p className="mt-3 text-[11px] text-neutral-500">
            문의: unique950318@gmail.com 및 카카오톡 스팀채팅
          </p>
        </div>
      </section>

      <Toaster position="top-center" toastOptions={{ duration: 2000 }} />
    </main>
  );
}
