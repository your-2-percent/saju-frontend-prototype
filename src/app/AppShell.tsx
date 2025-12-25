// src/app/AppShell.tsx
import { Routes, Route, Navigate } from "react-router-dom";

import Page from "@/app/layout/Page";
import AdminPage from "@/app/admin/AdminPage";
import ImpersonateView from "@/app/impersonate/page";
import AuthCallback from "@/app/pages/AuthCallback";

import UserActivityHeartbeatGate from "@/shared/activity/UserActivityHeartbeat";
import AppBootstrap from "@/app/AppBootstrap";
import HeartbeatGate from "@/app/HeartbeatGate";
import AccountDisabledGate from "@/app/AccountDisabledGate";
import AccountDisabledPage from "@/app/pages/AccountDisabled";

export default function AppShell() {
  return (
    <>
      <AppBootstrap />
      <HeartbeatGate />

      {/* ✅ 비활성화 강제 튕김 */}
      <AccountDisabledGate />

      <UserActivityHeartbeatGate />

      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/disabled" element={<AccountDisabledPage />} />
        <Route path="/" element={<Page />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/impersonate" element={<ImpersonateView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
