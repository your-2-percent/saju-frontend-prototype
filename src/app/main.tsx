// src/app/main.tsx
import "@/settings/calc/themeBoot"; // 가장 먼저
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppShell from "@/app/AppShell";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AppShell />
  </BrowserRouter>
);
