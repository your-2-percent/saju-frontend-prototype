// src/app/main.tsx
import "@/settings/calc/themeBoot"; // 가장 먼저
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppShell from "@/app/AppShell";
import "./main.css";

const PROJECT_BASENAME = "/saju-frontend-prototype";

function resolveBasename() {
  if (typeof window === "undefined") return "/";

  const { hostname, pathname } = window.location;
  const isGitHubPagesHost = /\.github\.io$/i.test(hostname);
  const isProjectPath =
    pathname === PROJECT_BASENAME || pathname.startsWith(PROJECT_BASENAME + "/");

  return isGitHubPagesHost && isProjectPath ? PROJECT_BASENAME : "/";
}

const BASENAME = resolveBasename();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={BASENAME}>
    <AppShell />
  </BrowserRouter>
);
