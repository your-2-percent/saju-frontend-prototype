// components/AuthStatus.tsx
"use client";

import type { FC } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseClient } from "@/lib/supabaseClient";

interface AuthStatusProps {
  email: string;
}

const AuthStatus: FC<AuthStatusProps> = ({ email }) => {
  const router = useRouter();
  const supabase = useSupabaseClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="text-neutral-600">{email}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-md border px-3 py-1 text-xs"
      >
        로그아웃
      </button>
    </div>
  );
};

export default AuthStatus;
