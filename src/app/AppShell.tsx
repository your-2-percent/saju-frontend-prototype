// src/app/AppShell.tsx
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Page from "@/app/layout/Page";
import AdminPage from "@/app/admin/AdminPage";
import ImpersonateView from "@/app/impersonate/page";
import AuthCallback from "@/auth/ui/AuthCallbackPage";
import IChingSixYaoPage from "@/iching/ui/IChingSixYaoPage";
import SajuNotePage from "@/app/saju-note/SajuNotePage";
import SajuNoteReaderPage from "@/app/saju-note/SajuNoteReaderPage";
import SajuNoteAboutPage from "@/app/saju-note/SajuNoteAboutPage";
import SajuNoteMyounlyeokPage from "@/app/saju-note/SajuNoteMyounlyeokPage";
import SajuNotePrologPage from "@/app/saju-note/SajuNotePrologPage";
import SajuNoteHistory1Page from "@/app/saju-note/SajuNoteHistory1Page";
import SajuNoteHistory2Page from "@/app/saju-note/SajuNoteHistory2Page";

import UserActivityHeartbeatGate from "@/shared/activity/UserActivityHeartbeat";
import AppBootstrap from "@/app/AppBootstrap";
import HeartbeatGate from "@/app/HeartbeatGate";
import AccountDisabledGate from "@/app/AccountDisabledGate";
import AccountDisabledPage from "@/app/pages/AccountDisabled";

export default function AppShell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

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
        <Route path="/iching" element={<IChingSixYaoPage />} />
        <Route path="/saju-note" element={<SajuNotePage />} />
        <Route path="/saju-note/read/:slug/*" element={<SajuNoteReaderPage />} />
        <Route path="/saju-note/about/*" element={<SajuNoteAboutPage />} />
        <Route path="/saju-note/myounlyeok/*" element={<SajuNoteMyounlyeokPage />} />
        <Route path="/saju-note/prolog/*" element={<SajuNotePrologPage />} />
        <Route path="/saju-note/history-1" element={<SajuNoteHistory1Page />} />
        <Route path="/saju-note/history-2" element={<SajuNoteHistory2Page />} />
        <Route path="/saju-note/*" element={<Navigate to="/saju-note" replace />} />
        {/* legacy direct links */}
        <Route path="/about" element={<Navigate to="/saju-note/about" replace />} />
        <Route path="/myounlyeok" element={<Navigate to="/saju-note/myounlyeok" replace />} />
        <Route path="/prolog" element={<Navigate to="/saju-note/prolog" replace />} />
        <Route path="/" element={<Page />} />
        <Route path="/faq" element={<Page />} />
        <Route path="/couple" element={<Page />} />
        <Route path="/result" element={<Page />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/impersonate" element={<ImpersonateView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
