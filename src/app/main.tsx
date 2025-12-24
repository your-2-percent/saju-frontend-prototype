// src/app/main.tsx
import "@/shared/lib/themeBoot"; // 가장 먼저
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";

import Page from "@/app/layout/Page";
import AdminPage from "@/app/admin/AdminPage";
import ImpersonateView from "@/app/impersonate/page";
import AuthCallback from "@/app/pages/AuthCallback";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        {/* OAuth 콜백 */}
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* 메인 */}
        <Route path="/" element={<Page />} />

        {/* 관리자 */}
        <Route path="/admin" element={<AdminPage />} />

        {/* 임퍼소네이션 */}
        <Route path="/impersonate" element={<ImpersonateView />} />

        {/* ✅ 이상한 해시/라우트 들어오면 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>
);
