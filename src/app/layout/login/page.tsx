// app/pages/LoginPage.tsx
import { useState } from "react";
import { supabase } from "@/lib/supabase";

interface LoginPageProps {
  onLoginSuccess: () => void;
}

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // ✅ 이메일/비번 로그인
  const handleLogin = async () => {
    setErrorMsg("");
    setPending(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setPending(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    if (data.user) {
      onLoginSuccess();
    }
  };

  // ✅ 구글 로그인
  const handleGoogleLogin = async () => {
    setErrorMsg("");

    // 브라우저 환경 가드 (SSR 방지용)
    if (typeof window === "undefined") return;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // 로그인 완료 후 돌아올 주소
        // 개발 중이면 보통 http://localhost:5173 (window.location.origin)
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setErrorMsg(error.message);
    }

    // 여기서 따로 onLoginSuccess() 안 불러도 됨.
    // 구글 → Supabase → redirectTo 순서로 새로고침 되면서
    // Page.tsx의 useEffect가 다시 getUser() 해서 isLoggedIn=true로 바꿔줄 거라서.
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-100">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
        <h1 className="mb-4 text-lg font-bold">로그인</h1>

        {/* 이메일/비번 로그인 영역 */}
        <label className="mb-2 block text-sm text-neutral-600">
          이메일
          <input
            type="email"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </label>

        <label className="mb-4 block text-sm text-neutral-600">
          비밀번호
          <input
            type="password"
            className="mt-1 w-full rounded border px-2 py-1 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        {errorMsg && (
          <p className="mb-2 text-sm text-red-500">
            {errorMsg}
          </p>
        )}

        <button
          type="button"
          onClick={handleLogin}
          disabled={pending}
          className="mb-3 w-full rounded-md bg-black py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "로그인 중..." : "이메일로 로그인"}
        </button>

        {/* 구글 로그인 버튼 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full rounded-md border border-neutral-300 py-2 text-sm font-medium text-neutral-800 bg-white"
        >
          구글 계정으로 로그인
        </button>
      </div>
    </main>
  );
}
