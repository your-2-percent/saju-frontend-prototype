// env.d.ts

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_ADMIN_UUIDS?: string;
  readonly VITE_USE_SORT_ORDER?: string;
  // 필요하면 추가 VITE_ 변수 여기 선언
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
