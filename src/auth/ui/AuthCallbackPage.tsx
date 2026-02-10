import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";

export default function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const didExchange = useRef(false);
  const [msg, setMsg] = useState("로그인 처리 중...");

  useEffect(() => {
    const run = async () => {
      try {
        console.log("[auth-callback] search =", location.search);
        console.log("[auth-callback] hash =", location.hash);
        const sp = new URLSearchParams(location.search);
        const rawHash = location.hash.startsWith("#")
          ? location.hash.slice(1)
          : location.hash;
        const hashQueryIndex = rawHash.indexOf("?");
        const hashParams = new URLSearchParams(
          hashQueryIndex >= 0 ? rawHash.slice(hashQueryIndex + 1) : rawHash
        );

        const getParam = (key: string) => sp.get(key) ?? hashParams.get(key);

        const error = getParam("error");
        const errorDesc = getParam("error_description");
        if (error) {
          setMsg(`로그인 실패: ${decodeURIComponent(errorDesc ?? error)}`);
          // 로그인 페이지로 보내고 싶으면 여기서 navigate("/"); 같은 처리
          return;
        }

        const code = getParam("code");
        if (!code) {
          const accessToken = getParam("access_token");
          const refreshToken = getParam("refresh_token");
          if (!accessToken || !refreshToken) {
            setMsg("콜백 code가 없어요. (redirectTo/PKCE 설정 확인)");
            return;
          }

          const { error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (setErr) {
            setMsg(`세션 설정 실패: ${setErr.message}`);
            return;
          }

          navigate("/", { replace: true });
          return;
        }

        if (didExchange.current) {
          return;
        }
        didExchange.current = true;

        const {
          data: { session: preSession },
        } = await supabase.auth.getSession();
        if (preSession) {
          navigate("/", { replace: true });
          return;
        }

        const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
        if (exErr) {
          const {
            data: { session: postSession },
          } = await supabase.auth.getSession();
          if (postSession) {
            navigate("/", { replace: true });
            return;
          }
          setMsg(`세션 교환 실패: ${exErr.message}`);
          return;
        }

        // ✅ 깔끔하게 홈으로
        navigate("/", { replace: true });
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "알 수 없는 오류");
      }
    };

    void run();
  }, [location.search, navigate, location.hash]);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <p className="text-sm text-neutral-500">{msg}</p>
    </main>
  );
}
