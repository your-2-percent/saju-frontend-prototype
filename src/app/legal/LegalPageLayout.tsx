import { useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";

import Footer from "@/app/pages/Footer";

type LegalPageLayoutProps = {
  title: string;
  description: string;
  children: ReactNode;
  eyebrow?: string;
};

const navLinkClass =
  "rounded-full border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:border-orange-400 hover:text-orange-500 dark:border-neutral-700 dark:text-neutral-300 dark:hover:border-orange-500 dark:hover:text-orange-300";

export default function LegalPageLayout({
  title,
  description,
  children,
  eyebrow = "Legal",
}: LegalPageLayoutProps) {
  useEffect(() => {
    document.title = `${title} | 화림만세력`;
  }, [title]);

  return (
    <div className="min-h-screen text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
      <main className="px-4 py-8 sm:py-10">
        <div className="mx-auto max-w-3xl">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/"
              className="text-sm font-medium text-neutral-500 transition hover:text-orange-500 dark:text-neutral-300 dark:hover:text-orange-300"
            >
              홈으로
            </Link>

            <div className="flex flex-wrap items-center gap-2">
              <Link to="/guide" className={navLinkClass}>
                사이트 가이드
              </Link>
              <Link to="/terms" className={navLinkClass}>
                서비스 이용약관
              </Link>
              <Link to="/privacy" className={navLinkClass}>
                개인정보 처리방침
              </Link>
            </div>
          </div>

          <article className="overflow-hidden rounded-[28px] border border-neutral-200/80 bg-white/90 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/90">
            <div className="border-b border-neutral-200/80 bg-white/70 px-6 py-6 dark:border-neutral-800 dark:bg-neutral-900/80 sm:px-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">
                {eyebrow}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              <p className="mt-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                {description}
              </p>
            </div>

            <div className="px-4 py-4 sm:px-8 sm:py-8">{children}</div>
          </article>
        </div>
      </main>

      <Footer />
    </div>
  );
}
