import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";

const VISITOR_KEY = "hwarim_visitor_id";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

// /admin/* 경로는 추적 제외
function shouldTrack(path: string): boolean {
  return !path.startsWith("/admin") && !path.startsWith("/auth") && !path.startsWith("/impersonate");
}

export function usePageViewTracker() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (!shouldTrack(pathname)) return;

    const visitorId = getVisitorId();
    const referrer = document.referrer || null;

    supabase.auth.getUser().then(({ data }) => {
      void supabase.from("page_views").insert({
        path: pathname,
        visitor_id: visitorId,
        user_id: data.user?.id ?? null,
        referrer,
      });
    });
  }, [pathname]);
}
