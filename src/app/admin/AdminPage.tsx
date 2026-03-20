// AdminPage.tsx
"use client";

import { useLocation } from "react-router-dom";

import AdminLayout from "./components/AdminLayout";
import { useAdminRole } from "./hooks/useAdminRole";
import AdminDashboard from "./dashboard/page";
import AdminLogs from "./log";
import AdminUserDetail from "./user/[userId]";
import AdminUserList from "./user";
import AdminPageViewsPage from "./pageviews/AdminPageViewsPage";

function AdminStatusScreen({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <main className="min-h-screen bg-neutral-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 px-6 py-5 text-center shadow-xl">
        <h1 className="text-lg font-semibold">{title}</h1>
        <p className="mt-2 text-sm text-neutral-400">{description}</p>
      </div>
    </main>
  );
}

export default function AdminPage() {
  const { pathname } = useLocation();
  const { role, loading } = useAdminRole();
  const canAccess = role === "admin" || role === "operator" || role === "viewer";

  if (loading) {
    return (
      <AdminStatusScreen
        title="관리자 권한 확인 중..."
        description="현재 계정의 admin role을 확인하고 있습니다."
      />
    );
  }

  if (!canAccess) {
    return (
      <AdminStatusScreen
        title="관리자 권한이 없습니다."
        description="현재 계정에 연결된 admin role이 없어서 /admin 에 접근할 수 없습니다."
      />
    );
  }

  let content = <AdminDashboard />;

  if (pathname.startsWith("/admin/user/")) {
    const userId = pathname.slice("/admin/user/".length);
    content = <AdminUserDetail params={{ userId }} />;
  } else if (pathname.startsWith("/admin/user")) {
    content = <AdminUserList />;
  } else if (pathname.startsWith("/admin/logs")) {
    content = <AdminLogs />;
  } else if (pathname.startsWith("/admin/pageviews")) {
    content = <AdminPageViewsPage />;
  } else if (pathname.startsWith("/admin/dashboard") || pathname === "/admin") {
    content = <AdminDashboard />;
  }

  return <AdminLayout>{content}</AdminLayout>;
}
