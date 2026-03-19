import { useCallback, useMemo, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, BookOpen, Calendar, AlertCircle, Home, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import BottomNav from "@/shared/ui/nav/BottomNav";
import { SAJU_NOTE_BY_SLUG, SAJU_NOTE_CATEGORIES } from "@/app/saju-note/sajuNoteCatalog";
import { SAJU_NOTE_ARTICLE_BY_SLUG } from "@/app/saju-note/articles";
import { incrementSajuNoteView } from "@/app/saju-note/saveInterface/sajuNoteViewRepo";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { AdsenseInlineSection } from "@/shared/ads/AdsenseInlineSection";
import Footer from "@/app/pages/Footer";
import "@/app/saju-note/sajuNoteBase.css";
import "@/app/saju-note/sajuNoteContent.css";

/* ─── 테마 ─── */
type Theme = {
  accent: string;
  glow: string;
  badge: string;
  badgeBg: string;
  navActive: string;
};

const getThemeBySlug = (slug: string = ""): Theme => {
  const conceptThemeBySlug: Record<string, Theme> = {
    "yin-yang": {
      accent: "text-blue-600 dark:text-blue-400",
      glow: "from-blue-100/70 via-sky-50/30 to-transparent dark:from-blue-600/18 dark:via-sky-500/8 dark:to-transparent",
      badge: "text-blue-700 dark:text-blue-300",
      badgeBg: "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/50",
      navActive: "border-blue-200 dark:border-blue-800/60 hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-900/20",
    },
    "five-elements": {
      accent: "text-emerald-600 dark:text-emerald-400",
      glow: "from-emerald-100/70 via-teal-50/30 to-transparent dark:from-emerald-600/18 dark:via-teal-500/8 dark:to-transparent",
      badge: "text-emerald-700 dark:text-emerald-300",
      badgeBg: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800/50",
      navActive: "border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400 dark:hover:border-emerald-600 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20",
    },
    cheongan: {
      accent: "text-amber-600 dark:text-amber-400",
      glow: "from-amber-100/70 via-orange-50/30 to-transparent dark:from-amber-500/18 dark:via-orange-500/8 dark:to-transparent",
      badge: "text-amber-700 dark:text-amber-300",
      badgeBg: "bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50",
      navActive: "border-amber-200 dark:border-amber-800/60 hover:border-amber-400 dark:hover:border-amber-600 hover:bg-amber-50/50 dark:hover:bg-amber-900/20",
    },
    jiji: {
      accent: "text-violet-600 dark:text-violet-400",
      glow: "from-violet-100/70 via-fuchsia-50/30 to-transparent dark:from-violet-600/18 dark:via-fuchsia-500/8 dark:to-transparent",
      badge: "text-violet-700 dark:text-violet-300",
      badgeBg: "bg-violet-50 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800/50",
      navActive: "border-violet-200 dark:border-violet-800/60 hover:border-violet-400 dark:hover:border-violet-600 hover:bg-violet-50/50 dark:hover:bg-violet-900/20",
    },
    sipsin: {
      accent: "text-cyan-600 dark:text-cyan-400",
      glow: "from-cyan-100/70 via-sky-50/30 to-transparent dark:from-cyan-600/18 dark:via-sky-500/8 dark:to-transparent",
      badge: "text-cyan-700 dark:text-cyan-300",
      badgeBg: "bg-cyan-50 dark:bg-cyan-900/30 border-cyan-200 dark:border-cyan-800/50",
      navActive: "border-cyan-200 dark:border-cyan-800/60 hover:border-cyan-400 dark:hover:border-cyan-600 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/20",
    },
    "tonggeun-and-tuchul": {
      accent: "text-sky-600 dark:text-sky-400",
      glow: "from-sky-100/70 via-blue-50/30 to-transparent dark:from-sky-600/18 dark:via-blue-500/8 dark:to-transparent",
      badge: "text-sky-700 dark:text-sky-300",
      badgeBg: "bg-sky-50 dark:bg-sky-900/30 border-sky-200 dark:border-sky-800/50",
      navActive: "border-sky-200 dark:border-sky-800/60 hover:border-sky-400 dark:hover:border-sky-600 hover:bg-sky-50/50 dark:hover:bg-sky-900/20",
    },
    "hyeong-chung-hoi-hap": {
      accent: "text-indigo-600 dark:text-indigo-400",
      glow: "from-indigo-100/70 via-blue-50/30 to-transparent dark:from-indigo-600/18 dark:via-blue-500/8 dark:to-transparent",
      badge: "text-indigo-700 dark:text-indigo-300",
      badgeBg: "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50",
      navActive: "border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20",
    },
    "eight-letters-meaning": {
      accent: "text-teal-600 dark:text-teal-400",
      glow: "from-teal-100/70 via-emerald-50/30 to-transparent dark:from-teal-600/18 dark:via-emerald-500/8 dark:to-transparent",
      badge: "text-teal-700 dark:text-teal-300",
      badgeBg: "bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-800/50",
      navActive: "border-teal-200 dark:border-teal-800/60 hover:border-teal-400 dark:hover:border-teal-600 hover:bg-teal-50/50 dark:hover:bg-teal-900/20",
    },
    terminology: {
      accent: "text-rose-600 dark:text-rose-400",
      glow: "from-rose-100/70 via-pink-50/30 to-transparent dark:from-rose-600/18 dark:via-pink-500/8 dark:to-transparent",
      badge: "text-rose-700 dark:text-rose-300",
      badgeBg: "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50",
      navActive: "border-rose-200 dark:border-rose-800/60 hover:border-rose-400 dark:hover:border-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-900/20",
    },
    "ohang-mulssang": {
      accent: "text-rose-600 dark:text-rose-400",
      glow: "from-rose-100/70 via-pink-50/30 to-transparent dark:from-rose-600/18 dark:via-pink-500/8 dark:to-transparent",
      badge: "text-rose-700 dark:text-rose-300",
      badgeBg: "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50",
      navActive: "border-rose-200 dark:border-rose-800/60 hover:border-rose-400 dark:hover:border-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-900/20",
    },
    gyeokguk: {
      accent: "text-fuchsia-600 dark:text-fuchsia-400",
      glow: "from-fuchsia-100/70 via-pink-50/30 to-transparent dark:from-fuchsia-600/18 dark:via-pink-500/8 dark:to-transparent",
      badge: "text-fuchsia-700 dark:text-fuchsia-300",
      badgeBg: "bg-fuchsia-50 dark:bg-fuchsia-900/30 border-fuchsia-200 dark:border-fuchsia-800/50",
      navActive: "border-fuchsia-200 dark:border-fuchsia-800/60 hover:border-fuchsia-400 dark:hover:border-fuchsia-600 hover:bg-fuchsia-50/50 dark:hover:bg-fuchsia-900/20",
    },
  };

  if (conceptThemeBySlug[slug]) {
    return conceptThemeBySlug[slug]!;
  }

  if (slug.includes("solar-position") || slug.includes("time-correction") || slug.includes("iljuron")) {
    return {
      accent: "text-orange-600 dark:text-orange-400",
      glow: "from-orange-100/50 via-amber-50/20 to-transparent dark:from-orange-950/20 dark:to-transparent",
      badge: "text-orange-700 dark:text-orange-300",
      badgeBg: "bg-orange-50 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/50",
      navActive: "border-orange-200 dark:border-orange-800/60 hover:border-orange-400 dark:hover:border-orange-600 hover:bg-orange-50/50 dark:hover:bg-orange-900/20",
    };
  }
  if (slug.includes("prolog") || slug.includes("essay")) {
    return {
      accent: "text-rose-600 dark:text-rose-400",
      glow: "from-rose-100/50 via-pink-50/20 to-transparent dark:from-rose-950/20 dark:to-transparent",
      badge: "text-rose-700 dark:text-rose-300",
      badgeBg: "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50",
      navActive: "border-rose-200 dark:border-rose-800/60 hover:border-rose-400 dark:hover:border-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-900/20",
    };
  }
  if (slug.includes("myoun") || slug.includes("deep")) {
    return {
      accent: "text-purple-600 dark:text-purple-400",
      glow: "from-purple-100/50 via-indigo-50/20 to-transparent dark:from-purple-950/20 dark:to-transparent",
      badge: "text-purple-700 dark:text-purple-300",
      badgeBg: "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800/50",
      navActive: "border-purple-200 dark:border-purple-800/60 hover:border-purple-400 dark:hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-900/20",
    };
  }
  return {
    accent: "text-indigo-600 dark:text-indigo-400",
    glow: "from-indigo-100/40 via-sky-50/20 to-transparent dark:from-indigo-950/20 dark:to-transparent",
    badge: "text-indigo-700 dark:text-indigo-300",
    badgeBg: "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50",
    navActive: "border-indigo-200 dark:border-indigo-800/60 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20",
  };
};

/* ─── 404 ─── */
function NotFoundView() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-24">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-4">
        <div className="max-w-[800px] mx-auto h-12 sm:h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로가기"
            className="p-2 rounded-full text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-neutral-400 dark:text-neutral-500">
            페이지를 찾을 수 없음
          </span>
        </div>
      </header>

      <main className="max-w-[800px] mx-auto px-4 py-24 flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-400">
          <AlertCircle size={26} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            요청하신 글이 존재하지 않습니다.
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            주소가 잘못되었거나 삭제된 게시물일 수 있습니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/saju-note")}
          className="cursor-pointer px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-bold hover:opacity-90 transition-opacity"
        >
          목록으로 돌아가기
        </button>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}

