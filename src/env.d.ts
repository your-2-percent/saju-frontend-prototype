/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_IMPERSONATE_API?: string;
  readonly NEXT_PUBLIC_FUNCTION_IMPERSONATE_URL?: string;
  readonly NEXT_PUBLIC_IMPERSONATE_API?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
