import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Home, Clock, ArrowRight } from "lucide-react";
import BottomNav from "@/shared/ui/nav/BottomNav";
import { incrementSajuNoteView } from "@/app/saju-note/saveInterface/sajuNoteViewRepo";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { AdsenseInlineSection } from "@/shared/ads/AdsenseInlineSection";
import Footer from "@/app/pages/Footer";

const TIMELINE = [
  {
    num: "01",
    era: "고대 중국",
    period: "선진 ~ 한나라 (기원전 2000년~)",
    content:
      "명리학의 씨앗은 기원전 2천 년경으로 거슬러 올라갑니다. 초기에는 갑을병정(천간)과 자축인묘(지지)로 이루어진 '간지(干支)'가 천문을 관측하고 시간을 기록하는 달력의 역할만 수행했습니다. 이후 기원전 12세기경 주나라 문왕이 우주의 변화를 64괘로 정리한 『주역(周易)』을 완성하며 명리학의 세계관에 큰 영향을 미쳤습니다. 본격적인 사상적 토대가 마련된 것은 기원전 2세기 한나라 시대입니다. 동중서 등의 학자들이 우주의 원리인 음양오행을 유교 정치와 결합하면서, '천지자연의 변화가 곧 인간의 운명과 연결된다'는 천인합일(天人合一)의 사상이 싹트기 시작했습니다.",
    keywords: ["간지(干支)", "주역(周易)", "음양오행", "천인합일(天人合一)"],
  },
  {
    num: "02",
    era: "수·당 시대",
    period: "7세기 전후 (618~907년)",
    content:
      "수나라 말기에서 당나라 초기(7세기 전후)에 이르러 비로소 인간의 명운을 논하는 구체적인 틀이 등장합니다. 원천강이라는 인물이 사람이 태어난 연, 월, 일, 시를 간지로 세워 네 개의 기둥, 즉 '사주(四柱)' 단위로 해석하는 방식을 도입한 것입니다. 이를 사주명리학의 진정한 탄생으로 보기도 합니다. 당대(618~907년)에는 이허중이라는 학자가 기존의 명리법을 정리하여 태어난 해(띠)를 중심으로 운명을 해석하는 이른바 '고법(古法) 사주(삼명학)'의 체계를 확립했습니다.",
    keywords: ["원천강", "사주(四柱)", "이허중", "고법·삼명학"],
  },
  {
    num: "03",
    era: "송·원·명 시대",
    period: "자평명리의 완성 (960~1644년)",
    content:
      "송나라(960~1279년) 시대에 사주학은 혁명적인 변화를 맞이합니다. 서자평이라는 걸출한 인물이 등장해, 태어난 해가 아닌 '태어난 날(일간)'을 나 자신으로 삼는 새로운 해석법을 창안한 것입니다. 이를 고법과 구분하여 '신법(新法) 사주' 또는 '자평명리(子平命理)'라고 부릅니다. 그는 성격과 직업 등을 파악하는 십성(十星)과 격국(格局) 이론을 체계화하였고, 이 원리는 원나라와 명나라(14세기 이후)를 거치며 대중적으로 확산되어 오늘날 사주팔자 해석의 완벽한 표준이 되었습니다.",
    keywords: ["서자평", "일간(日干) 중심", "자평명리(子平命理)", "십성·격국"],
  },
  {
    num: "04",
    era: "한반도 유입",
    period: "고려의 수용 ~ 조선의 관학(官學)",
    content:
      "사주명리가 한반도에 들어온 것은 삼국시대에서 고려 시대로 추정됩니다. 특히 8~9세기 당나라에 다녀온 유학생과 승려들을 통해 초기 이론이 전해졌을 가능성이 높습니다. 조선 시대에 들어서면 사주는 국가적 차원의 엘리트 학문으로 격상됩니다. 15세기 조선 전기, 태종 1년(1401년)의 기록을 시작으로 서거정의 『오행총괄』 등 관련 저술이 등장했습니다. 특히 남송 시대 서대승이 쓴 명리서가 조선의 법전인 『경국대전』에 국가 고시(명과학) 시험 과목으로 공식 채택될 만큼, 국가의 길흉을 예측하는 핵심 실무 학문으로 인정받았습니다.",
    keywords: ["고려 유입", "조선 관학", "명과학 시험", "경국대전"],
  },
  {
    num: "05",
    era: "조선 후기 ~ 현대",
    period: "대중화와 현대적 재해석 (18세기~)",
    content:
      "조선 후기로 갈수록 사주는 양반층을 넘어 민간으로 깊숙이 스며들어, 관혼상제, 궁합, 작명 등 생활 전반의 중대사를 결정하는 필수 도구가 되었습니다. 근현대에 서양 문물이 유입되는 격변기 속에서도 끈질기게 살아남았으며, 오늘날 동아시아에서는 전통 철학과 상담 심리학의 경계에서 '자아 탐구와 진로 설정을 위한 통계적 인생 내비게이션'으로 활발히 재해석되고 있습니다.",
    keywords: ["민간 대중화", "관혼상제·궁합", "현대 명리", "자아 탐구"],
  },
];

