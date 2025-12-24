// src/app/components/KakaoLoginButton.tsx
import { useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Props = {
  redirectPath?: string; // 기본: /auth/callback
  className?: string;
  children?: React.ReactNode;
};

export default function KakaoLoginButton({
  redirectPath = "/auth/callback",
  className,
  children,
}: Props) {
  const onClick = useCallback(async () => {
    const redirectTo = `${window.location.origin}${redirectPath}`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo },
    });

    if (error) {
      // 여기서 toast 쓰고 싶으면 toast.error(error.message)로 바꾸면 됨
      console.error("[auth] kakao oauth error:", error);
      alert(error.message);
    }
  }, [redirectPath]);

  return (
    <button
      type="button"
      onClick={onClick}
      className={className ?? "px-4 py-2 rounded bg-yellow-400 text-black font-bold"}
    >
      {children ?? "카카오로 로그인"}
    </button>
  );
}
