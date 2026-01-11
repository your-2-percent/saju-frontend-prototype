import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useAuthUserId(): string | null {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!alive) return;
      setUserId(data.session?.user?.id ?? null);
    })();

    const { data } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!alive) return;
      setUserId(session?.user?.id ?? null);
    });

    return () => {
      alive = false;
      data.subscription.unsubscribe();
    };
  }, []);

  return userId;
}
