import "@/settings/calc/themeBoot";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import AppShell from "@/app/AppShell";
import "./main.css";

const GITHUB_PAGES_REPO = "saju-frontend-prototype";

function getRouterBasename() {
  const { hostname, pathname } = window.location;
  const isGitHubPagesHost = /\.github\.io$/i.test(hostname);
  const pathParts = (pathname || "/").split("/");

  if (isGitHubPagesHost && pathParts[1] === GITHUB_PAGES_REPO) {
    return `/${GITHUB_PAGES_REPO}`;
  }

  return undefined;
}

createRoot(document.getElementById("root")!).render(
  <BrowserRouter basename={getRouterBasename()}>
    <AppShell />
  </BrowserRouter>
);
