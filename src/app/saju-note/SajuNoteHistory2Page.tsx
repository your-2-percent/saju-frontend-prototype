import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, BookMarked, ArrowRight } from "lucide-react";
import BottomNav from "@/shared/ui/nav/BottomNav";

type BookEntry = {
  title: string;
  subtitle?: string;
  description: string;
};

type BookSection = {
  sectionNum: string;
  sectionTitle: string;
  books: BookEntry[];
  tip?: string;
};

const BOOK_SECTIONS: BookSection[] = [
  {
    sectionNum: "1",
    sectionTitle: "자평명리 이전의 원형: 삼명학 계열",
    books: [
      {
        title: "이허중명서(李虛中命書)",
        subtitle: "수·당 시대",
        description:
          "수·당 시대 이허중의 사상이 담긴 고전으로, 태어난 날이 아닌 '연, 월, 일' 중심으로 운명을 보았던 초기 사주의 형태를 보여줍니다. 후대 학자들의 주석을 통해 현대 명리로 이어지는 징검다리 역할을 합니다.",
      },
      {
        title: "낙록자부(珞琭子賦)",
        subtitle: "전국시대",
        description:
          "전국시대 낙록자의 사상이 담긴 고전으로, 이허중명서와 함께 자평명리 성립 이전 삼명학의 원형을 엿볼 수 있는 중요한 문헌입니다.",
      },
    ],
  },
  {
    sectionNum: "2",
    sectionTitle: "명리학의 교과서: 3대 명리 고전",
    tip: "학습 순서 추천: 논리적인 『자평진전』으로 틀을 잡고 → 『궁통보감』으로 자연의 이치를 깨달은 뒤 → 『적천수』로 철학적 깊이를 더하세요.",
    books: [
      {
        title: "자평진전(子平眞詮)",
        subtitle: "심효첨 저",
        description:
          "사주의 뼈대인 격국(格局)과 사주를 살리는 핵심 기운인 용신(用神)을 논리적으로 정리한 책입니다. 일간 중심 패러다임의 정점에 있는 가장 체계적인 교과서입니다.",
      },
      {
        title: "궁통보감(窮通寶鑑)",
        subtitle: "난강망",
        description:
          "사주를 하나의 자연에 빗대어 온도와 습도(조후, 調候)를 중시하는 책입니다. 태어난 계절과 일간의 조화를 입체적으로 바라보는 시각을 길러줍니다.",
      },
      {
        title: "적천수(滴天髓)",
        description:
          "사주의 철학적 원리, 오행의 흐름, 인간의 성정과 부귀빈천을 압축적인 시구체로 담아낸 총론서입니다. 내용이 심오하여 전체적인 세계관을 통찰하는 데 필수적입니다.",
      },
    ],
  },
  {
    sectionNum: "3",
    sectionTitle: "자평명리의 뼈대를 세운 책들",
    books: [
      {
        title: "연해자평(淵海子平)",
        description:
          "자평명리의 이론을 최초로 집대성한 실무형 고전으로, 후대 모든 사주 서적의 뿌리가 되었습니다.",
      },
      {
        title: "명리정종(命理正宗)",
        subtitle: "명나라",
        description:
          "명나라 시대에 발간된 이 책은 당시 난립하던 다양한 학파의 이론을 비판적으로 종합하고 백과사전처럼 총망라하여 정통 명리학의 체계를 굳건히 세웠습니다.",
      },
      {
        title: "삼명통회(三命通會)",
        subtitle: "명나라",
        description:
          "명리정종과 함께 명나라 시대를 대표하는 종합 명리서로, 각종 이론과 사례를 방대하게 수록하여 당시 명리학의 전체를 조망할 수 있는 백과사전적 저작입니다.",
      },
    ],
  },
  {
    sectionNum: "4",
    sectionTitle: "청나라 이후의 심화와 한국의 고전",
    books: [
      {
        title: "명리약언(命理約言)",
        subtitle: "청나라 · 진소암 저",
        description:
          "청나라 시대 진소암의 저작으로 오행의 균형(억부론)을 중시하며 후대에 큰 영향을 미쳤습니다. 특히 원문이 어려운 『적천수』와 『자평진전』은 임철초·서락오 등 후대 학자들의 상세한 주석서(적천수천미, 자평진전평주 등)를 통해 비로소 실전 학문으로 만개했습니다.",
      },
      {
        title: "사주첩경(四柱捷徑)",
        subtitle: "이석영 저 · 한국 명리의 집대성",
        description:
          "한국 명리학계의 '동의보감'으로 불리는 명저입니다. 중국의 고전 이론들을 한국의 실제 실전 사례와 결합하여 현대 한국어로 탁월하게 재구성해 낸, 한국 명리 발전의 기념비적인 저작입니다.",
      },
    ],
  },
];

export default function SajuNoteHistory2Page() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-28">
      {/* 배경 글로우 */}
      <div className="fixed top-0 left-0 right-0 h-80 bg-gradient-to-b from-amber-100/60 via-yellow-50/20 to-transparent dark:from-amber-950/25 dark:via-yellow-950/10 dark:to-transparent pointer-events-none z-0" />

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
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold truncate text-neutral-700 dark:text-neutral-200">
              사주 역사 2부 — 명리 고전
            </p>
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
        {/* 히어로 */}
        <div className="mb-10 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300">
              <BookMarked size={10} />
              고전
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300">
              2부 / 2부
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight break-keep">
            명리를 완성한 위대한 고전들
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            사주의 고전은 크게 서자평 이전의 '삼명학(고법)'과 서자평 이후의 '자평명리(신법)'로 나뉩니다. 현대 사주 공부의 뼈대가 되는 핵심 서적들을 소개합니다.
          </p>
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
        </div>

        {/* 고전 섹션들 */}
        <div className="space-y-10">
          {BOOK_SECTIONS.map((section) => (
            <div key={section.sectionNum} className="space-y-4">
              {/* 섹션 헤더 */}
              <div className="flex items-center gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 dark:bg-amber-600 text-white text-[11px] font-extrabold flex items-center justify-center">
                  {section.sectionNum}
                </span>
                <h2 className="text-sm sm:text-base font-extrabold text-neutral-900 dark:text-neutral-100 break-keep">
                  {section.sectionTitle}
                </h2>
              </div>

              {/* 팁 박스 */}
              {section.tip && (
                <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-3">
                  <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed break-keep">
                    {section.tip}
                  </p>
                </div>
              )}

              {/* 도서 카드들 */}
              <div className="space-y-3">
                {section.books.map((book) => (
                  <div
                    key={book.title}
                    className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 px-5 py-4 shadow-sm"
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <div className="w-1 shrink-0 self-stretch rounded-full bg-amber-400 dark:bg-amber-600" />
                      <div>
                        <p className="text-sm font-extrabold text-neutral-900 dark:text-neutral-50 break-keep">
                          {book.title}
                        </p>
                        {book.subtitle && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                            {book.subtitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed break-keep pl-3">
                      {book.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 하단 네비 */}
        <div className="mt-12 space-y-4">
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => navigate("/saju-note/history-1")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm font-bold hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
            >
              <ArrowRight size={14} className="rotate-180" />
              1부 — 타임라인으로
            </button>
            <button
              type="button"
              onClick={() => navigate("/saju-note")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
            >
              목록으로
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
