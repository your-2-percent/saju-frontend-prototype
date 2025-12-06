"use client";

import { supabase } from "@/lib/supabase";

export default function LoginButton() {
  const login = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/dashboard` },
    });
  };

  return (
    <button
      onClick={login}
      className="px-4 py-2 bg-black text-white rounded-md"
    >
      Google 로그인
    </button>
  );
}
