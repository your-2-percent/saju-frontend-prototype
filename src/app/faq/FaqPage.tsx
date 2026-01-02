// src/app/pages/FaqPage.tsx
import { HelpCircle } from "lucide-react";

export default function FaqPage() {
  return (
    <div className="pt-16 pb-24">
      <div className="max-w-[640px] mx-auto px-4">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-neutral-700 dark:text-neutral-200" />
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
              자주 묻는 질문
            </h2>
          </div>

        </div>

        <div className="space-y-3">
          <details className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
            <summary className="text-sm desk:text-base cursor-pointer select-none font-semibold text-neutral-900 dark:text-neutral-100">
              Q. 십이신살이 다르게 나와요.
            </summary>
            <div className="mt-3 text-xs desk:text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
              <p>
                A. 십이신살은 <b>‘일지’</b>와 <b>‘연지’</b> 두개의 기준이 존재합니다. 이는 학파마다 다르며,
                두개를 다보시는 학파들도 있습니다.
              </p>
              <p className="mt-2">
                보통 <b>천*귀인</b>에서 쓰이는 것은 <b>연지 기준</b>이며 <b>8*어때</b>에서 쓰이는 것은
                <b> 일지와 연지 둘 다</b> 볼 수 있는 것으로 알고 있습니다.
              </p>
              <p className="mt-2">
                하단의 <b>기타 설정</b>에서 기준을 바꿔 보실 수 있습니다.
              </p>
            </div>
          </details>

          <details className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
            <summary className="text-sm desk:text-base cursor-pointer select-none font-semibold text-neutral-900 dark:text-neutral-100">
              Q. 대운수가 다른 앱과 다르게 나와요.
            </summary>
            <div className="mt-3 text-xs desk:text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
              <p>
                A. 대운수 계산법은 앱마다 다릅니다. <b>천*귀인</b>, <b>8*어때</b> 두개만 비교해도 다르게
                나옵니다.
              </p>
              <p className="mt-2">
                화림만세력에는 <b>묘운</b>이라는 (대운을 확장하여 8자로 보는 기법 - 출처 현묘) 에서
                정밀하게 계산되었습니다.
              </p>
              <p className="mt-2">
                (기본적으로 묘운은 제공 되지 않으며, 관리자에게 문의 하시면 <b>묘운 뷰어</b>를 열어드립니다.)
              </p>
              <p className="mt-2">
                대운수가 ‘틀리다.’ 보다는 계산법에 의해 ‘다르다.’ 라고 보시는 게 맞고, 대운수가 여러개라면
                명주(사주의 주인)의 흐름을 보고 결정짓는 것이 맞습니다.
              </p>
            </div>
          </details>

          <details className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
            <summary className="text-sm desk:text-base cursor-pointer select-none font-semibold text-neutral-900 dark:text-neutral-100">
              Q. 용신 추천이 제 생각과 달라요.
            </summary>
            <div className="mt-3 text-xs desk:text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
              <p>
                A. 그런 상황이 있을 수밖에 없습니다. 용신추천은 만세력을 기반으로 간지들의 유기적 흐름에 따른
                로직으로 계산되었습니다만, 이것은 자동화 시스템이지 사람이 간명한 것이 아닙니다.
              </p>
              <p className="mt-2">
                따라서 참고만 하시는 게 좋고, 용신에 대한 것은 정밀한 상담을 추천합니다.
              </p>
              <p className="mt-2">
                (현묘의 제자분들께서 상담해주시는 <b>파이브 시즌스</b>를 추천드립니다 ^^)<br />
                <a href="https://5seasons.co.kr/" target="_blank"><ins className="text-amber-500">▶ 파이브시즌스 상담받으러가기 !</ins></a>
              </p>
            </div>
          </details>

          <details className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900/40">
            <summary className="text-sm desk:text-base cursor-pointer select-none font-semibold text-neutral-900 dark:text-neutral-100">
              Q. 설정에 '개화론'이 있던데 그게 뭔가요?
            </summary>
            <div className="mt-3 text-xs desk:text-sm leading-relaxed text-neutral-700 dark:text-neutral-200">
              <p>
                A. 십이신살의 현대적인 관법이라고 볼 수 있습니다.
              </p>
              <p className="mt-2">
                여기서 설명을 하기 보다는 개화론에 대한 설명글을 보시는 것을 추천드립니다 ^^
              </p>
              <p className="mt-2">
                <a href="https://yavares.tistory.com/345" target="_blank"><ins className="text-amber-500">개화론 설명 보러가기</ins></a>
              </p>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
