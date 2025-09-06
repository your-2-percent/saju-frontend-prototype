import { jsx as _jsx } from "react/jsx-runtime";
import "@/shared/lib/themeBoot"; // ✅ 가장 먼저
import "@/app/main.css"; // ✅ 그 다음
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Page from "@/app/layout/Page";
createRoot(document.getElementById("root")).render(_jsx(StrictMode, { children: _jsx(Page, {}) }));
