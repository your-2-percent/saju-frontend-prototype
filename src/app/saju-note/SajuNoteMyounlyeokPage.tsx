// src/app/saju-note/SajuNoteMyounlyeokPage.tsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen } from "lucide-react";
import BottomNav from "@/shared/ui/nav/BottomNav";
import { incrementSajuNoteView } from "@/app/saju-note/saveInterface/sajuNoteViewRepo";
import { useEntitlementsStore } from "@/shared/lib/hooks/useEntitlementsStore";
import { AdsenseInlineSection } from "@/shared/ads/AdsenseInlineSection";
import Footer from "@/app/pages/Footer";

const pillars = ["작용시간", "연주", "월주", "일주", "시주", "현재시간"] as const;

function GanjiTable({
  rows,
  caption,
  highlightCol,
}: {
  rows: string[][];
  caption?: string;
  highlightCol?: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700/70">
        <table className="w-full text-xs min-w-[480px]">
          <thead>
            <tr className="bg-neutral-100 dark:bg-neutral-800/80">
              {pillars.map((h, i) => (
                <th
                  key={h}
                  className={`px-3 py-2.5 text-center font-semibold text-neutral-600 dark:text-neutral-300 whitespace-nowrap border-b border-neutral-200 dark:border-neutral-700/70 ${highlightCol === i ? "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300" : ""}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr
                key={ri}
                className={`border-b last:border-0 border-neutral-100 dark:border-neutral-800/60 ${ri % 2 === 0 ? "bg-white dark:bg-neutral-900/30" : "bg-neutral-50/70 dark:bg-neutral-800/20"}`}
              >
                {row.map((cell, ci) => (
                  <td
                    key={ci}
                    className={`px-3 py-2.5 text-center whitespace-nowrap text-neutral-800 dark:text-neutral-200 ${highlightCol === ci ? "font-bold text-purple-700 dark:text-purple-300 bg-purple-50/70 dark:bg-purple-900/20" : ""}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && (
        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 px-1 italic">{caption}</p>
      )}
    </div>
  );
}

function FormulaBox() {
  const items = [
    { left: "1년", right: "120년" },
    { left: "1개월", right: "10년" },
    { left: "1일", right: "4개월" },
    { left: "2시간", right: "10일" },
  ];
  return (
    <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/60 dark:border-amber-800/60 dark:from-amber-950/40 dark:to-orange-950/20 px-5 py-4">
      <p className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-3 uppercase tracking-wide">현묘의 비율 공식</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 max-w-[200px]">
        {items.map(({ left, right }) => (
          <div key={left} className="contents">
            <span className="text-sm font-bold text-neutral-800 dark:text-neutral-200 text-right">{left}</span>
            <span className="text-sm text-neutral-600 dark:text-neutral-400">= {right}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border-l-4 border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800/40 pl-4 pr-4 py-3 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
      {children}
    </div>
  );
}

function Section({ title, accent, children }: { title?: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <section
      className={`rounded-2xl border p-5 space-y-3.5 ${
        accent
          ? "border-purple-200/80 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/60 to-indigo-50/40 dark:from-purple-950/30 dark:to-indigo-950/20"
          : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50"
      }`}
    >
      {title && (
        <h2 className={`text-sm font-bold leading-snug ${accent ? "text-purple-800 dark:text-purple-300" : "text-neutral-900 dark:text-neutral-100"}`}>
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300">{children}</p>;
}

export default function SajuNoteMyounlyeokPage() {
  const navigate = useNavigate();
  const showAds = useEntitlementsStore((s) => s.shouldShowAdsNow());

  useEffect(() => {
    void incrementSajuNoteView("myounlyeok");
  }, []);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 pb-28">
      {/* 배경 그라데이션 */}
      <div className="fixed top-0 left-0 right-0 h-72 bg-gradient-to-b from-indigo-100/50 via-purple-50/30 to-transparent dark:from-indigo-950/30 dark:via-purple-950/10 dark:to-transparent pointer-events-none z-0" />

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
            <BookOpen size={16} className="text-indigo-500 dark:text-indigo-400" />
            <h1 className="text-sm sm:text-base font-bold tracking-tight">묘운력 계산법과 설명</h1>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-[680px] mx-auto px-4 py-8 space-y-5">

        {/* 출처 안내 */}
        <NoteBox>
          이 페이지에 대한 설명 일부의 출처는{" "}
          <strong className="text-neutral-700 dark:text-neutral-300">현묘의 강의내용 중 일부</strong>임을 밝힙니다.
        </NoteBox>

        {/* 개요 */}
        <Section title="묘운력이란?" accent>
          <P>
            묘운력이라는 것은 대운에서 비롯되기 때문에 대운과 세운을 짚고 넘어가는 게 좋을 것 같습니다.
          </P>
          <P>
            이 이론 자체가 쉬운 이론은 아닙니다만, 최대한 제 식으로 쉽게 풀어보도록 하겠습니다.
          </P>
          <P>
            묘운이라는 것은, <strong>현묘</strong>의 묘를 따서 + "운"을 하여, 묘운이라는 이름이 붙었습니다.
            (쌤께서 임의로 붙이신 이름이라고 하시더군요.)
          </P>
        </Section>

        {/* 대운의 팔자 개념 */}
        <Section title="대운도 팔자다 — 8×8의 개념">
          <P>기본 개념은 대운의 확장판이자, 8×8입니다.</P>
          <P>
            원국은 팔자입니다. 당연한 말인데, 이 개념을 이해하기 위해서는 한 번 상기할 필요가 있습니다.
          </P>
          <P>
            대운도 팔자다, 라고 하면 믿어지시나요? 으잉? 대운이 무슨 팔자야? 대운은 10년마다 오는
            기둥(간지)이잖아. 네, 저희가 아는 이론은 그렇습니다.
          </P>
          <P>
            그 틀을 깨고, 현묘가 주장하는 게 <strong>대운의 팔자, 8×8 (원국 × 대운) 묘운력</strong>입니다.
          </P>
          <P>
            팔자라면 당연히 연, 월, 일, 시 각각의 주(기둥)이 있을 것입니다. 네, 이것도 있습니다. 그래서
            그것에 대해서 설명을 드려보겠습니다.
          </P>
          <P>
            우선은 여기서 세운의 개념도 같이 보아야 합니다. 1년은 12달입니다. 즉, 한 사람이 만나야 하는
            1년의 월(月)의 수는 12개라는 말입니다. 또한 365개의 일과 8760시간을 보내게 되는데, 여기서 다시
            또 시주가 2시간이라는 걸 생각하면 8760 ÷ 2 = 4380이라는 숫자가 나옵니다.
          </P>
        </Section>

        {/* 1:120 비율 */}
        <Section title="1년 = 120년 비율">
          <P>
            여기서 재밌는 걸 얘기해볼게요. 현묘는 <strong>1년 = 120년</strong>으로 보고 대운을 풀어나간다고
            얘기했습니다. 태어나는 시점에서 기운을 저장해서, 평생동안 서서히 풀어나간다는 거예요.
            저장된 1년의 기운(대운)과 삶의 실질적인 비율이 1:120이라는 거죠.
          </P>
          <FormulaBox />
          <NoteBox>
            <span className="font-bold text-neutral-700 dark:text-neutral-300">※ 개인적인 생각 —</span>{" "}
            수업을 들을 때도 120이라는 비율이 어느정도 들어맞는 비율이다라는 말씀을 하셨었는데,
            왜 120이지 100년도 아니고, 라고 생각했지만 로직(코드)를 구현할때 120이라는 숫자가 기가 막히더라구요?
            왜냐면 <strong className="text-neutral-700 dark:text-neutral-300">2시간을 4380번 반복해서 돌리면 120년이 딱 나오거든요.</strong>
          </NoteBox>
          <P>
            1년은 12달로 떨어집니다. 절기도 24절기가 있고, 그중에서 월로 나뉘어 쓰는 것은 12개입니다.
            그러나 이것만으로는 "12달이니까 120이야"는 설득력이 없겠죠. 그래서 공식으로 구해봤어요.
          </P>
        </Section>

        {/* 시주 계산 예시 */}
        <Section title="시주 계산 예시">
          <P>
            시주부터 해볼까요? 저는 <strong>16:03 (균시차 보정 기준)</strong>, 신시에 태어났습니다.
            여자 + 양간년생이라 역행입니다.
          </P>
          <P>
            역행이니까 작용시간을 뒤로 보내야 해요. 여기서 기준이 되는 건 12간지의 구분시각입니다.
            보정시를 적용하면 +30분을 하지 않아도 됩니다 — 이미 균시차 적용이 된 거거든요.
          </P>
          <P>
            16:03 출생이고 전 간지(신시 전)는 미시, 미시는 ~15시까지입니다. 그래서
            15시까지만 시간을 돌려보면 <strong>63분</strong>이 뒤로 갔습니다.
          </P>
          <div className="rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 px-4 py-3.5 space-y-1.5">
            <p className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">분수로 표현하면</p>
            <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">
              63분 / 2시간 = 63 / 120 → 5일 6시간 / 10일
            </p>
            <p className="text-xs text-neutral-600 dark:text-neutral-400">
              2시간 = 10일 공식 적용 → 태어난 직후에서 <strong>5일 6시간</strong>이 지난 시점에 시주 변경
            </p>
          </div>
          <P>그 뒤로는 계속 10일마다 시주가 변경됩니다.</P>
        </Section>

        {/* 표 1 */}
        <Section title="표 — 첫 시주 변경 예시">
          <GanjiTable
            rows={[
              ["1996-12-29 16:03", "병자", "경자", "경자", "갑신", "1996-12-29 16:03"],
              ["1996-12-29 15:00", "병자", "경자", "경자", "계미", "1997-01-03 22:03"],
            ]}
            highlightCol={4}
          />
          <P>시주가 바뀐 게 보이시나요? 5일 6시간 지난 뒤에 시주가 바뀌었습니다.</P>
        </Section>

        {/* 표 2 */}
        <Section title="표 — 시주/일주 변화 전체 흐름">
          <GanjiTable
            rows={[
              ["1996-12-29 16:03", "병자", "경자", "경자", "갑신", "1996-12-29 16:03"],
              ["1996-12-29 15:00", "병자", "경자", "경자", "계미", "1997-01-03 22:03"],
              ["1996-12-29 13:00", "병자", "경자", "경자", "임오", "1997-01-13 22:03"],
              ["1996-12-29 11:00", "병자", "경자", "경자", "신사", "1997-01-23 22:03"],
              ["1996-12-29 09:00", "병자", "경자", "경자", "경진", "1997-02-02 22:03"],
              ["1996-12-29 07:00", "병자", "경자", "경자", "기묘", "1997-02-12 22:03"],
              ["1996-12-29 05:00", "병자", "경자", "경자", "무인", "1997-02-22 22:03"],
              ["1996-12-29 03:00", "병자", "경자", "기해", "정축", "1997-03-04 22:03"],
            ]}
          />
          <NoteBox>
            작용시간은 -2시간씩 빠지고, 시주는 한번 바뀌니까 10일씩 가는 규칙이 보이시죠? ^^{" "}
            (일주는 인시기준 역행, 축시에 해당될 때 바뀌었습니다.)
          </NoteBox>
        </Section>

        {/* 일주와 연주 */}
        <Section title="일주와 연주의 기준">
          <P>일주랑 연주는 시주와 월주가 기준이 됩니다.</P>
          <ul className="space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
            <li className="flex gap-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5">
              <span className="text-indigo-400 shrink-0 font-bold">·</span>
              <span>
                <strong>자시론 기준</strong> — 시주 역행 = 해시, 순행 = 자시가 시작될 때 바뀜
              </span>
            </li>
            <li className="flex gap-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 px-3.5 py-2.5">
              <span className="text-indigo-400 shrink-0 font-bold">·</span>
              <span>
                <strong>인시론 기준</strong> — 시주 역행 = 축시, 순행 = 인시가 시작될 때 바뀜
              </span>
            </li>
          </ul>
          <P>연주에도 똑같이 적용됩니다. 월주가 무엇이냐에 따라 연주가 바뀌고 안 바뀌고가 정해져요!</P>
        </Section>

        {/* 월주 계산 */}
        <Section title="월주 계산">
          <P>시주가 2시간이었다면, 월주는 한 달이죠. 기준은 절기입니다.</P>
          <P>
            저는 12월 29일생 + 역행이라 전 절기(바로 직전 절기)가 기준이 됩니다.
            즉, 96년 12월의 절기인 <strong>12/7 05:14 대설</strong>이 기준점입니다.
          </P>
          <P>
            저런 식으로 작용시간이 이전 절기에 닿을 때까지 쭉 세어주면서 가면 됩니다!
            그리고 그 해당 지점의 현실 시간이 어떤 날짜냐에 따라, 대운수가 정해지게 됩니다.
          </P>
        </Section>

        {/* 표 3 */}
        <Section title="표 — 월주 변경 시점">
          <GanjiTable
            rows={[
              ["1996-12-07 07:00", "병자", "경자", "무인", "을묘", "2004-05-06 22:03"],
              ["1996-12-07 05:00", "병자", "기해", "무인", "갑인", "2004-05-16 22:03"],
            ]}
            caption="작용시간이 전 절기(12/7 05:14)를 지나고, 월주가 바뀌는 표"
            highlightCol={2}
          />
        </Section>

        {/* 정리 */}
        <Section title="정리" accent>
          <P>
            보통은 순행은 다음 절기, 역행은 이전 절기로 해서 일수를 센 다음, 3으로 나누는 것이
            정석인데, 이렇게 보니 꽤 섬세하게 잡는 게 보입니다.
          </P>
          <P>묘운만세력은 저렇게 만들어졌습니다.</P>
        </Section>

        <AdsenseInlineSection enabled={showAds} containerClassName="pt-2" maxWidthPx={640} />
      </main>

      <Footer />
      <BottomNav />
    </div>
  );
}
