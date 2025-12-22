import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import type { MainCategoryKey, SubCategoryKey } from "@/features/prompt/buildPrompt";
import type { ToneMeta } from "@/features/PromptCopyCard/types";

export const TONE_META: ToneMeta = {
  analysis: {
    label: "분석관찰형",
    desc: `- 감정 과잉 배제, 구조·패턴 중심 해석
- 연애/금전/직업은 사주 구조 기반으로 설명
- 데이터 중심 톤`,
  },
  mentor: {
    label: "조언가형",
    desc: `- 현실 조언 중심
- 과장 없이 균형 있게 설명
- 실행 가능한 방향 제시`,
  },
  dryHumor: {
    label: "건조한 유머",
    desc: `- 가벼운 농담을 섞되 과하지 않게
- 짧고 선명한 문장`,
  },
  softWarm: {
    label: "따뜻한 톤",
    desc: `- 공감과 배려 중심
- 부드러운 말투`,
  },
  etc: {
    label: "지정 없음",
    desc: `- 톤 지정 없이 기본값 사용`,
  },
};

export const TABS: BlendTab[] = ["원국", "대운", "세운", "월운", "일운"];

export const MAIN_CATEGORY_META: Record<MainCategoryKey, { label: string }> = {
  personality: { label: "성격 · 기질 · 성향" },
  lifeFlow: { label: "인생 흐름 · 운기" },
  love: { label: "연애 · 결혼 · 사랑" },
  career: { label: "직업 · 진로 · 직장" },
  money: { label: "재물 · 수입 · 투자" },
  family: { label: "가족 · 부모 · 형제 · 자녀" },
  baby: { label: "임신 · 출산 · 택일" },
  health: { label: "건강 · 체질 · 멘탈" },
  move: { label: "이사 · 이동 · 환경 변화" },
  social: { label: "인간관계 · 사회활동" },
  compat: { label: "궁합 · 커플 분석" },
  risk: { label: "리스크 · 이슈" },
  meta: { label: "사주 사용 · 메타 질문" },
  etc: { label: "기타 · 자유질문" },
};

export type SubMeta = { key: SubCategoryKey; label: string };

export const CATEGORY_SUBS: Record<MainCategoryKey, SubMeta[]> = {
  personality: [
    { key: "overview", label: "전체 성향 보기" },
    { key: "personality_basic", label: "기본 성격" },
    { key: "personality_shadow", label: "그림자·약점" },
    { key: "personality_relationshipStyle", label: "관계 스타일" },
    { key: "personality_workStyle", label: "업무 스타일" },
    { key: "personality_stressPattern", label: "스트레스 패턴" },
  ],
  lifeFlow: [
    { key: "overview", label: "인생 흐름 전체" },
    { key: "lifeFlow_cycle", label: "인생 사이클" },
    { key: "lifeFlow_turningPoint", label: "전환점" },
    { key: "lifeFlow_peak", label: "상승기" },
    { key: "lifeFlow_down", label: "침체기" },
    { key: "lifeFlow_theme", label: "인생 핵심 테마" },
  ],
  love: [
    { key: "love_pattern", label: "연애 패턴" },
    { key: "love_timing", label: "연애/결혼 타이밍" },
    { key: "love_partner", label: "배우자상·파트너 성향" },
    { key: "love_current", label: "현재 연애/관계" },
    { key: "love_breakup", label: "이별·갈등 이슈" },
    { key: "love_marriageChange", label: "결혼/이혼 흐름" },
  ],
  career: [
    { key: "career_aptitude", label: "적성·직업 추천" },
    { key: "career_mode", label: "직장 vs 프리랜서" },
    { key: "career_jobChange", label: "이직/퇴사 타이밍" },
    { key: "career_promotion", label: "승진·평판" },
    { key: "career_study", label: "학업·전공·진학" },
    { key: "career_exam", label: "시험·자격증" },
  ],
  money: [
    { key: "overview", label: "재물 흐름 전체" },
    { key: "money_flow", label: "수입·지출 흐름" },
    { key: "money_income", label: "수입·연봉·부수입" },
    { key: "money_spending", label: "소비 패턴" },
    { key: "money_saving", label: "저축/모으는 힘" },
    { key: "money_asset", label: "자산 구조" },
    { key: "money_debt", label: "빚/부채 이슈" },
    { key: "money_invest", label: "투자 성향" },
    { key: "money_bigEvent", label: "큰 지출 이벤트" },
  ],
  family: [
    { key: "overview", label: "가족 이슈 전체" },
    { key: "family_origin", label: "원가족/부모 성향" },
    { key: "family_current", label: "현재 가족/배우자" },
    { key: "family_parents", label: "부모와의 관계" },
    { key: "family_siblings", label: "형제자매 관계" },
    { key: "family_children", label: "자녀/양육" },
    { key: "family_care", label: "돌봄·부양 이슈" },
  ],
  baby: [
    { key: "overview", label: "임신·출산 전체" },
    { key: "baby_pregnancy", label: "임신 관련 이슈" },
    { key: "baby_birth", label: "출산 관련 이슈" },
    { key: "baby_selection", label: "택일 관련 이슈" },
  ],
  health: [
    { key: "overview", label: "건강 전체" },
    { key: "health_overall", label: "체질·컨디션" },
    { key: "health_physical", label: "신체 건강" },
    { key: "health_mental", label: "정신·멘탈" },
    { key: "health_stress", label: "스트레스 반응" },
    { key: "health_accident", label: "사고·부상 리스크" },
  ],
  move: [
    { key: "overview", label: "이사·이동 전체" },
    { key: "move_timing", label: "이사 타이밍" },
    { key: "move_chance", label: "이동 가능성" },
    { key: "move_targetHouse", label: "주거 환경 적합성" },
    { key: "move_environment", label: "주변 환경 변화" },
    { key: "move_finance", label: "주거비·예산 구조" },
  ],
  social: [
    { key: "overview", label: "사회·대인 관계 전체" },
    { key: "social_overall", label: "관계 패턴" },
    { key: "social_friend", label: "친구 관계" },
    { key: "social_workspace", label: "직장 관계" },
    { key: "social_network", label: "네트워크" },
    { key: "social_conflict", label: "갈등 패턴" },
  ],
  compat: [
    { key: "overview", label: "궁합 전체" },
    { key: "compat_overall", label: "전체 궁합 분위기" },
    { key: "compat_love", label: "연애/결혼 궁합" },
    { key: "compat_marriage", label: "결혼 생활 적합성" },
    { key: "compat_work", label: "일/협업 궁합" },
    { key: "compat_family", label: "가족 궁합" },
    { key: "compat_friend", label: "친구 궁합" },
  ],
  risk: [
    { key: "overview", label: "리스크 전체" },
    { key: "risk_money", label: "재물 리스크" },
    { key: "risk_relationship", label: "관계 리스크" },
    { key: "risk_health", label: "건강 리스크" },
    { key: "risk_lawsuit", label: "법적/계약 리스크" },
    { key: "risk_burnout", label: "번아웃 리스크" },
  ],
  meta: [
    { key: "overview", label: "사주 사용 전체" },
    { key: "meta_structure", label: "전체 구조 요약" },
    { key: "meta_cycle", label: "대운·세운 큰 흐름" },
    { key: "meta_trigger", label: "트리거 포인트" },
    { key: "meta_usage", label: "실전 활용법" },
  ],
  etc: [],
};
