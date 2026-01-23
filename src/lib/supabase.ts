import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // ✅ 핵심: HashRouter + OAuth면 PKCE로 고정해야 함
    flowType: "pkce",

    persistSession: true,
    autoRefreshToken: true,

    // ✅ PKCE에서 콜백 URL에 code 붙는 걸 처리하려면 true 유지
    detectSessionInUrl: true,

    // ✅ GitHub Pages 환경에서도 localStorage로 세션 유지
    storage: localStorage,
  },
});
