import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Search, Info, Layers, PenLine, Clock, Sun } from "lucide-react";
import BottomNav from "@/shared/ui/nav/BottomNav";
import { SAJU_NOTE_CATEGORIES } from "@/app/saju-note/sajuNoteCatalog";
import { fetchSajuNoteViewCounts } from "@/app/saju-note/saveInterface/sajuNoteViewRepo";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { AdsenseInlineSection } from "@/shared/ads/AdsenseInlineSection";
import Footer from "@/app/pages/Footer";

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

type StaticPage = {
  section: "about" | "prolog" | "history";
  slug: string;
  path: string;
  title: string;
  description: string;
  badge: string;
  badgeClass: string;
  borderClass: string;
  hoverClass: string;
};

const STATIC_PAGES: StaticPage[] = [
  {
    section: "about",
    slug: "about",
    path: "/saju-note/about",
    title: "사이트 소개 & 제작자",
    description: "묘운 만세력이 어떻게 만들어졌는지, 현묘의 관법과 제작자 이력 소개.",
    badge: "About",
    badgeClass: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    borderClass: "border-purple-200 dark:border-purple-800/60",
    hoverClass: "hover:border-purple-300 dark:hover:border-purple-700",
  },
  {
    section: "about",
    slug: "myounlyeok",
    path: "/saju-note/myounlyeok",
    title: "묘운력(妙運曆) 상세설명",
    description: "기존 대운을 8자로 확장한 현묘의 관법 — 묘운력의 원리와 읽는 방법을 설명합니다.",
    badge: "묘운",
    badgeClass: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
    borderClass: "border-indigo-200 dark:border-indigo-800/60",
    hoverClass: "hover:border-indigo-300 dark:hover:border-indigo-700",
  },
  {
    section: "prolog",
    slug: "prolog",
    path: "/saju-note/prolog",
    title: "주인장 머릿속 끄적끄적",
    description: "사주를 공부하며 문득 스쳐가는 것들 — 이론도 임상도 아닌, 주인장이 심심해서 적는 글들",
    badge: "끄적끄적",
    badgeClass: "bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300",
    borderClass: "border-rose-200 dark:border-rose-800/60",
    hoverClass: "hover:border-rose-300 dark:hover:border-rose-700",
  },
  {
    section: "history",
    slug: "history-1",
    path: "/saju-note/history-1",
    title: "사주 역사의 타임라인",
    description: "간지·주역·음양오행부터 조선의 관학까지 — 5000년 명리 역사를 다섯 장면으로 정리했습니다.",
    badge: "역사",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    borderClass: "border-amber-200 dark:border-amber-800/60",
    hoverClass: "hover:border-amber-300 dark:hover:border-amber-700",
  },
  {
    section: "history",
    slug: "history-2",
    path: "/saju-note/history-2",
    title: "명리를 완성한 위대한 고전들",
    description: "자평진전·궁통보감·적천수부터 사주첩경까지 — 현대 사주 공부의 뼈대가 되는 명리 고전을 소개합니다.",
    badge: "고전",
    badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
    borderClass: "border-amber-200 dark:border-amber-800/60",
    hoverClass: "hover:border-amber-300 dark:hover:border-amber-700",
  },
];

