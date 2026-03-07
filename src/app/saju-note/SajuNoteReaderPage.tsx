import { useCallback, useMemo, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Calendar, AlertCircle, Home, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import BottomNav from "@/shared/ui/nav/BottomNav";
import { SAJU_NOTE_BY_SLUG, SAJU_NOTE_CATEGORIES } from "@/app/saju-note/sajuNoteCatalog";
import { SAJU_NOTE_ARTICLE_BY_SLUG } from "@/app/saju-note/sajuNoteArticles";
import { incrementSajuNoteView } from "@/app/saju-note/saveInterface/sajuNoteViewRepo";
import "@/app/saju-note/sajuNoteContent.css";

type Theme = {
  accent: string;
  headerIcon: string;
  glow: string;
  badge: string;
  badgeBg: string;
  navHover: string;
};

const getThemeBySlug = (slug: string = ""): Theme => {
  if (slug.includes("prolog") || slug.includes("essay")) {
    return {
      accent: "text-rose-600 dark:text-rose-400",
      headerIcon: "text-rose-500 dark:text-rose-400",
      glow: "from-rose-100/70 via-pink-50/30 to-transparent dark:from-rose-950/30 dark:via-pink-950/10 dark:to-transparent",
      badge: "text-rose-700 dark:text-rose-300",
      badgeBg: "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-800/50",
      navHover: "hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400",
    };
  }
  if (slug.includes("myoun") || slug.includes("deep")) {
    return {
      accent: "text-purple-600 dark:text-purple-400",
      headerIcon: "text-purple-500 dark:text-purple-400",
      glow: "from-purple-100/60 via-indigo-50/30 to-transparent dark:from-purple-950/30 dark:via-indigo-950/10 dark:to-transparent",
      badge: "text-purple-700 dark:text-purple-300",
      badgeBg: "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800/50",
      navHover: "hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-600 dark:hover:text-purple-400",
    };
  }
  return {
    accent: "text-indigo-600 dark:text-indigo-400",
    headerIcon: "text-indigo-500 dark:text-indigo-400",
    glow: "from-indigo-100/50 via-sky-50/20 to-transparent dark:from-indigo-950/25 dark:via-sky-950/10 dark:to-transparent",
    badge: "text-indigo-700 dark:text-indigo-300",
    badgeBg: "bg-indigo-50 dark:bg-indigo-900/30 border-indigo-200 dark:border-indigo-800/50",
    navHover: "hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400",
  };
};

export default function SajuNoteReaderPage() {
  const navigate = useNavigate();
  const { slug } = useParams();

  const note = useMemo(() => (slug ? SAJU_NOTE_BY_SLUG[slug] : undefined), [slug]);
  const article = useMemo(() => (slug ? SAJU_NOTE_ARTICLE_BY_SLUG[slug] : undefined), [slug]);
  const theme = useMemo(() => getThemeBySlug(slug), [slug]);
  const orderedNotes = useMemo(() => SAJU_NOTE_CATEGORIES.flatMap((category) => category.items), []);
  const currentNoteIndex = useMemo(
    () => (slug ? orderedNotes.findIndex((item) => item.slug === slug) : -1),
    [orderedNotes, slug]
  );
  const prevNote = currentNoteIndex > 0 ? orderedNotes[currentNoteIndex - 1] : null;
  const nextNote =
    currentNoteIndex >= 0 && currentNoteIndex < orderedNotes.length - 1
      ? orderedNotes[currentNoteIndex + 1]
      : null;

  const scrollToHashTarget = useCallback(
    (hash: string, container?: ParentNode | null) => {
      if (!hash.startsWith("#")) return false;

      const contentRoot =
        container ?? document.querySelector<HTMLElement>(".saju-note-content");
      if (!contentRoot) return false;

      if (slug === "sipsin" && hash.startsWith("#tg-")) {
        const targetDetails = contentRoot.querySelector<HTMLDetailsElement>(hash);
        if (!targetDetails) return false;

        const detailsList = contentRoot.querySelectorAll<HTMLDetailsElement>('details[id^="tg-"]');
        detailsList.forEach((details) => {
          details.open = details === targetDetails;
        });
      }

      const targetElement = contentRoot.querySelector<HTMLElement>(hash);
      if (!targetElement) return false;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      targetElement.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start",
      });
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${hash}`);
      return true;
    },
    [slug],
  );

  const onContentClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("/saju-note/read/")) {
        event.preventDefault();
        navigate(href);
        return;
      }

      // 십신 페이지 목차(#tg-*)는 해당 카드만 펼치고 나머지는 접는다.
      if (href.startsWith("#") && scrollToHashTarget(href, event.currentTarget)) {
        event.preventDefault();
      }
    },
    [navigate, scrollToHashTarget],
  );

  const [showTitle, setShowTitle] = useState(false);
  const [viewCount, setViewCount] = useState<number | null>(null);

  useEffect(() => {
    if (!slug || !note || !article) {
      setViewCount(null);
      return;
    }

    let cancelled = false;
    void (async () => {
      const next = await incrementSajuNoteView(slug);
      if (!cancelled) setViewCount(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [slug, note, article]);

  useEffect(() => {
    const handleScroll = () => setShowTitle(window.scrollY > 100);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!article) return;
    if (!window.location.hash) return;

    const frameId = window.requestAnimationFrame(() => {
      scrollToHashTarget(window.location.hash);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [article, scrollToHashTarget]);

  if (!note || !article) {
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
            <h1 className="text-sm font-bold text-neutral-500 dark:text-neutral-400">페이지를 찾을 수 없음</h1>
          </div>
        </header>

        <main className="max-w-[800px] mx-auto px-4 py-20 flex flex-col items-center text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-400">
            <AlertCircle size={26} />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">요청하신 글이 존재하지 않습니다.</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">주소가 잘못되었거나 삭제된 게시물일 수 있습니다.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/saju-note")}
            className="cursor-pointer px-5 py-2.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-sm font-bold hover:opacity-90 transition-opacity"
          >
            목록으로 돌아가기
          </button>
        </main>

        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-28">
      {/* 배경 글로우 */}
      <div className={`fixed top-0 left-0 right-0 h-80 bg-gradient-to-b ${theme.glow} pointer-events-none z-0`} />

      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/60 dark:border-neutral-800/60 px-4">
        <div className="max-w-[800px] mx-auto h-12 sm:h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로가기"
            className="shrink-0 p-2 rounded-full text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>

          <div className={`flex-1 min-w-0 transition-all duration-300 ${showTitle ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"}`}>
            <p className="text-xs font-bold truncate text-neutral-700 dark:text-neutral-200">{note.title}</p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/saju-note")}
            className="shrink-0 p-2 rounded-full text-neutral-400 dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors cursor-pointer"
            aria-label="목록으로"
          >
            <Home size={16} />
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-[800px] mx-auto px-4 py-10 sm:py-12">

        {/* 타이틀 영역 */}
        <div className="mb-8 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${theme.badgeBg} ${theme.badge}`}>
              <Calendar size={10} />
              {note.date}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${theme.badgeBg} ${theme.badge}`}>
              <BookOpen size={10} />
              사주노트
            </span>
            {viewCount != null ? (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${theme.badgeBg} ${theme.badge}`}>
                <Eye size={10} />
                {viewCount.toLocaleString()}
              </span>
            ) : null}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight break-keep">
            {note.title}
          </h1>

          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">{note.description}</p>

          <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
        </div>

        {/* 본문 */}
        <article
          className="saju-note-content rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 sm:p-8 shadow-sm"
          onClick={onContentClick}
          dangerouslySetInnerHTML={{ __html: article.contentHtml }}
        />

        {/* 이전/다음 글 네비게이션 */}
        <div className="mt-10 space-y-4">
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />

          <nav aria-label="글 이동" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {prevNote ? (
              <button
                type="button"
                onClick={() => navigate(`/saju-note/read/${prevNote.slug}`)}
                className={`group text-left rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-4 transition-all cursor-pointer ${theme.navHover}`}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <ChevronLeft size={13} className="text-neutral-400 dark:text-neutral-500 group-hover:text-current transition-colors" />
                  <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">이전 글</p>
                </div>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug line-clamp-2">
                  {prevNote.title}
                </p>
              </button>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-center text-xs text-neutral-300 dark:text-neutral-700">
                첫 번째 글입니다.
              </div>
            )}

            {nextNote ? (
              <button
                type="button"
                onClick={() => navigate(`/saju-note/read/${nextNote.slug}`)}
                className={`group text-right rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-4 transition-all cursor-pointer ${theme.navHover}`}
              >
                <div className="flex items-center justify-end gap-1.5 mb-1.5">
                  <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">다음 글</p>
                  <ChevronRight size={13} className="text-neutral-400 dark:text-neutral-500 group-hover:text-current transition-colors" />
                </div>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug line-clamp-2">
                  {nextNote.title}
                </p>
              </button>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800 p-4 flex items-center justify-center text-xs text-neutral-300 dark:text-neutral-700">
                마지막 글입니다.
              </div>
            )}
          </nav>

          <div className="flex justify-center pt-1">
            <button
              type="button"
              onClick={() => navigate("/saju-note")}
              className={`inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer`}
            >
              <ArrowRight size={14} className="rotate-180" />
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
