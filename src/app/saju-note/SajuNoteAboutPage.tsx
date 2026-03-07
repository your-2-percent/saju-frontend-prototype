// src/app/saju-note/SajuNoteAboutPage.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, ExternalLink, Sparkles, Star } from "lucide-react";
import BottomNav from "@/shared/ui/nav/BottomNav";
import { incrementSajuNoteView } from "@/app/saju-note/saveInterface/sajuNoteViewRepo";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { AdsenseInlineSection } from "@/shared/ads/AdsenseInlineSection";
import Footer from "@/app/pages/Footer";

export default function SajuNoteAboutPage() {
  const navigate = useNavigate();
  const showAds = useEntitlementsStore((s) => s.shouldShowAdsNow());

  useEffect(() => {
    void incrementSajuNoteView("about");
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-28">
      {/* 배경 그라데이션 */}
      <div className="fixed top-0 left-0 right-0 h-72 bg-gradient-to-b from-purple-100/60 via-indigo-50/30 to-transparent dark:from-purple-950/30 dark:via-indigo-950/10 dark:to-transparent pointer-events-none z-0" />

      {/* 헤더 */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md border-b border-neutral-200/70 dark:border-neutral-800/70 px-4">
        <div className="max-w-[680px] mx-auto h-12 sm:h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/saju-note")}
            aria-label="뒤로가기"
            className="p-2 rounded-full text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen size={16} className="text-purple-500 dark:text-purple-400" />
            <h1 className="text-sm sm:text-base font-bold tracking-tight">사이트 소개</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[680px] mx-auto px-4 py-8 space-y-6">

        {/* 히어로 카드 — 묘운과 현묘 */}
        <section className="rounded-3xl border border-purple-200/80 dark:border-purple-800/50 bg-gradient-to-br from-purple-50 via-indigo-50/60 to-white dark:from-purple-950/40 dark:via-indigo-950/20 dark:to-neutral-900/60 p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-9 h-9 rounded-2xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
              <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-purple-500 dark:text-purple-400 uppercase tracking-widest mb-1">묘운 만세력</p>
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100 leading-snug">
                현묘의 관법을 기반으로 제작된 서비스
              </h2>
            </div>
          </div>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            본 서비스의 <strong>인시일수론</strong> 및 <strong>묘운력</strong>은{" "}
            <strong className="text-purple-600 dark:text-purple-400">현묘</strong>의 관법을 기반으로 제작되었습니다.
          </p>
          <div className="pt-1 space-y-2">
            <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wide">현묘 관련 링크</p>
            <div className="flex flex-col gap-2">
              <a
                href="https://yavares.tistory.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors group"
              >
                <ExternalLink size={13} className="shrink-0" />
                현묘 블로그 : 안녕, 사주명리
                <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>
              <a
                href="https://5seasons.co.kr/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors group"
              >
                <ExternalLink size={13} className="shrink-0" />
                현묘 제자들의 상담, 파이브 시즌스
                <ArrowRight size={11} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
              </a>
            </div>
          </div>
        </section>

        {/* 인시일수론 */}
        <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300 tracking-wide uppercase">관법</span>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">인시일수론(寅時日首論)</h2>
          </div>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            기존의 "하루는 자시에 시작"된다는 틀을 깬,{" "}
            <span className="text-purple-600 dark:text-purple-400 font-medium">현묘</span>의 관법입니다.
            인시(寅時, 새벽 3~5시)에 하루가 시작된다는 이론입니다.
          </p>
          <a
            href="https://yavares.tistory.com/1013"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
          >
            <ExternalLink size={12} />
            현묘 블로그 : 인시일수론에 대해
          </a>
        </section>

        {/* 묘운력 */}
        <section className="rounded-2xl border border-indigo-200/70 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 tracking-wide uppercase">관법</span>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">묘운력(妙運曆)</h2>
          </div>
          <div className="space-y-1.5 text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            <p>기존 대운을 8자로 확장한 <span className="text-purple-600 dark:text-purple-400 font-medium">현묘</span>의 관법입니다.</p>
            <p>기존에 보던 대운은 대운 8자의 월주에 해당합니다. 운을 제대로 보려면 대운도 8자로 확장해야 한다는 게 현묘의 주장입니다.</p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/saju-note/myounlyeok")}
            className="inline-flex items-center gap-1.5 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-medium transition-colors cursor-pointer group"
          >
            묘운력 상세설명 보러가기
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        </section>

        {/* 서비스 개요 */}
        <section className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-5 space-y-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">서비스 개요</h2>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">현묘의 제자가 만든, 현묘의 관법을 녹여낸 묘운 만세력</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              {
                label: "Basic",
                color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/50",
                desc: "(개인 고유) 사주원국 · 대운 · 묘운 · 궁합모드, (전체) 세운 · 월운 · 일운",
              },
              {
                label: "Detail",
                color: "text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/50",
                desc: "피커로 상세 조정하여 날짜마다 운 확인 가능, 일운 달력 넘겨보기 가능",
              },
              {
                label: "Set",
                color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/50",
                desc: "테마 · 지장간 표시 · 십이신살 기준 · 간지 한글/한자 · 음간 굵기 · 표시항목 ON/OFF · 대운 기준(정밀/표준) 등",
              },
              {
                label: "Ect",
                color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/50",
                desc: "명식 저장 · 수정 · 삭제 · 관리 / 비로그인: LocalStorage 저장 / 로그인: DB 저장 및 기기 간 동기화",
              },
            ].map(({ label, color, desc }) => (
              <div key={label} className={`flex gap-3 rounded-xl border px-3.5 py-3 ${color}`}>
                <span className="shrink-0 text-xs font-bold w-12">{label}</span>
                <span className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-red-500 dark:text-red-400 font-medium leading-relaxed border-t border-neutral-100 dark:border-neutral-800 pt-3">
            ※ 사이트 이용은 자유이나, 사주풀이 · 궁합풀이 · 운풀이 등은 모두 사용자에게 권한과 책임이 있습니다.
          </p>
        </section>

        {/* 제작자 소개 */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Star size={14} className="text-amber-500 dark:text-amber-400" />
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">제작자 소개</h2>
          </div>

          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-5 space-y-3">
            <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest">이력</p>
            <ul className="space-y-1.5 text-sm text-neutral-700 dark:text-neutral-300">
              <li className="flex gap-2">
                <span className="text-neutral-300 dark:text-neutral-600 shrink-0">·</span>
                <span>2017 ~ ing 웹 퍼블리셔 (현: 웹 퍼블리싱 프리랜서)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-300 dark:text-neutral-600 shrink-0">·</span>
                <span>2024년 9월 현묘 강의 5기 계유반 (전)반장 ~ 전문반까지 수료</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-300 dark:text-neutral-600 shrink-0">·</span>
                <span>2024년 4월경부터 독학 시작, 2024년 9월경부터 유료 상담 시작</span>
              </li>
              <li className="flex gap-2">
                <span className="text-neutral-300 dark:text-neutral-600 shrink-0">·</span>
                <span>유/무료 상담(지인 포함) 건수 전부 포함 300건 이상</span>
              </li>
            </ul>
          </div>

          <div className="rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-neutral-900/50 p-5 space-y-2">
            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">이 사이트의 개요</p>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              현묘쌤의 수업을 듣고, 묘운력이 어떻게 작용하는지 궁금해서 사이트를 만들게 되었습니다.
              처음에는 스스로의 호기심에 답하기 위해 만들었으나, 많은 분들께서 이용하시면 더 좋다고 생각했습니다.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-neutral-900/50 p-5 space-y-2">
            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">이 사이트의 장점</p>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              웹 퍼블리셔 출신으로서, UI/UX에 신경을 많이 쓴 편입니다.
              대운수, 썸머타임, 경도에 의한 균시차 계산, 해외 절기 등 디테일한 부분까지 꼼꼼히 구현했습니다.
            </p>
          </div>

          <div className="rounded-2xl border border-purple-100 dark:border-purple-900/40 bg-white dark:bg-neutral-900/50 p-5 space-y-2">
            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">이 사이트의 독창성</p>
            <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
              현묘쌤의 관법(묘운력, 인시일수론)이 들어간 유일무이한 사이트라는 것이
              이 사이트의 아이덴티티입니다 :)
            </p>
          </div>
        </section>

        {/* 앞으로의 계획 */}
        <section className="rounded-2xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-br from-amber-50 to-orange-50/70 dark:from-amber-950/30 dark:to-orange-950/20 p-5 space-y-2.5">
          <h2 className="text-sm font-bold text-amber-700 dark:text-amber-400">앞으로의 계획</h2>
          <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">
            만세력 기능은 유지하면서, 유지/보수와 함께 블로그로도 운영할 예정입니다!
          </p>
          <p className="text-sm text-neutral-700 dark:text-neutral-300">
            유지/보수 건은{" "}
            <a
              href="mailto:unique950318@gmail.com"
              className="text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300 transition-colors font-medium"
            >
              unique950318@gmail.com
            </a>
            으로 메일 주세요!
          </p>
        </section>

        <AdsenseInlineSection enabled={showAds} containerClassName="pt-2" maxWidthPx={640} />
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
