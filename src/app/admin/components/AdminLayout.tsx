// components/AdminLayout.tsx
"use client";

import { ReactNode, useState } from "react";
import { useLocation } from "react-router-dom";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const menu = [
    { label: "📊 대시보드", href: "/admin/dashboard" },
    { label: "👤 유저 목록", href: "/admin/user" },
    { label: "📝 감사 로그", href: "/admin/logs" },
  ];

  return (
    <div className="flex min-h-screen bg-neutral-950 text-white">

      {/* ========= 사이드바 ========= */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-neutral-900 border-r border-neutral-800 
          transition-all z-50

          desk:w-60 desk:translate-x-0
          ${open ? "w-60 translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="p-4 font-bold text-lg flex items-center justify-between">
          <span className="desk:block hidden">관리자센터</span>

          {/* 모바일에서 닫기 버튼 */}
          <button
            className="desk:hidden text-neutral-400 hover:text-white"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        <nav className="mt-4 flex flex-col gap-1 px-2">
          {menu.map((item) => {
            const active = location.pathname.startsWith(item.href);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`
                  block px-3 py-2 rounded-md text-sm
                  ${active ? "bg-neutral-800 text-yellow-400" : "text-neutral-300 hover:bg-neutral-800"}
                `}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      </aside>

      {/* ========= 메인 영역 ========= */}
      <main className="flex-1 flex flex-col desk:ml-60">

        {/* 상단 헤더 */}
        <header className="h-14 border-b border-neutral-800 bg-neutral-900 flex items-center px-4 justify-between">

          {/* 모바일 햄버거 버튼 */}
          <button
            className="desk:hidden text-neutral-300"
            onClick={() => setOpen(true)}
          >
            ☰
          </button>

          <div className="font-semibold">관리자 페이지</div>

          <button
            className="text-sm text-neutral-400 hover:text-white cursor-pointer"
            onClick={() => (window.location.href = "/")}
          >
            사용자 화면으로
          </button>
        </header>

        {/* 페이지 내용 */}
        <div className="flex-1">{children}</div>
      </main>
    </div>
  );
}
