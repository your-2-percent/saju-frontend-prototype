import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useAuthUserId() {
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!alive) return;
      setAuthUserId(data.user?.id ?? null);
    });
    return () => {
      alive = false;
    };
  }, []);

  return authUserId;
}
