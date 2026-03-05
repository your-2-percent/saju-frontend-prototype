// src/app/saju-note/SajuNotePrologPage.tsx
import { useNavigate } from "react-router-dom";
import { ArrowLeft, PenLine } from "lucide-react";
import BottomNav from "@/shared/ui/nav/BottomNav";

const entries = [
  {
    num: "01",
    title: "내가 사주에 갑자기 관심을 가지게 된 건, 자유귀문의 영향인가.",
    paragraphs: [
      "일단, 내가 만든 로직에 의하면, 내 대운은 24년부터 정유 대운인데(정밀대운에 의하면), 자유파와 자유 귀문이 삼연타를 맞는다. 지지(자수삼존)의 명식 소유자 ^-^",
      "진짜 신기하게, 진년 진월 (갑진년 - 24년, 4월 - 진월)에 이 공부를 시작했고, 경금일주인 나는, 토가 없는 무인성 사주다.",
      "토기운(인성)의 영향인가, 아니면 자유파와 자유귀문의 영향인가. 끝나간 무술대운이 주는 마지막 선물이었나.",
    ],
  },
  {
    num: "02",
    title: "경자월, 경자일의 명식을 가진 내가, 경자년에 지금 남편을 만난건 우연일까.",
    paragraphs: [
      "경자월 경자일부터 예사롭지 않다. 내 명식이지만 별난 명식이라고 생각한다. 근데 또 경자년에 지금 남편을 만났다. 게다가 그전에는 아예 연애를 해본 적이 없었다.",
      "경자월 경자일 + 세운의 경자년은 내 겨울 속에서 살아가던, 나를 위한 구원인가. 살고 싶어서 몸부림치면서 따뜻한 봄을 찾아가던 여정 속의 오아시스인가.",
    ],
  },
];

export default function SajuNotePrologPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-28">
      {/* 배경 그라데이션 */}
      <div className="fixed top-0 left-0 right-0 h-72 bg-gradient-to-b from-rose-100/50 via-pink-50/20 to-transparent dark:from-rose-950/25 dark:via-pink-950/10 dark:to-transparent pointer-events-none z-0" />

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
            <PenLine size={16} className="text-rose-400 dark:text-rose-400" />
            <h1 className="text-sm sm:text-base font-bold tracking-tight">주인장 머릿속 끄적끄적</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[680px] mx-auto px-4 py-10 space-y-8">
        {/* 인트로 */}
        <div className="text-center space-y-1">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 italic tracking-wide">
            — 사주를 공부하며 문득 스쳐가는 것들
          </p>
          <p className="text-[11px] text-neutral-300 dark:text-neutral-600">이론도 임상도 아닌, 그냥 솔직한 이야기.</p>
        </div>

        {/* 글 목록 */}
        <div className="space-y-6">
          {entries.map(({ num, title, paragraphs }) => (
            <article
              key={num}
              className="relative rounded-2xl border border-rose-100 dark:border-rose-900/30 bg-white dark:bg-neutral-900/50 overflow-hidden"
            >
              {/* 왼쪽 포인트 라인 */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-rose-300 via-rose-200 to-rose-100 dark:from-rose-600/70 dark:via-rose-700/40 dark:to-transparent" />

              <div className="pl-6 pr-5 py-5 space-y-3">
                {/* 번호 + 제목 */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-bold text-rose-300 dark:text-rose-600 tracking-widest">#{num}</span>
                  <h2 className="text-sm font-bold leading-snug text-neutral-800 dark:text-neutral-100 break-keep">
                    {title}
                  </h2>
                </div>

                {/* 구분선 */}
                <div className="h-px bg-rose-50 dark:bg-neutral-800" />

                {/* 본문 */}
                <div className="space-y-2.5">
                  {paragraphs.map((text, j) => (
                    <p key={j} className="text-sm leading-relaxed text-neutral-600 dark:text-neutral-400">
                      {text}
                    </p>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* 하단 */}
        <div className="text-center">
          <p className="text-[11px] text-neutral-300 dark:text-neutral-600 italic">계속 업데이트될 예정입니다 :)</p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
