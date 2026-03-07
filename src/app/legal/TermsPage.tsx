import LegalPageLayout from "@/app/legal/LegalPageLayout";
import { TermsContent } from "@/app/legal/LegalContents";

export default function TermsPage() {
  return (
    <LegalPageLayout
      title="서비스 이용약관"
      description="묘운만세력 서비스 이용 시 적용되는 기본 원칙, 책임 범위, 콘텐츠 이용 기준과 광고 관련 사항을 안내합니다."
    >
      <TermsContent />
    </LegalPageLayout>
  );
}
