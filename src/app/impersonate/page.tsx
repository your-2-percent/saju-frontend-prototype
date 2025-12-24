// src/app/impersonate/page.tsx
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export default function ImpersonateView() {
  const location = useLocation();

  const [userId, setUserId] = useState<string | null>(null);
  const [myeongsikId, setMyeongsikId] = useState<string | null>(null);

  useEffect(() => {
    // ✅ 이 컴포넌트는 /impersonate 라우트에서만 뜨는게 정상인데,
    // 혹시라도 재사용/오동작 대비해서 pathname 가드 걸어둠.
    if (location.pathname !== "/impersonate") return;

    const sp = new URLSearchParams(location.search);
    setUserId(sp.get("userId"));
    setMyeongsikId(sp.get("myeongsikId"));
  }, [location.pathname, location.search]);

  return (
    <div className="p-4 text-white">
      <div className="text-sm text-neutral-400">Impersonate</div>
      <div className="mt-2">userId: {userId ?? "(none)"}</div>
      <div className="mt-1">myeongsikId: {myeongsikId ?? "(none)"}</div>
    </div>
  );
}
