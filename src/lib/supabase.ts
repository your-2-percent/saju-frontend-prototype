import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,

      // 🔥 GitHub Pages 필수: 쿠키 대신 localStorage 사용
      storage: localStorage,
    },
  }
);


// DEV 환경: 브라우저 콘솔에서 __supabase 로 접근 가능
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).__supabase = supabase;
}
