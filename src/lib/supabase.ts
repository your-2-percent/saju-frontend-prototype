import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const DETECT_SESSION_IN_URL = import.meta.env.DEV ? true : false;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    // Use PKCE so OAuth callbacks can exchange the auth code reliably.
    flowType: "pkce",

    persistSession: true,
    autoRefreshToken: true,

    // Let Supabase read the callback code from the current URL in development.
    detectSessionInUrl: DETECT_SESSION_IN_URL,

    // Persist the session in localStorage across refreshes.
    storage: localStorage,
  },
});