/* ─── Main ─── */
type SajuNoteReaderPageProps = {
  forcedSlug?: string;
};

export default function SajuNoteReaderPage({ forcedSlug }: SajuNoteReaderPageProps) {
  const navigate = useNavigate();
  const { slug: routeSlug } = useParams();
  const slug = forcedSlug ?? routeSlug;

  const note    = useMemo(() => (slug ? SAJU_NOTE_BY_SLUG[slug] : undefined), [slug]);
  const article = useMemo(() => (slug ? SAJU_NOTE_ARTICLE_BY_SLUG[slug] : undefined), [slug]);
  const theme   = useMemo(() => getThemeBySlug(slug), [slug]);

  const orderedNotes = useMemo(
    () => SAJU_NOTE_CATEGORIES.flatMap((c) => c.items),
    []
  );
  const currentIndex = useMemo(
    () => (slug ? orderedNotes.findIndex((item) => item.slug === slug) : -1),
    [orderedNotes, slug]
  );
  const prevNote = currentIndex > 0 ? orderedNotes[currentIndex - 1] : null;
  const nextNote = currentIndex >= 0 && currentIndex < orderedNotes.length - 1
    ? orderedNotes[currentIndex + 1]
    : null;

  /* ─── 앵커 스크롤 ─── */
  const scrollToHashTarget = useCallback(
    (hash: string, container?: ParentNode | null) => {
      if (!hash.startsWith("#")) return false;
      const contentRoot = container ?? document.querySelector<HTMLElement>(".saju-note-content");
      if (!contentRoot) return false;

      if (slug === "sipsin" && hash.startsWith("#tg-")) {
        const targetDetails = contentRoot.querySelector<HTMLDetailsElement>(hash);
        if (!targetDetails) return false;
        contentRoot.querySelectorAll<HTMLDetailsElement>('details[id^="tg-"]')
          .forEach((d) => { d.open = d === targetDetails; });
      }

      const targetEl = contentRoot.querySelector<HTMLElement>(hash);
      if (!targetEl) return false;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      targetEl.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
      return true;
    },
    [slug]
  );

  const onContentClick = useCallback(
    (e: React.MouseEvent<HTMLElement>) => {
      const anchor = (e.target as HTMLElement | null)?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("/saju-note/read/")) {
        e.preventDefault();
        navigate(href.replace("/saju-note/read/", "/saju-note/"));
        return;
      }
      if (href.startsWith("/saju-note/")) {
        e.preventDefault();
        navigate(href);
        return;
      }
      if (href.startsWith("#") && scrollToHashTarget(href, e.currentTarget)) {
        e.preventDefault();
      }
    },
    [navigate, scrollToHashTarget]
  );

  /* ─── 상태 ─── */
  const [showTitle, setShowTitle]   = useState(false);
  const [viewCount, setViewCount]   = useState<number | null>(null);
  const showAds = useEntitlementsStore((s) => s.shouldShowAdsNow());

  useEffect(() => {
    if (!slug || !note || !article) { setViewCount(null); return; }
    let cancelled = false;
    void (async () => {
      const next = await incrementSajuNoteView(slug);
      if (!cancelled) setViewCount(next);
    })();
    return () => { cancelled = true; };
  }, [slug, note, article]);

  useEffect(() => {
    if (!note || !article) return;
    const title = article.seoTitle ?? note.title;
    const prevTitle = document.title;
    document.title = `${title} | 화림 사주노트`;

    const setMeta = (name: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    const setProp = (prop: string, content: string) => {
      let el = document.querySelector<HTMLMetaElement>(`meta[property="${prop}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute("property", prop); document.head.appendChild(el); }
      el.content = content;
    };

    const desc = article.seoDescription ?? note.description;
    if (desc) { setMeta("description", desc); setProp("og:description", desc); }
    if (article.seoKeywords) setMeta("keywords", article.seoKeywords);
    setProp("og:title", title);

    return () => { document.title = prevTitle; };
  }, [note, article]);

  useEffect(() => {
    const onScroll = () => setShowTitle(window.scrollY > 120);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!article || !window.location.hash) return;
    const id = window.requestAnimationFrame(() => scrollToHashTarget(window.location.hash));
    return () => window.cancelAnimationFrame(id);
  }, [article, scrollToHashTarget]);

  if (!note || !article) return <NotFoundView />;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-28">

      {/* 배경 그라데이션 */}
      <div className={`fixed top-0 inset-x-0 h-64 bg-gradient-to-b ${theme.glow} pointer-events-none z-0`} />

      {/* ── 상단 헤더 ── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/60 dark:border-neutral-800/60">
        <div className="max-w-[800px] mx-auto px-4 h-12 sm:h-14 flex items-center gap-2">

          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로가기"
            className="shrink-0 p-2 rounded-full text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>

          {/* 스크롤 내려가면 타이틀 표시 */}
          <div className={`flex-1 min-w-0 transition-all duration-200 ${showTitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
            <p className="text-xs font-bold truncate text-neutral-700 dark:text-neutral-200">
              {note.title}
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/saju-note")}
            aria-label="목록으로"
            className="shrink-0 p-2 rounded-full text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors cursor-pointer"
          >
            <Home size={16} />
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-[800px] mx-auto px-4 pt-8 pb-6 sm:pt-10">

        {/* ── 타이틀 영역 ── */}
        <div className="mb-8">

          {/* 메타 정보 행 */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${theme.badge}`}>
              <BookOpen size={11} />
              사주노트
            </span>
            <span className="text-neutral-300 dark:text-neutral-700 text-xs">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
              <Calendar size={11} />
              {note.date}
            </span>
            {viewCount != null && (
              <>
                <span className="text-neutral-300 dark:text-neutral-700 text-xs">·</span>
                <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 dark:text-neutral-500">
                  <Eye size={11} />
                  {viewCount.toLocaleString()}
                </span>
              </>
            )}
          </div>

          <h1 className="text-2xl sm:text-[1.75rem] font-extrabold tracking-tight leading-tight break-keep text-neutral-900 dark:text-neutral-50 mb-3">
            {note.title}
          </h1>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            {note.description}
          </p>

          <div className="mt-5 h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
        </div>

        {/* ── 본문 ── */}
        <article
          className="saju-note-content"
          data-slug={slug ?? ""}
          onClick={onContentClick}
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        <AdsenseInlineSection enabled={showAds} containerClassName="mt-8" maxWidthPx={760} />

        {/* ── 이전/다음 네비게이션 ── */}
        <div className="mt-10">
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent mb-6" />

          <nav aria-label="글 이동" className="grid grid-cols-1 sm:grid-cols-2 gap-3">

            {/* 이전 글 */}
            {prevNote ? (
              <button
                type="button"
                onClick={() => navigate(`/saju-note/${prevNote.slug}`)}
                className={`group text-left rounded-xl border bg-white dark:bg-neutral-900/50 p-4 transition-all cursor-pointer ${theme.navActive}`}
              >
                <div className="flex items-center gap-1.5 mb-2">
                  <ChevronLeft size={13} className="text-neutral-400 shrink-0" />
                  <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                    이전 글
                  </span>
                </div>
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 leading-snug line-clamp-2 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                  {prevNote.title}
                </p>
                {prevNote.description && (
                  <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500 line-clamp-1">
                    {prevNote.description}
                  </p>
                )}
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-center text-xs text-neutral-300 dark:text-neutral-700">
                첫 번째 글입니다.
              </div>
            )}

            {/* 다음 글 */}
            {nextNote ? (
              <button
                type="button"
                onClick={() => navigate(`/saju-note/${nextNote.slug}`)}
                className={`group text-right rounded-xl border bg-white dark:bg-neutral-900/50 p-4 transition-all cursor-pointer ${theme.navActive}`}
              >
                <div className="flex items-center justify-end gap-1.5 mb-2">
                  <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">
                    다음 글
                  </span>
                  <ChevronRight size={13} className="text-neutral-400 shrink-0" />
                </div>
                <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200 leading-snug line-clamp-2 group-hover:text-neutral-900 dark:group-hover:text-white transition-colors">
                  {nextNote.title}
                </p>
                {nextNote.description && (
                  <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500 line-clamp-1">
                    {nextNote.description}
                  </p>
                )}
              </button>
            ) : (
              <div className="rounded-xl border border-dashed border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-center text-xs text-neutral-300 dark:text-neutral-700">
                마지막 글입니다.
              </div>
            )}
          </nav>

          {/* 목록으로 */}
          <div className="flex justify-center mt-6">
            <button
              type="button"
              onClick={() => navigate("/saju-note")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-neutral-200 dark:border-neutral-800 text-sm font-medium text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-800 dark:hover:text-neutral-200 transition-all cursor-pointer"
            >
              <Home size={13} />
              사주노트 목록
            </button>
          </div>
        </div>
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
