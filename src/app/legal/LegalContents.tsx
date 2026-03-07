import type { ReactNode } from "react";

function LegalSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      <div className="space-y-2 text-sm leading-7 text-neutral-700 dark:text-neutral-300">
        {children}
      </div>
    </section>
  );
}

export function TermsContent() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-sm leading-7 text-neutral-700 dark:text-neutral-300">
        <p>
          묘운만세력은 사주 명식 계산 결과를 제공하는 참고용 서비스입니다. 본 서비스에서
          제공하는 모든 결과는 의사결정의 참고 자료로만 활용되어야 합니다.
        </p>
        <p>
          본 서비스는 투자, 의료, 법률 등 전문적인 판단을 대신하지 않으며, 이용자는 모든 결정에
          대한 책임을 스스로 부담합니다.
        </p>
        <p>서비스의 일부 기능은 사전 공지 없이 변경되거나 중단될 수 있습니다.</p>
      </div>

      <LegalSection title="1. 서비스 제공 및 책임 범위">
        <p>
          본 서비스는 사주 계산 및 정보 제공을 목적으로 하며, 투자, 의료, 법률 등 전문적인 판단을
          대체하지 않습니다. 이용자는 서비스 이용으로 인한 모든 의사결정에 대해 스스로 책임을
          부담합니다.
        </p>
      </LegalSection>

      <LegalSection title="2. 이용 제한">
        <p>
          서비스 운영을 방해하거나 타인의 권리를 침해하는 행위는 금지됩니다. 운영자는 필요한 경우
          서비스 이용을 제한하거나 중단할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="3. 저작권 및 콘텐츠 이용">
        <p>
          사이트 내 콘텐츠(문서, 이미지, 코드 등)의 저작권은 운영자에게 있으며, 출처 표기된 외부
          자료는 해당 권리자에게 있습니다. 무단 복제, 배포, 2차 가공을 금지합니다.
        </p>
      </LegalSection>

      <LegalSection title="4. 광고 및 외부 링크">
        <p>
          본 서비스에는 광고 및 외부 링크가 포함될 수 있습니다. 외부 사이트의 내용 및 정책에
          대해서는 운영자가 책임지지 않습니다.
        </p>
      </LegalSection>

      <LegalSection title="5. 쿠키 및 광고">
        <p>
          Google AdSense를 통해 제3자 쿠키가 사용될 수 있습니다. 사용자는 브라우저 설정 또는
          Google 광고 설정에서 개인화 광고를 관리할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="6. 문의">
        <p>약관 관련 문의는 문의 페이지 또는 unique950318@gmail.com을 통해 접수할 수 있습니다.</p>
      </LegalSection>
    </div>
  );
}

export function PrivacyPolicyContent() {
  return (
    <div className="space-y-6">
      <div className="space-y-2 text-sm leading-7 text-neutral-700 dark:text-neutral-300">
        <p>
          화림만세력은 이용자의 개인정보를 중요하게 생각하며, 서비스 제공과 운영에 필요한 범위
          안에서만 개인정보를 처리합니다.
        </p>
      </div>

      <LegalSection title="1. 수집 항목">
        <p>
          Google 또는 Kakao 로그인 시 제공되는 프로필 정보(이름, 이메일, 프로필 이미지),
          서비스 이용 과정에서 생성되는 명식 데이터, 접속 및 이용 기록, 기기와 브라우저 정보 등을
          수집할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="2. 처리 목적">
        <p>
          로그인 및 사용자 식별, 명식 저장과 불러오기, 서비스 운영 및 개선, 오류 대응, 문의 처리
          등을 위해 개인정보를 처리합니다.
        </p>
      </LegalSection>

      <LegalSection title="3. 보관 기간">
        <p>
          개인정보와 서비스 데이터는 회원 탈퇴 또는 계정 비활성화 처리 시까지 보관하며, 관계
          법령에 따른 보관 의무가 있는 경우 해당 기간 동안 추가 보관할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="4. 제3자 제공">
        <p>
          법령에 근거가 있거나 이용자의 동의가 있는 경우를 제외하고, 개인정보를 외부에 제공하지
          않습니다.
        </p>
      </LegalSection>

      <LegalSection title="5. 쿠키 및 광고">
        <p>
          Google AdSense를 통해 제3자 쿠키가 사용될 수 있습니다. 사용자는 브라우저 설정 또는
          Google 광고 설정에서 개인화 광고를 관리할 수 있습니다.
        </p>
      </LegalSection>

      <LegalSection title="6. 보안">
        <p>
          서비스는 인증 및 데이터 저장 과정에서 적절한 보안 조치를 적용하며, 접근 권한 관리와
          기본적인 데이터 보호 절차를 통해 개인정보를 보호합니다.
        </p>
      </LegalSection>

      <LegalSection title="7. 문의">
        <p>개인정보 관련 문의: unique950318@gmail.com</p>
      </LegalSection>
    </div>
  );
}