export default function SajuNoteHistory1Page() {
  const navigate = useNavigate();
  const showAds = useEntitlementsStore((s) => s.shouldShowAdsNow());

  useEffect(() => {
    void incrementSajuNoteView("history-1");
  }, []);

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
              사주 역사 1부 — 타임라인
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
              <Clock size={10} />
              역사
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50 text-amber-700 dark:text-amber-300">
              1부 / 2부
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-50 leading-tight break-keep">
            사주 역사의 타임라인
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed">
            우주의 섭리를 인간의 삶에 담다 — 기원전 2000년 간지(干支)의 탄생부터 현대의 재해석까지, 5000년 명리 역사를 다섯 장면으로 정리했습니다.
          </p>
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
        </div>

        {/* 타임라인 */}
        <div className="relative">
          {/* 세로선 */}
          <div className="absolute z-0 left-[22px] sm:left-[26px] top-0 bottom-0 w-px bg-gradient-to-b from-amber-300 via-amber-200 to-transparent dark:from-amber-700 dark:via-amber-800/50 dark:to-transparent" />

          <div className="space-y-8">
            {TIMELINE.map((item, idx) => (
              <div key={idx} className="relative flex gap-5 sm:gap-7">
                {/* 타임라인 닷 */}
                <div className="relative z-10 shrink-0 flex flex-col items-center">
                  <div className="rounded-full bg-neutral-50 dark:bg-neutral-950 p-1">
                    <div className="w-11 h-11 sm:w-[52px] sm:h-[52px] rounded-full bg-amber-100 dark:bg-amber-900/40 border-2 border-amber-300 dark:border-amber-700 flex items-center justify-center shadow-sm">
                      <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300">{item.num}</span>
                    </div>
                  </div>
                </div>

                {/* 카드 */}
                <div className="flex-1 min-w-0 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 p-5 sm:p-6 shadow-sm mb-1">
                  <div className="mb-3 space-y-0.5">
                    <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide">
                      {item.period}
                    </p>
                    <h2 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-neutral-50">
                      {item.era}
                    </h2>
                  </div>

                  <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed break-keep">
                    {item.content}
                  </p>

                  {/* 키워드 뱃지 */}
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 2부로 이동 */}
        <div className="mt-12 space-y-4">
          <div className="h-px bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent" />
          <div className="flex justify-between items-center">
            <button
              type="button"
              onClick={() => navigate("/saju-note")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors cursor-pointer"
            >
              <ArrowRight size={14} className="rotate-180" />
              목록으로
            </button>
            <button
              type="button"
              onClick={() => navigate("/saju-note/history-2")}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 text-sm font-bold hover:bg-amber-200 dark:hover:bg-amber-900/60 transition-colors cursor-pointer"
            >
              2부 — 명리 고전으로
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
        <AdsenseInlineSection enabled={showAds} containerClassName="pt-2" maxWidthPx={760} />
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
