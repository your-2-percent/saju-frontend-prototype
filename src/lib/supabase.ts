// lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

export function getSupabaseClient() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (typeof window !== "undefined") {
      console.error("Supabase 환경변수가 브라우저에서 누락되었습니다.");
    }
  }

  return createClient(supabaseUrl!, supabaseAnonKey!);
}

export const supabase = getSupabaseClient();
