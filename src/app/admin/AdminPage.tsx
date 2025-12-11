// AdminPage.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import AdminLayout from "./components/AdminLayout";

import AdminDashboard from "./dashboard/page";
import AdminUserList from "./user";
import AdminUserDetail from "./user/[userId]";
import AdminLogs from "./log";

const ADMIN_UUIDS: string[] = (import.meta.env.VITE_ADMIN_UUIDS ?? "")
  .split(",")
  .map((v) => v.trim())
  .filter(Boolean);

export default function AdminPage() {
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      setIsAdmin(!!uid && ADMIN_UUIDS.includes(uid));
      setChecked(true);
    };
    init();
  }, []);

  if (!checked) return <div className="p-6 text-white">관리자 인증 중..</div>;
  if (!isAdmin) return <div className="p-6 text-white">관리자 권한 없음</div>;

  // -------------------------------
  // URL 기반 라우팅 (순서 매우 중요함!)
  // -------------------------------
  const path = window.location.pathname;

  let content = <AdminDashboard />;

  // 1️⃣ 유저 상세 페이지 먼저 확인
  if (path.startsWith("/admin/user/")) {
    const userId = path.replace("/admin/user/", "");
    content = <AdminUserDetail params={{ userId }} />;
  }
  // 2️⃣ 그 다음 유저 리스트
  else if (path.startsWith("/admin/user")) {
    content = <AdminUserList />;
  }
  // 3️⃣ 로그 페이지
  else if (path.startsWith("/admin/logs")) {
    content = <AdminLogs />;
  }
  // 4️⃣ 대시보드
  else if (path.startsWith("/admin/dashboard")) {
    content = <AdminDashboard />;
  }

  return <AdminLayout>{content}</AdminLayout>;
}
