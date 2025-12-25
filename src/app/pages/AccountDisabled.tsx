"use client";

import { useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAccountStatusStore } from "@/shared/lib/hooks/useAccountStatusStore";

function fmt(dt?: string | null): string {
  if (!dt) return "-";
  const t = Date.parse(dt);
  if (!Number.isFinite(t)) return dt;
  return new Date(t).toLocaleString();
}

export default function AccountDisabledPage() {
  const disabledAt = useAccountStatusStore((s) => s.disabledAt);

  const onLogout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      // HashRouter라 새로고침이 제일 확실
      window.location.href = "/";
    } catch (e) {
      console.error("signOut error:", e);
      window.location.href = "/";
    }
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-[520px] bg-neutral-900 border border-neutral-700 rounded-xl p-6">
        <h1 className="text-2xl font-bold mb-3">계정이 비활성화되었습니다</h1>

        <div className="text-sm text-neutral-300 leading-6">
          현재 계정은 관리자에 의해 비활성화 상태라 서비스 이용이 제한됩니다.
          <span className="font-semibold text-neutral-100">{fmt(disabledAt)}</span>
        </div>

        <div className="mt-5 p-3 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-300">
          문의가 필요하면 관리자에게 연락해 주세요.
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded bg-neutral-700 hover:bg-neutral-600 cursor-pointer"
          >
            로그아웃
          </button>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 cursor-pointer"
          >
            새로고침
          </button>
        </div>
      </div>
    </main>
  );
}
