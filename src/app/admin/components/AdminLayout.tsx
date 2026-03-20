"use client";

import { type ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const menu = [
    { label: "대시보드", href: "/admin/dashboard" },
    { label: "방문자 로그", href: "/admin/pageviews" },
    { label: "유저 목록", href: "/admin/user" },
    { label: "감사 로그", href: "/admin/logs" },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">
      <aside
        className={`
          fixed top-0 left-0 h-full bg-neutral-900 border-r border-neutral-800
          transition-all z-50
          desk:w-60 desk:translate-x-0
          ${open ? "w-60 translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-4 font-bold text-lg flex items-center justify-between">
          <span className="desk:block hidden">관리자 센터</span>
          <button
            className="desk:hidden text-neutral-400 hover:text-white"
            onClick={() => setOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="mt-4 flex flex-col gap-1 px-2">
          {menu.map((item) => {
            const active = location.pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={() => setOpen(false)}
                className={`
                  block px-3 py-2 rounded-md text-sm
                  ${active ? "bg-neutral-800 text-yellow-400" : "text-neutral-300 hover:bg-neutral-800"}
                `}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col desk:ml-60">
        <header className="h-14 border-b border-neutral-800 bg-neutral-900 flex items-center px-4 justify-between">
          <button
            className="desk:hidden text-neutral-300"
            onClick={() => setOpen(true)}
          >
            ☰
          </button>

          <div className="font-semibold">관리자 페이지</div>

          <button
            className="text-sm text-neutral-400 hover:text-white cursor-pointer"
            onClick={() => navigate("/")}
          >
            메인으로
          </button>
        </header>

        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
