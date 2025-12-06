// app/pages/LoginPage.tsx
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const handleGoogleLogin = async () => {
    if (typeof window === "undefined") return;

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
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-white px-4">
      <div className="w-full max-w-sm rounded-2xl bg-neutral-900 p-8 shadow-xl border border-neutral-800">
        
        {/* 타이틀 */}
        <h1 className="mb-2 text-2xl font-bold tracking-tight text-white text-center">
          로그인
        </h1>

        {/* 안내 문구 */}
        <p className="mb-6 text-sm text-neutral-400 text-center leading-relaxed">
          화림만세력에 방문해주셔서 감사합니다.  
          <br />오늘도 행복한 하루 되세요 🌿
        </p>

        {/* 구글 로그인 버튼 */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="flex items-center justify-center gap-3 w-full py-3 rounded-lg 
                     bg-white text-black font-medium text-sm shadow 
                     hover:bg-neutral-100 active:scale-[0.98] transition-all cursor-pointer"
        >
          {/* 구글 로고 */}
          <img
            src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
            alt="Google Logo"
            className="w-5 h-5"
          />
          <span>구글 계정으로 로그인</span>
        </button>
      </div>
    </main>
  );
}
