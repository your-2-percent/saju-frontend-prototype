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

    const init = async () => {
      const { data, error } = await client.auth.getSession();

      if (error) {
        setIsLoggedIn(false);
        setUserId(null);
        setAuthChecked(true);
        return;
      }

      const userId = data.session?.user?.id ?? null;
      setIsLoggedIn(!!data.session);
      setUserId(userId);
      setAuthChecked(true);
    };

    void init();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setIsLoggedIn(!!session);
      setUserId(nextUserId);
      setAuthChecked(true);

      if (!session) {
        void useMyeongSikStore.getState().stopRealtime();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setAuthChecked, setIsLoggedIn, setUserId]);
}
