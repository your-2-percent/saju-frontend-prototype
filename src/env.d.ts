// env.d.ts

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_USE_SORT_ORDER?: string;
// 필요하면 다른 VITE_ 변수들도 여기 계속 추가하면 됨
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
