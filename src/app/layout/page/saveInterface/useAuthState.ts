import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useMyeongSikStore } from "@/myeongsik/input/useMyeongSikStore";

type UseAuthStateArgs = {
  setUserId: (next: string | null) => void;
  setIsLoggedIn: (next: boolean) => void;
  setAuthChecked: (next: boolean) => void;
};

export function useAuthState({
  setUserId,
  setIsLoggedIn,
  setAuthChecked,
}: UseAuthStateArgs) {
  useEffect(() => {
    const client = supabase;
    let authCheckedSet = false;
    let settleTimer: number | null = null;

    const applySession = (session: { user?: { id?: string } } | null) => {
      const nextUserId = session?.user?.id ?? null;
      setIsLoggedIn(!!session);
      setUserId(nextUserId);
    };

    const finalizeAuth = (session: { user?: { id?: string } } | null) => {
      applySession(session);
      if (!authCheckedSet) {
        authCheckedSet = true;
        setAuthChecked(true);
      }
    };

    const init = async () => {
      const { data, error } = await client.auth.getSession();

      if (error) {
        finalizeAuth(null);
        return;
      }

      if (data.session) {
        finalizeAuth(data.session);
        return;
      }

      // Give auth state a short window to restore before committing "logged out".
      settleTimer = window.setTimeout(() => finalizeAuth(null), 1200);
    };

    void init();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
        settleTimer = null;
      }

      finalizeAuth(session);

      if (!session) {
        void useMyeongSikStore.getState().stopRealtime();
      }
    });

    return () => {
      if (settleTimer !== null) {
        window.clearTimeout(settleTimer);
      }
      subscription.unsubscribe();
    };
  }, [setAuthChecked, setIsLoggedIn, setUserId]);
}