export default function SajuNotePage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [viewCountBySlug, setViewCountBySlug] = useState<Record<string, number>>({});
  const showAds = useEntitlementsStore((s) => s.shouldShowAdsNow());

  const allNoteSlugs = useMemo(
    () => [
      ...SAJU_NOTE_CATEGORIES.flatMap((category) => category.items.map((item) => item.slug)),
      ...STATIC_PAGES.map((page) => page.slug),
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const counts = await fetchSajuNoteViewCounts(allNoteSlugs);
      if (!cancelled) setViewCountBySlug(counts);
    })();
    return () => {
      cancelled = true;
    };
  }, [allNoteSlugs]);

  const filteredCategories = useMemo(() => {
    const q = normalize(query);
    if (!q) return SAJU_NOTE_CATEGORIES;

    return SAJU_NOTE_CATEGORIES.map((category) => {
      const categoryText = normalize(`${category.title} ${category.subtitle} ${category.description}`);
      if (categoryText.includes(q)) return category;

      return {
        ...category,
        items: category.items.filter((item) => {
          const itemText = normalize(`${item.title} ${item.description} ${item.date}`);
          return itemText.includes(q);
        }),
      };
    }).filter((category) => category.items.length > 0);
  }, [query]);

  const filteredStaticPages = useMemo(() => {
    const q = normalize(query);
    if (!q) return STATIC_PAGES;
    return STATIC_PAGES.filter((p) => normalize(`${p.title} ${p.description} ${p.badge}`).includes(q));
  }, [query]);

  const aboutPages = filteredStaticPages.filter((p) => p.section === "about");
  const prologPages = filteredStaticPages.filter((p) => p.section === "prolog");
  const historyPages = filteredStaticPages.filter((p) => p.section === "history");
  const conceptCategories = filteredCategories.filter((category) => !category.key.startsWith("saju-misc"));
  const miscCategories = filteredCategories.filter((category) => category.key.startsWith("saju-misc"));

  const isEmpty =
    conceptCategories.length === 0 &&
    miscCategories.length === 0 &&
    filteredStaticPages.length === 0;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-28">
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-neutral-950/90 backdrop-blur border-b border-neutral-200 dark:border-neutral-800 px-4">
        <div className="max-w-[900px] mx-auto h-12 sm:h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로가기"
            className="p-2 rounded-full text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen size={17} className="text-indigo-500 dark:text-indigo-400" />
            <h1 className="text-sm sm:text-base font-bold tracking-tight">사주노트</h1>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-4 py-7 space-y-10">
        <div className="space-y-2">
          <p className="text-xs text-neutral-400 dark:text-neutral-500">
            myowoon-saju 블로그 — 사주 자료모음 / 관법소개 / 끄적끄적
          </p>
          <label className="relative block">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="검색 (예: 오행, 십신, 형충회합, 묘운…)"
              className="w-full rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 pl-10 pr-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-300 dark:focus:ring-indigo-700 placeholder:text-neutral-400 dark:placeholder:text-neutral-600"
            />
          </label>
        </div>

        <AdsenseInlineSection
          enabled={showAds}
          containerClassName="max-w-[780px] mx-auto"
          maxWidthPx={780}
        />

        {aboutPages.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Info size={15} className="text-purple-500 dark:text-purple-400" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">사이트 아이덴티티</h2>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">— 사이트 소개 & 현묘 관법</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {aboutPages.map((page) => (
                <button
                  key={page.path}
                  type="button"
                  onClick={() => navigate(page.path)}
                  className={`group text-left rounded-2xl border ${page.borderClass} ${page.hoverClass} bg-white dark:bg-neutral-900/50 px-4 py-4 space-y-2 transition-all cursor-pointer hover:shadow-sm`}
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${page.badgeClass}`}>
                    {page.badge}
                  </span>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">{page.title}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{page.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      조회수 {(viewCountBySlug[page.slug] ?? 0).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                      보러가기 <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {conceptCategories.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Layers size={15} className="text-indigo-500 dark:text-indigo-400" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">사주에 대한 기본 개념들</h2>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">— 사주 기초 개념 정리</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {conceptCategories.map((category) => (
                <div
                  key={category.key}
                  className={`rounded-2xl border ${category.borderClass} bg-white dark:bg-neutral-900/50 p-4 space-y-3`}
                >
                  <div className="space-y-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${category.badgeClass}`}>
                      {category.title}
                    </span>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed">{category.description}</p>
                  </div>

                  <ul className="space-y-2">
                    {category.items.map((item) => (
                      <li key={item.slug}>
                        <button
                          type="button"
                          onClick={() => navigate(`/saju-note/read/${item.slug}`)}
                          className="group w-full text-left rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-3 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all cursor-pointer"
                        >
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">{item.title}</p>
                          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">{item.description}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                              {item.date} · 조회수 {(viewCountBySlug[item.slug] ?? 0).toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              읽기 <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {miscCategories.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Sun size={15} className="text-orange-500 dark:text-orange-400" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                기타 - 주인장이 생각하는 내용들
              </h2>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">시간 보정과 배경 지식</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {miscCategories.map((category) => (
                <div
                  key={category.key}
                  className={`rounded-2xl border ${category.borderClass} bg-white dark:bg-neutral-900/50 p-4 space-y-3`}
                >
                  <div className="space-y-1">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${category.badgeClass}`}>
                      {category.title}
                    </span>
                    <p className="text-[11px] text-neutral-400 dark:text-neutral-500 leading-relaxed">{category.description}</p>
                  </div>

                  <ul className="space-y-2">
                    {category.items.map((item) => (
                      <li key={item.slug}>
                        <button
                          type="button"
                          onClick={() => navigate(`/saju-note/read/${item.slug}`)}
                          className="group w-full text-left rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 px-3.5 py-3 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-950/30 transition-all cursor-pointer"
                        >
                          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">{item.title}</p>
                          <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed line-clamp-2">{item.description}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                              {item.date} · 조회수 {(viewCountBySlug[item.slug] ?? 0).toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors">
                              읽기 <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {historyPages.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock size={15} className="text-amber-500 dark:text-amber-400" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">사주 역사</h2>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">— 역사와 고전 문헌</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {historyPages.map((page) => (
                <button
                  key={page.path}
                  type="button"
                  onClick={() => navigate(page.path)}
                  className={`group text-left rounded-2xl border ${page.borderClass} ${page.hoverClass} bg-white dark:bg-neutral-900/50 px-4 py-4 space-y-2 transition-all cursor-pointer hover:shadow-sm`}
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${page.badgeClass}`}>
                    {page.badge}
                  </span>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">{page.title}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{page.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      조회수 {(viewCountBySlug[page.slug] ?? 0).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      보러가기 <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {prologPages.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <PenLine size={15} className="text-rose-500 dark:text-rose-400" />
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">끄적끄적</h2>
              <span className="text-xs text-neutral-400 dark:text-neutral-500">— 주인장의 잡념·단상</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {prologPages.map((page) => (
                <button
                  key={page.path}
                  type="button"
                  onClick={() => navigate(page.path)}
                  className={`group text-left rounded-2xl border ${page.borderClass} ${page.hoverClass} bg-white dark:bg-neutral-900/50 px-4 py-4 space-y-2 transition-all cursor-pointer hover:shadow-sm`}
                >
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${page.badgeClass}`}>
                    {page.badge}
                  </span>
                  <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug">{page.title}</p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">{page.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
                      조회수 {(viewCountBySlug[page.slug] ?? 0).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                      읽어보기 <ArrowRight size={11} className="group-hover:translate-x-0.5 transition-transform" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {isEmpty && (
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 p-5 text-sm text-neutral-500 dark:text-neutral-400 text-center">
            검색 결과가 없습니다.
          </div>
        )}
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
