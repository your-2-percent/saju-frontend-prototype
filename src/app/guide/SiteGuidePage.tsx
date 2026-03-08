import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import LegalPageLayout from "@/app/legal/LegalPageLayout";

function GuideSection({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="space-y-5 rounded-[28px] border border-neutral-200/80 bg-white/90 p-4 desk:p-5 shadow-[0_18px_50px_rgba(15,23,42,0.05)] dark:border-neutral-800 dark:bg-neutral-900/80 sm:p-6"
    >
      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          {title}
        </h2>
        <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">{description}</p>
      </div>
      {children}
    </section>
  );
}

function GuideShot({
  id,
  src,
  title,
  caption,
}: {
  id?: string;
  src: string;
  title: string;
  caption: ReactNode;
}) {
  return (
    <figure
      id={id}
      className="overflow-hidden rounded-[22px] border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/60"
    >
      <div className="flex items-center justify-between gap-3 border-b border-neutral-200/80 px-4 py-3 dark:border-neutral-800">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</p>
        </div>
      </div>
      <div className="bg-neutral-100 dark:bg-neutral-900 p-4">
        <img src={src} alt={title} loading="lazy" className="block mx-auto" />
      </div>
      <figcaption className="px-4 py-3 text-sm leading-6 text-neutral-600 dark:text-neutral-300">
        {caption}
      </figcaption>
    </figure>
  );
}

function GuideActionLink({
  to,
  children,
}: {
  to: string;
  children: ReactNode;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center rounded-full border border-orange-300 bg-orange-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-orange-600 dark:border-orange-500/50"
      target="_blank"
    >
      {children}
    </Link>
  );
}

function InlineJumpButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-neutral-800 dark:text-neutral-300 dark:hover:border-orange-500/50 dark:hover:text-orange-300 cursor-pointer"
    >
      {children}
    </button>
  );
}

function BulletList({ children }: { children: ReactNode }) {
  return <ul className="space-y-2 text-sm leading-7 text-neutral-700 dark:text-neutral-300">{children}</ul>;
}

function Bullet({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-orange-500" />
      <span>{children}</span>
    </li>
  );
}

