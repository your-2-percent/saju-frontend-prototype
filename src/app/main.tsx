import "@/settings/calc/themeBoot";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";

import AppShell from "@/app/AppShell";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <AppShell />
  </HashRouter>
);
