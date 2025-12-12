import "@/shared/lib/themeBoot";   // 가장 먼저
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// 🔥 HashRouter 추가
import { HashRouter, Routes, Route } from "react-router-dom";

import Page from "@/app/layout/Page";
import AdminPage from "@/app/admin/AdminPage"; // 관리자 페이지 추가
import ImpersonateView from "@/app/impersonate/page";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <Routes>
        {/* 메인 페이지 */}
        <Route path="/" element={<Page />} />
        
        {/* 관리자 페이지 */}
        <Route path="/admin" element={<AdminPage />} />

        {/* 임퍼소네이션 읽기 전용 뷰 */}
        <Route path="/impersonate" element={<ImpersonateView />} />
      </Routes>
    </HashRouter>
  </StrictMode>,
);
