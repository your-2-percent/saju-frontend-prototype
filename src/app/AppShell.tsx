import { useEffect } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import AdminPage from "@/app/admin/AdminPage";
import AccountDisabledGate from "@/app/AccountDisabledGate";
import AppBootstrap from "@/app/AppBootstrap";
import SiteGuidePage from "@/app/guide/SiteGuidePage";
import HeartbeatGate from "@/app/HeartbeatGate";
import Page from "@/app/layout/Page";
import PrivacyPolicyPage from "@/app/legal/PrivacyPolicyPage";
import TermsPage from "@/app/legal/TermsPage";
import AccountDisabledPage from "@/app/pages/AccountDisabled";
import SajuNoteAboutPage from "@/app/saju-note/SajuNoteAboutPage";
import SajuNoteHistory1Page from "@/app/saju-note/SajuNoteHistory1Page";
import SajuNoteHistory2Page from "@/app/saju-note/SajuNoteHistory2Page";
import SajuNoteMyounlyeokPage from "@/app/saju-note/SajuNoteMyounlyeokPage";
import SajuNotePage from "@/app/saju-note/SajuNotePage";
import SajuNotePrologPage from "@/app/saju-note/SajuNotePrologPage";
import SajuNoteReaderPage from "@/app/saju-note/SajuNoteReaderPage";
import ImpersonateView from "@/app/impersonate/page";
import AuthCallback from "@/auth/ui/AuthCallbackPage";
import IChingSixYaoPage from "@/iching/ui/IChingSixYaoPage";
import FaqStandalonePage from "@/app/faq/FaqStandalonePage";
import UserActivityHeartbeatGate from "@/shared/activity/UserActivityHeartbeat";
import { PublicAds } from "@/shared/ads/PublicAds";

export default function AppShell() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <>
      <AppBootstrap />
      <HeartbeatGate />
      <AccountDisabledGate />
      <UserActivityHeartbeatGate />
      <PublicAds />

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
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/guide" element={<SiteGuidePage />} />
        <Route path="/saju-note/*" element={<Navigate to="/saju-note" replace />} />
        <Route path="/about" element={<Navigate to="/saju-note/about" replace />} />
        <Route path="/myounlyeok" element={<Navigate to="/saju-note/myounlyeok" replace />} />
        <Route path="/prolog" element={<Navigate to="/saju-note/prolog" replace />} />
        <Route path="/" element={<Page />} />
        <Route path="/faq" element={<FaqStandalonePage />} />
        <Route path="/couple" element={<Page />} />
        <Route path="/result" element={<Page />} />
        <Route path="/admin/*" element={<AdminPage />} />
        <Route path="/impersonate" element={<ImpersonateView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