export default function SiteGuidePage() {
  const scrollToId = (id: string) => {
    if (typeof document === "undefined") return;
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <LegalPageLayout
      eyebrow="Guide"
      title="사이트 가이드"
      description="화림만세력의 주요 기능을 처음부터 결과창, 사주노트, 주역·육효점까지 순서대로 익힐 수 있게 정리한 안내 페이지입니다."
    >
      <div className="space-y-6">
        <section className="overflow-hidden rounded-[30px] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 px-5 py-6 dark:border-orange-500/30 dark:from-orange-950/25 dark:via-neutral-900 dark:to-amber-950/15">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-500">
                Quick Tour
              </p>
              <h2 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                홈에서 시작해서 결과창까지, 필요한 기능만 빠르게 찾아보세요.
              </h2>
              <p className="text-sm leading-6 text-neutral-600 dark:text-neutral-300">
                아래 순서는 실제 사용 흐름에 맞춰 구성했습니다. 이미지만 먼저 훑고, 필요한 설명만 읽어도 되게 정리했습니다.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <GuideActionLink to="/">홈으로 가기</GuideActionLink>
              <GuideActionLink to="/faq">FAQ 보기</GuideActionLink>
              <GuideActionLink to="/saju-note">사주노트 보기</GuideActionLink>
              <GuideActionLink to="/iching">주역 · 육효점 보기</GuideActionLink>
            </div>
          </div>
        </section>

        <GuideSection
          id="home-input"
          title="1. 홈 화면과 명식 만들기"
          description="명식 추가, 간지로 명식 만들기, 로그인/로그아웃 버튼은 홈 상단과 사이드바 상단 모두에서 빠르게 접근할 수 있습니다."
        >
          <div className="space-y-4">
            <GuideShot
              src="/guide/1.PNG"
              title="홈 화면 상단 버튼"
              caption={
                <>
                  홈 화면 상단 오른쪽에 있는 버튼입니다. 보라색 버튼은 <strong>명식 추가</strong>, 주황색 버튼은{" "}
                  <strong>간지로 명식 만들기</strong> 버튼입니다.
                </>
              }
            />

            <GuideShot
              src="/guide/1-1.PNG"
              title="간지로 명식 만들기 모달"
              caption={
                <>
                  생년월일은 모르고 간지만 알고 있을 때 유용한 기능입니다. 연주, 월주, 일주, 시주만 채워 넣으면 자동으로 생일과
                  시간을 산출해 저장할 수 있습니다.
                </>
              }
            />
          </div>

          <GuideShot
            src="/guide/2.PNG"
            title="사이드바 상단 버튼"
            caption="홈 상단뿐 아니라, 사이드바 오른쪽 상단에도 명식 추가와 로그인/로그아웃 버튼이 있습니다."
          />
        </GuideSection>

        <GuideSection
          id="birth-form"
          title="2. 명식 입력 화면"
          description="생년월일, 시간, 출생지, 관계를 차례대로 입력하면 됩니다. 모르는 값은 일부 항목에서 생략할 수 있게 만들어 두었습니다."
        >
          <GuideShot
            src="/guide/3.PNG"
            title="생년월일 입력"
            caption={
              <BulletList>
                <Bullet>음력을 클릭하면 음력 전환 날짜가 함께 출력됩니다.</Bullet>
                <Bullet>서머타임 해당 시에는 빨간 글씨로 서머타임 명식 안내 문구가 출력됩니다.</Bullet>
              </BulletList>
            }
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <GuideShot
              src="/guide/4.PNG"
              title="태어난 시간 입력 - 자시"
              caption={
                <BulletList>
                  <Bullet>시간을 모르면 모름 버튼을 누르고 넘어갈 수 있습니다.</Bullet>
                  <Bullet>자시는 시간 기준에 따라 일주가 바뀔 수 있어 별도 안내 문구가 표시됩니다.</Bullet>
                </BulletList>
              }
            />

            <GuideShot
              src="/guide/5.PNG"
              title="태어난 시간 입력 - 축시"
              caption={
                <BulletList>
                  <Bullet>축시는 인시일수론을 적용하면 일주가 바뀔 수 있어 별도 안내 문구가 표시됩니다.</Bullet>
                  <Bullet>
                    자세한 기준은 <Link to="https://yavares.tistory.com/1013" target="_blank" className="font-semibold text-orange-600 dark:text-orange-300">인시일수론 설명</Link>에서
                    더 확인할 수 있습니다.
                  </Bullet>
                </BulletList>
              }
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <InlineJumpButton onClick={() => scrollToId("hour-prediction")}>
              시주 예측 보러가기
            </InlineJumpButton>
            <GuideActionLink to="https://yavares.tistory.com/1013">인시일수론 설명 보기</GuideActionLink>
          </div>

          <div className="space-y-4">
            <GuideShot
              src="/guide/6.PNG"
              title="출생지 입력"
              caption="출생지를 모른다면 모름을 선택하면 됩니다. 이 경우 기본값으로 -30분 보정이 적용됩니다."
            />

            <GuideShot
              src="/guide/7.PNG"
              title="출생지 선택 지도 모달"
              caption="출생지를 안다면 검색 후 아래 추천 목록에서 가장 맞는 선택지를 고르면 됩니다."
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <GuideShot
              src="/guide/8.png"
              title="관계 선택"
              caption="관계를 선택할 수 있고, 원하는 카테고리가 없으면 관계 추가를 눌러 새 항목을 만들 수 있습니다."
            />

            <GuideShot
              src="/guide/9.PNG"
              title="관계 추가 모달"
              caption="추가하고 싶은 관계 이름을 입력하고 저장하면 선택창에 바로 반영됩니다."
            />
          </div>

          <GuideShot
            src="/guide/10.PNG"
            title="관계 수정과 드래그 정렬"
            caption={
              <>
                자주 쓰는 관계는 순서를 위로 올려둘 수 있습니다. 좌측 아이콘을 드래그하면 데스크탑과 모바일 모두에서 순서를 바꿀 수
                있고, 한 번 조작하면 자동 저장됩니다. 폴더 추가와 순서 수정도 같은 UI로 동작합니다.
              </>
            }
          />
        </GuideSection>

        <GuideSection
          id="sidebar"
          title="3. 사이드바 기능"
          description="명식이 많아질수록 사이드바를 잘 쓰는 것이 중요합니다. 검색과 카드 접기 기능이 핵심입니다."
        >
          <GuideShot
            src="/guide/12.PNG"
            title="사이드바 상단 기능"
            caption={
              <BulletList>
                <Bullet>이름, 간지, 생년월일 등으로 명식을 검색할 수 있습니다.</Bullet>
                <Bullet>폴더만 따로 검색하는 기능도 있어 폴더가 많아져도 정리가 쉽습니다.</Bullet>
                <Bullet>명식 카드 접기 기능으로 긴 카드를 간략하게 정리해 볼 수 있습니다.</Bullet>
              </BulletList>
            }
          />

          <GuideShot
            src="/guide/13.PNG"
            title="카드를 접은 상태"
            caption="카드를 접었을 때는 카드를 그냥 눌러도 바로 명식 보기로 들어갈 수 있습니다."
          />
        </GuideSection>

        <GuideSection
          id="couple"
          title="4. 궁합 페이지"
          description="두 명식을 선택하면 형충회합과 전체 궁합 흐름을 같이 볼 수 있습니다."
        >
          <GuideShot
            src="/guide/14.PNG"
            title="궁합 화면"
            caption="두 명식을 모두 선택하면 서로 어떤 형충회합이 이루어지는지 함께 확인할 수 있습니다."
          />

          <div className="flex flex-wrap gap-2">
            <GuideActionLink to="/couple">궁합 페이지 보기</GuideActionLink>
          </div>
        </GuideSection>

        <GuideSection
          id="faq"
          title="5. FAQ"
          description="자주 헷갈리는 질문을 모아둔 페이지입니다. 계산 기준이나 해석 차이 때문에 고민될 때 가장 먼저 보는 것을 권장합니다."
        >
          <GuideShot
            src="/guide/22.PNG"
            title="FAQ 페이지"
            caption="꼭 한 번쯤 읽어보시기를 권장드립니다. 그 외 궁금한 점은 우측 하단 오픈 카톡으로 문의하시면 됩니다."
          />

          <div className="flex flex-wrap gap-2">
            <GuideActionLink to="/faq">FAQ 바로가기</GuideActionLink>
          </div>
        </GuideSection>

        <GuideSection
          id="result"
          title="6. 결과창과 묘운 뷰어"
          description="결과창은 기본운 뷰어, 묘운 뷰어, 분석 레포트, 기타신살로 구성됩니다. 세부 조정 옵션이 많아 직접 눌러보며 보는 쪽이 빠릅니다."
        >
          <GuideShot
            src="/guide/15.PNG"
            title="결과창 상단 구성"
            caption={
              <BulletList>
                <Bullet>기본운 뷰어 | 묘운 뷰어 | 분석 레포트 | 기타신살 탭이 상단에 있습니다.</Bullet>
                <Bullet>형충회합은 칩 형태로 접었다 펼칠 수 있게 구성했습니다.</Bullet>
                <Bullet>십이운성은 봉법, 거법, 좌법, 인종법을 체크박스로 켜고 끌 수 있습니다.</Bullet>
              </BulletList>
            }
          />

          <GuideShot
            id="hour-prediction"
            src="/guide/26.PNG"
            title="시주 예측 버튼"
            caption={
              <BulletList>
                <Bullet>시간이 없는 명식에서만 형충회합 윗부분에 나타나는 시스템입니다.</Bullet>
                <Bullet>자시와 인시 기준을 구분해서 볼 수 있습니다.</Bullet>
                <Bullet>시간 기준에 따라 일주가 달라질 수 있기 때문에 전날 일주도 함께 적용해 볼 수 있습니다.</Bullet>
              </BulletList>
            }
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <GuideShot
              src="/guide/27.PNG"
              title="묘운 뷰어"
              caption="묘운 뷰어는 실시간 간지 뷰어와 같이 볼 수 있게 구성되어 있고, 자시/인시 기준을 바꿔가며 볼 수 있습니다."
            />

            <GuideShot
              id="myoun-hour-candidate"
              src="/guide/28.PNG"
              title="시간 없는 묘운 뷰어"
              caption="시간이 없으면 시주와 일주 일부가 비게 보이지만, 시주 후보를 하나 클릭하면 그 기준에 맞게 채워집니다."
            />
          </div>

          <div className="space-y-4">
            <GuideShot
              src="/guide/29.PNG"
              title="분석 레포트 예시 1"
              caption="이미지에 보시면 운 버튼이 있는데 누르면, 운에 따라 수치가 맞게 변동됩니다."
            />
            <GuideShot
              src="/guide/30.PNG"
              title="분석 레포트 예시 2"
              caption="음양 수치입니다. 음과 양 중 어느쪽이 강한지 알 수 있으며, 조화도도 수치로 볼 수 있습니다."
            />
            <GuideShot
              src="/guide/31.PNG"
              title="분석 레포트 예시 3"
              caption="신약/신강, 조후의 수치를 볼 수 있습니다."
            />
          </div>

          <div className="space-y-4">
            <GuideShot
              src="/guide/34.PNG"
              title="용신 추천"
              caption="프로그램에 따라, 명식별 용신을 추천해주는 화면입니다."
            />
            <GuideShot
              src="/guide/35.PNG"
              title="운에 따라 달라지는 용신"
              caption="운에 따라 용신이 달라지는 경우에만 나타납니다. 대운과 세운으로 나뉘어 있어서 보기 쉽게 확인할 수 있으며, 이 화면이 없다면 운에 따라 용신이 변하지 않는 것입니다."
            />
          </div>

          <GuideShot
            src="/guide/32.PNG"
            title="기타신살"
            caption="해당되는 신살이 칩으로 표시되고, 칩을 누르면 간략한 설명을 볼 수 있습니다."
          />
          
        </GuideSection>

        <GuideSection
          id="daewoon"
          title="7. 대운 조정 시스템"
          description="대운, 시운, 달력 표시 여부를 사용자 취향에 맞게 바꿔볼 수 있습니다. 일부 설정은 AI 프롬프트 영역과도 연동됩니다."
        >
          <div className="grid gap-4 lg:grid-cols-2">
            <GuideShot
              src="/guide/16.PNG"
              title="대운 리스트 조정"
              caption="정밀과 표준을 토글로 나누어 볼 수 있고, 누르면 바로 적용됩니다. AI 프롬프트 영역과도 연결되어 있습니다."
            />

            <GuideShot
              src="/guide/17.PNG"
              title="시운 리스트"
              caption="달력에 있는 시운 안보이기 버튼을 누르면 시운을 숨길 수 있습니다."
            />
          </div>
        </GuideSection>

        
         <GuideSection
          id="settings"
          title="8. 설정 버튼과 설정 화면"
         description="결과 화면 하단의 설정 버튼을 누르면, 내가 자주 보는 방식에 맞게 표시 항목과 기준을 세세하게 바꿀 수 있습니다."
        >
          <GuideShot
            src="/guide/33.PNG"
            title="하단 설정 버튼"
            caption="하단에 있는 설정 버튼을 누르면, 결과 화면에서 보이는 정보와 표시 방식을 한 번에 조정할 수 있습니다."
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <GuideShot
              src="/guide/23.PNG"
              title="설정 화면 1"
              caption="테마, 지장간 표시 타입과 유형, 십이신살 타입과 기준, 개화론 적용 여부, 상단 노출 기준, 글자 타입, 음간 얇게 같은 표시 기준을 바꿀 수 있습니다."
            />
            <GuideShot
              src="/guide/24.PNG"
              title="설정 화면 2"
              caption="십신, 십이운성, 십이신살, 납음오행, 기타신살 BOX, 형충회합 BOX, 프롬프트 BOX 같은 항목을 켜고 끌 수 있고, 난이도 UP ver.도 필요에 따라 적용할 수 있습니다."
            />
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 desk:p-5 text-sm leading-7 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
            <p className="font-semibold text-slate-900 dark:text-slate-50">
              자주 쓰는 설정은 위로 올려두고 쓰면 편합니다.
            </p>
            <p className="mt-2">
              설정 목록은 드래그로 순서를 바꿀 수 있습니다. 자주 쓰는 항목을 상단으로 올려두면 더 빠르게 접근할 수 있고, 한 번 정리한 순서는 자동으로 저장됩니다.
            </p>
          </div>
        </GuideSection>


        <GuideSection
          id="ai-prompt"
          title="9. AI 프롬프트 영역"
          description="필요한 정보만 남기고, 여러 시점을 묶고, 대운 기준까지 조정해서 원하는 형태의 프롬프트를 만들 수 있습니다."
        >
          <GuideShot
            src="/guide/19.PNG"
            title="AI 프롬프트 영역"
            caption={
              <BulletList>
                <Bullet>관법에 따라 십이운성, 십이신살, 기타신살, 납음오행을 넣거나 뺄 수 있습니다.</Bullet>
                <Bullet>위에서 설명한 대운 기준도 여기서 조정 가능합니다.</Bullet>
                <Bullet>단일 시점은 한 시점만, 멀티는 여러 시점을 한 번에 프롬프트에 넣습니다.</Bullet>
              </BulletList>
            }
          />

          <GuideShot
            src="/guide/20.PNG"
            title="멀티 영역"
            caption="원국, 대운, 세운, 월운, 일운 카테고리별로 쪼개어 프롬프트를 더 세밀하게 조정할 수 있습니다. 대운은 여러개 선택이 가능합니다."
          />
          <GuideShot
            src="/guide/21.PNG"
            title="멀티 영역"
            caption="세운/월운/일운은 피커로 조정하여, 기간을 조정해서 볼 수 있습니다."
          />
        </GuideSection>

        <GuideSection
          id="finish"
          title="10. 더 도움이 필요할 때"
          description="이용하다가 막히는 부분이 있으면 혼자 끌고 가지 마시고 바로 FAQ나 사주노트를 같이 참고해 보세요."
        >
          <BulletList>
            <Bullet>입력 기준이 헷갈리면 FAQ와 묘운 계산 설명 페이지를 먼저 확인해 주세요.</Bullet>
            <Bullet>사주 개념 자체가 낯설다면 사주노트에서 용어와 입문 글부터 읽는 것을 추천드립니다.</Bullet>
            <Bullet>그 외 궁금한 점이 있으시다면, 사이트 오른쪽 하단 오픈카톡으로 편히 문의주세요.</Bullet>
          </BulletList>

          <div className="flex flex-wrap gap-2">
            <GuideActionLink to="/faq">FAQ 다시 보기</GuideActionLink>
            <GuideActionLink to="/saju-note">사주노트 보기</GuideActionLink>
            <GuideActionLink to="/saju-note/myounlyeok">묘운 계산 설명 보기</GuideActionLink>
          </div>
        </GuideSection>
      </div>
    </LegalPageLayout>
  );
}
