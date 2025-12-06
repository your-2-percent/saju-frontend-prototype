// app/login/page.tsx
"use client";

import { useCallback } from "react";
import { useSupabaseClient } from "@/lib/supabaseClient";

export default function LoginPage() {
  const supabase = useSupabaseClient();

  const handleLogin = useCallback(async () => {
    const origin =
      typeof window === "undefined" ? "" : window.location.origin;

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/api/auth/callback?next=/dashboard`,
      },
    });
  }, [supabase]);

  return (
    <main className="flex h-screen items-center justify-center">
      <button
        type="button"
        onClick={handleLogin}
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white"
      >
        Google 계정으로 로그인
      </button>
    </main>
  );
}
