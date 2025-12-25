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

import UserActivityHeartbeat from "@/shared/activity/UserActivityHeartbeat";
import AppBootstrap from "@/app/AppBootstrap";
import HeartbeatGate from "@/app/HeartbeatGate"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AppBootstrap />
      <HeartbeatGate />
      <UserActivityHeartbeat />

      <Routes>
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route path="/" element={<Page />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/impersonate" element={<ImpersonateView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  </StrictMode>
);
