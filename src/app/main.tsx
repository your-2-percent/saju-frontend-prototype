import "@/shared/lib/themeBoot";   // ✅ 가장 먼저
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Page from "@/app/layout/Page";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Page />
  </StrictMode>,
);