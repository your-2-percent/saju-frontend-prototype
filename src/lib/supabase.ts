// lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// .env (또는 .env.local)에 아래 두 개 필요:
// VITE_SUPABASE_URL=...
// VITE_SUPABASE_ANON_KEY=...
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase 환경변수가 설정되어 있지 않습니다.");
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);
