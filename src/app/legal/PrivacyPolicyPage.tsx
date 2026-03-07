import LegalPageLayout from "@/app/legal/LegalPageLayout";
import { PrivacyPolicyContent } from "@/app/legal/LegalContents";

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="개인정보 처리방침"
      description="서비스 운영 과정에서 처리되는 개인정보의 항목, 목적, 보관 기간, 광고 및 쿠키 관련 사항을 안내합니다."
    >
      <PrivacyPolicyContent />
    </LegalPageLayout>
  );
}
