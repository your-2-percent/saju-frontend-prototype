// src/app/main.tsx
import "@/shared/lib/themeBoot"; // 가장 먼저
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import AppShell from "@/app/AppShell";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HashRouter>
      <AppShell />
    </HashRouter>
  </StrictMode>
);
