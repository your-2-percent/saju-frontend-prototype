import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("로그인 처리 중...");

  useEffect(() => {
    const run = async () => {
      try {
        const sp = new URLSearchParams(location.search);

        const error = sp.get("error");
        const errorDesc = sp.get("error_description");
        if (error) {
          setMsg(`로그인 실패: ${decodeURIComponent(errorDesc ?? error)}`);
          // 로그인 페이지로 보내고 싶으면 여기서 navigate("/"); 같은 처리
          return;
        }

        // detectSessionInUrl: true 환경에서는 Supabase가 자동 교환 처리함
        navigate("/", { replace: true });
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "알 수 없는 오류");
      }
    };

    void run();
  }, [location.search, navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-neutral-500">{msg}</p>
    </main>
  );
}
