// features/AnalysisReport/buildPrompt.ts
export { buildChatPrompt } from "./buildPromptSingle";
export { buildMultiLuckPrompt } from "./buildPromptMulti";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";

// 필요하면 타입 같이 재노출
export type { DaewoonInfo } from "./buildPromptMulti";

/**
 * 메인 카테고리
 * - etc: 기본형(공통 프롬프트만)
 */
export type MainCategoryKey =
  | "etc" // ✅ 기본형(공통)
  | "personality"
  | "lifeFlow"
  | "love"
  | "career"
  | "money"
  | "family"
  | "baby"
  | "health"
  | "move"
  | "social"
  | "compat"
  | "risk"
  | "meta";

/** 서브 카테고리 (대분류별 prefix로 구분) */
export type SubCategoryKey =
  // 공통: 전체 개요
  | "overview"

  // 성격 · 기질 (personality)
  | "personality_basic"
  | "personality_shadow"
  | "personality_relationshipStyle"
  | "personality_workStyle"
  | "personality_stressPattern"

  // 인생 흐름 · 사이클 (lifeFlow)
  | "lifeFlow_cycle"
  | "lifeFlow_turningPoint"
  | "lifeFlow_peak"
  | "lifeFlow_down"
  | "lifeFlow_theme"

  // 사랑 · 연애 · 결혼 (love)
  | "love_pattern"
  | "love_timing"
  | "love_partner"
  | "love_current"
  | "love_breakup"
  | "love_marriageChange"

  // 직업 · 진로 · 학업 · 시험 (career)
  | "career_aptitude"
  | "career_mode"
  | "career_jobChange"
  | "career_promotion"
  | "career_study"
  | "career_exam"

  // 돈 · 재물 · 수입/지출 (money)
  | "money_flow"
  | "money_income"
  | "money_spending"
  | "money_saving"
  | "money_asset"
  | "money_debt"
  | "money_invest"
  | "money_bigEvent"

  // 가족 · 가정 (family)
  | "family_origin"
  | "family_current"
  | "family_parents"
  | "family_siblings"
  | "family_children"
  | "family_care"

  // 임신 · 출산 · 택일 (baby)
  | "baby_pregnancy"
  | "baby_birth"
  | "baby_selection"

  // 건강 · 컨디션 (health)
  | "health_overall"
  | "health_physical"
  | "health_mental"
  | "health_stress"
  | "health_accident"

  // 이사 · 주거 (move)
  | "move_timing"
  | "move_chance"
  | "move_targetHouse"
  | "move_environment"
  | "move_finance"

  // 인간관계 · 사회성 · 인맥 (social)
  | "social_overall"
  | "social_friend"
  | "social_workspace"
  | "social_network"
  | "social_conflict"

  // 궁합 · 관계 상성 (compat)
  | "compat_overall"
  | "compat_love"
  | "compat_marriage"
  | "compat_work"
  | "compat_family"
  | "compat_friend"

  // 리스크 · 위기 (risk)
  | "risk_money"
  | "risk_relationship"
  | "risk_health"
  | "risk_lawsuit"
  | "risk_burnout"

  // 메타 · 구조 · 해석 가이드 (meta)
  | "meta_structure"
  | "meta_cycle"
  | "meta_trigger"
  | "meta_usage";

// ✅ 기본형(공통) 프롬프트 묶음
const BASE_GUIDE_BEGINNER: string[] = [
  "- AI 특유의 긍정적이기만 한 면은 제외한다, 최대한 객관적이고 중립적이게 사주만을 보고 설명한다. (감정적, 감성적, 추상적 문구 지양)",
  "- 애매하게 말하지 말고, 명확하게 대답한다. (사주 보는 사람들은 단정적인 결론을 선호함)",
  "- 사용자는 사주/운세를 거의 모르는 초보라고 가정한다.",
  "- “비겁, 식상, 오행, 십성, 십이운성” 같은 사주 전문 용어는 쓰지 말고, 일상적인 말로 풀어서 설명한다.",
  "- 답변은 상담실에서 직접 말로 설명하듯이, 구어체(~예요, ~할 수 있어요)로 작성한다.",
  "- 장점과 단점을 모두 말한다.",
  "- 제공된 JSON/수치는 내부 참고용으로만 이해하고 그대로 나열하지 않는다.",
  "- 출생정보는 초반 문단 안에 자연스럽게 녹여서 설명한다.",
  "- 전문 용어 대신 실제 생활 장면 중심으로 풀어서 설명한다.",
  "- 글머리표 사용 금지, 자연스러운 상담 대화처럼 작성한다.",
];

const BASE_GUIDE_TEACHER_EVENT: string[] = [
  "- 목적: 사주를 ‘사건 예측 리포트’로 작성한다. 비유/감성/훈계/반복/장황한 전개 금지.",
  "- 문체: 결론 먼저, 문장 짧게. 같은 말 반복 금지. ‘흐름/에너지/기운’ 같은 추상어 금지.",
  "- 금지: ‘~일 수 있다/가능성/그럴 수도’ 같은 보험 문장 금지. 애매하면 하나로 찍어 말한다.",
  "- 단, 의학/법률의 확정 진단·판결 같은 최종 단정은 피하고, ‘검사/응급/수술/기관개입/분쟁’ 수준으로 사건을 단정한다.",
  "",
  "【필수 해석요소(누락 금지)】",
  "- 원국 + 운(대운/세운/월운/일운)의 음양오행 분포/충돌",
  "- 십신 단독 해석 금지 → 원국+운 전체와의 유기성으로만 해석",
  "- 합·충·형·파·해: 성립 여부 + 실제 작용 여부 구분",
  "- 십이운성 + 십이신살: 개별 사용 금지 → 동시 작용(유기성) 있을 때만 사건화",
  "- 기타 신살: 보조 지표",
  "- 납음오행: 보조/확증(단독 결론 금지)",
  "",
  "【출력 규칙】",
  "- 핵심 사건만. 자잘한 감기/사소한 인간관계 갈등/마음가짐 조언 제외",
  "- 한 항목 = 한 사건. 1~2문장으로 끝",
];

function appendBaseGuide(lines: string[], isStudyTone: boolean) {
  lines.push("### 기본형(공통)");
  const base = isStudyTone ? BASE_GUIDE_TEACHER_EVENT : BASE_GUIDE_BEGINNER;
  lines.push(...base);
}


// timeMode는 프롬프트 관점에서 "단일 탭 vs 멀티 운 세트"
export type TimeMode = "single" | "multi";
export type RelationMode = "solo" | "couple";

export type TopicContext = {
  topic?: MainCategoryKey;
  subTopic?: SubCategoryKey;
  timeMode: string;
  tab?: BlendTab | undefined; // 싱글 모드에서는 필수
  relationMode?: RelationMode;
};

function normalizeTimeMode(timeMode: string): TimeMode {
  return timeMode === "multi" ? "multi" : "single";
}

export function buildTopicGuide(ctx: TopicContext & { teacherMode?: boolean }) {
  const { topic, subTopic, timeMode = "single", tab, relationMode, teacherMode } =
    ctx;

  // 카테고리 없으면 아무 것도 안 붙임
  if (!topic) return "";

  const mode = normalizeTimeMode(timeMode);
  const lines: string[] = [];

  const isStudyTone = teacherMode === true;

  const push = (...xs: string[]) => lines.push(...xs);

  /* ─────────────────────────────────────────────────────────
   * 0) 기본형(공통) — “etc(기본형)”은 이 섹션만 출력
   * ───────────────────────────────────────────────────────── */

  appendBaseGuide(lines, isStudyTone);

  // ✅ topic이 etc(기본형)면 여기서 끝 (기본형만 달림)
  if (topic === "etc") return lines.join("\n");

  /* ─────────────────────────────────────────────────────────
   * 1) 시간 모드 가이드 (기본형 아래에 추가)
   * ───────────────────────────────────────────────────────── */

  if (mode === "single") {
    if (tab) {
      if (!isStudyTone) {
        push(
          "",
          "## 시간 모드(단일)",
          `- 지금 보고 있는 탭(${tab}) 시기를 중심으로 설명하되, 타고난 기질과 이 시기의 분위기가 어떻게 섞이는지 함께 말한다.`,
          "- “원래는 이런 스타일인데, 지금 시기에는 이런 부분이 더 강해지거나 약해질 수 있다”처럼 연결한다."
        );
      } else {
        push(
          "",
          "## 시간 모드(단일·분석형)",
          `- 기준 시기: 탭(${tab})을 메인으로 두고, 원국과 운의 결합으로 ‘트리거(합충형파해 + 운성/신살 중첩)’가 무엇인지부터 뽑는다.`,
          "- 결론은 ‘이 시기에 터질 사건/이슈’ → 그 다음 줄에 ‘작용한 구조(근거)’ 순서로 쓴다."
        );
      }
    } else {
      push(
        "",
        "## 시간 모드(단일)",
        "- 단일 시점 해석이므로, 해당 시기에 실제로 벌어질 만한 사건/장면을 중심으로 정리한다."
      );
    }
  } else {
    if (!isStudyTone) {
      push(
        "",
        "## 시간 모드(멀티)",
        "- 여러 시점(대운/세운/월운/일운)이 함께 있으므로, 시간 순서대로 분위기 변화와 주요 이슈가 어떻게 이어지는지 흐름 위주로 정리한다."
      );
    } else {
      push(
        "",
        "## 시간 모드(멀티·분석형)",
        "- 시간 순서대로 ‘핵심 사건이 터지는 구간’만 표시한다. 평이한 구간은 과감히 생략한다.",
        "- 각 구간은 ‘사건 요약’ → ‘근거(합충형파해/운성/신살/십신 유기성)’ 순서로 1~2줄만 쓴다."
      );
    }
  }

  if (isStudyTone) {
    lines.push(
      "- (teacherMode) 시간모드는 ‘사건 터지는 구간’만 강조하고, 평이한 구간은 생략한다.",
      "- 각 구간은 ‘사건 요약 → 근거(합충형파해/운성·신살 중첩/십신 유기성)’ 순서로 1~2줄로 끝낸다."
    );
  }

  /* ─────────────────────────────────────────────────────────
   * 2) 카테고리별 추가 프롬프트 (기본형 + 시간모드 아래에 덧붙임)
   * ───────────────────────────────────────────────────────── */

  switch (topic) {
    case "personality": {
      if (!isStudyTone) {
        push(
          "",
          "## 카테고리(성격·기질)",
          "- 타고난 성향/성격에 초점을 둔다.",
          "- 타고난 기질과 환경·경험 때문에 만들어진 행동 패턴을 구분해서 짚는다."
        );
      } else {
        push(
          "",
          "## 카테고리(성격·기질·분석형)",
          "- 사건 예언이 아니라 ‘반응 패턴/트리거/결정 습관’을 구조로 정리한다.",
          "- 십신 단독 설명 금지. 오행 밸런스 + 용신/희기(사용 중인 체계 기준) + 합충형파해 트리거와 연결해서, 실제 행동으로 번역한다.",
          "- 결론은 한 문장으로: “이 타입은 XX 상황에서 YY로 반응한다.” 같은 형태로 쓴다."
        );
      }

      if (subTopic === "personality_shadow") {
        push(
          "- 약점·그림자 성향은 비난 없이, 실제 문제로 이어지는 트리거/상황을 짚고, 대응은 ‘행동 레벨’로만 제안한다."
        );
      }
      if (subTopic === "personality_relationshipStyle") {
        push("- 관계에서 거리두기/붙기 패턴, 오해 트리거를 사건/장면 단위로 쓴다.");
      }
      if (subTopic === "personality_workStyle") {
        push("- 업무 스타일은 ‘잘 되는 환경/망하는 환경’을 구체 장면으로만 쓴다.");
      }
      if (subTopic === "personality_stressPattern") {
        push("- 스트레스는 ‘터지는 조건’과 ‘무너지는 방식’을 구체적으로 적는다.");
      }
      break;
    }

    case "lifeFlow": {
      if (!isStudyTone) {
        push(
          "",
          "## 카테고리(인생 흐름)",
          "- 인생 전반의 큰 흐름과 사이클에 초점을 둔다.",
          "- 반복되는 테마와 분위기 변화를 설명한다."
        );
      } else {
        push(
          "",
          "## 카테고리(인생 흐름·분석형)",
          "- 장황한 서사 금지. ‘전환기/피크/다운 구간’만 잡아서 구조적으로 정리한다.",
          "- 전환기 판단 근거는: 대운 교체 + 세운 트리거(합충형파해) + 운성/신살 중첩 + 십신의 유기성으로만 제시한다.",
          "- 결과는 ‘구간별 핵심 사건/의사결정 포인트’로만 쓴다."
        );
      }

      if (subTopic === "lifeFlow_turningPoint") {
        push("- 갈림길은 ‘선택지 A/B’로 쪼개고, 각각의 리스크를 사건 단위로 적는다.");
      }
      break;
    }

    case "love": {
      if (!isStudyTone) {
        push(
          "",
          "## 카테고리(사랑·연애·결혼)",
          "- 사랑/연애/결혼 이슈에 초점을 둔다.",
          "- 감정선 변화, 애정 표현 방식, 관계 패턴을 중심으로 서술한다."
        );
      } else {
        push(
          "",
          "## 카테고리(사랑·연애·결혼·분석형)",
          "- ‘관계 사건’만 쓴다: 만남/재회/동거/혼인/파혼/이별/절연/소송성 분쟁.",
          "- 십신(재·관·식상 등) 단독 해석 금지. 원국+운의 작용으로 ‘관계에 실제로 생기는 사건’만 도출한다.",
          "- 합/충/파/형이 ‘관계 단절/격상’으로 작동하는 달(구간)만 강조한다."
        );
      }

      if (relationMode === "solo") {
        push("- 솔로 기준: 인연 유입/정리 시기, 관계가 사건으로 바뀌는 트리거만 적는다.");
      } else if (relationMode === "couple") {
        push("- 커플 기준: 싸움의 원인 분석 말고 ‘이 시기 이 사건(갈등/합의/결정)’이 난다로 적는다.");
      }
      break;
    }

    case "career": {
      if (!isStudyTone) {
        push(
          "",
          "## 카테고리(직업·커리어)",
          "- 직업/커리어/진로/공부·시험 이슈에 초점을 둔다."
        );
      } else {
        push(
          "",
          "## 카테고리(직업·커리어·분석형)",
          "- 커리어는 ‘사건’으로만: 이직/퇴사/해고/부서이동/승진/프로젝트 실패·성공/사업 시작·정리.",
          "- 관성/식상/인성/재성의 유기성이 실제 직장 이벤트로 어떻게 번역되는지 명확히 쓴다.",
          "- 문서(계약/평가/결재) 이슈는 신살·납음은 보조로만, 핵심은 합충형파해+십신 상호작용으로 찍는다."
        );
      }

      if (subTopic === "career_jobChange") push("- 이동은 ‘언제 움직여야 이득/손해’로만 정리.");
      if (subTopic === "career_promotion") push("- 승진은 조건 설명 말고 ‘승진/권한/책임 증가’ 사건으로 표현.");
      break;
    }

    case "money": {
      if (!isStudyTone) {
        push(
          "",
          "## 카테고리(돈·재물)",
          "- 돈/재물/수입·지출 이슈에 초점을 둔다."
        );
      } else {
        push(
          "",
          "## 카테고리(돈·재물·분석형)",
          "- 돈은 ‘큰 이벤트’만: 목돈 유입/유출, 대출/채무 재편, 투자 손익 확정, 보너스/정산, 세금·환급, 사업자금, 개인회생/법적 금융 절차.",
          "- 재성 단독 해석 금지. 원국 구조 + 운의 합충형파해 + 십신 유기성으로 ‘돈이 들어오고/깨지는 사건’만 말한다.",
          "- 납음오행·신살은 “확증(왜 그 달이 더 강한지)” 용도로만 한 줄 보조한다."
        );
      }

      if (subTopic === "money_debt") push("- 빚/회생/조정은 절차 이벤트 중심으로(인가/보정/변제변경 등).");
      if (subTopic === "money_bigEvent") push("- 이사·결혼·사업 같은 목돈 이벤트는 ‘돈이 어디서 땡겨지고 어디서 터지는지’로 적는다.");
      break;
    }

    case "family": {
      if (!isStudyTone) {
        push("", "## 카테고리(가족·가정)", "- 가족/가정 이슈에 초점을 둔다.");
      } else {
        push(
          "",
          "## 카테고리(가족·가정·분석형)",
          "- 가족은 ‘사건’만: 부모/배우자 건강 이슈, 돌봄 부담 폭증, 관계 단절/화해, 집안 큰 지출, 법적/상속성 문제.",
          "- 십이운성/십이신살은 ‘가족 이벤트가 현실화되는 트리거’로만 쓰고, 단독 과장 금지."
        );
      }
      break;
    }

    case "baby": {
      if (!isStudyTone) {
        push("", "## 카테고리(임신·출산·택일)", "- 임신/출산/택일 이슈에 초점을 둔다.");
      } else {
        push(
          "",
          "## 카테고리(임신·출산·택일·분석형)",
          "- ‘사건’ 기준으로만: 임신 시도/성공, 의료적 개입, 출산 관련 준비 이벤트.",
          "- 확정 진단/의학적 결론 단정은 금지. 대신 ‘검사/병원 일정/컨디션 리스크’로 사건화한다."
        );
      }
      break;
    }

    case "health": {
      if (!isStudyTone) {
        push("", "## 카테고리(건강·컨디션)", "- 건강/컨디션 이슈에 초점을 둔다.");
      } else {
        push(
          "",
          "## 카테고리(건강·컨디션·분석형)",
          "- 건강은 ‘큰 사건’만: 응급, 큰 질병 신호, 수술/시술, 사고/부상.",
          "- 진단명 단정 금지. 대신 ‘검사/응급/수술 가능성이 높은 달’처럼 사건 단위로 말한다.",
          "- 사고수는 합충형파해 + 운성/신살 중첩이 ‘현실 사고’로 작동하는 달만 찍는다."
        );
      }

      if (subTopic === "health_accident") push("- 사고는 장소/상황(운전/이동/계단/물가 등)으로 구체화.");
      break;
    }

    case "move": {
      if (!isStudyTone) {
        push("", "## 카테고리(이사·주거)", "- 이사/주거운에 초점을 둔다.");
      } else {
        push(
          "",
          "## 카테고리(이사·주거·분석형)",
          "- 이사는 ‘문서 사건’으로 본다: 계약, 보증금, 대출, 매매/전세 전환, 강제 이동.",
          "- 인성(문서)·재성(돈)·관성(규정/기관)의 유기성을 기준으로 사건을 찍는다.",
          "- 신살/납음은 ‘이동이 강제냐/자발이냐’ 보조 근거로만 한 줄."
        );
      }
      break;
    }

    case "social": {
      if (!isStudyTone) {
        push("", "## 카테고리(인간관계·사회성)", "- 인간관계/사회성 이슈에 초점을 둔다.");
      } else {
        push(
          "",
          "## 카테고리(인간관계·사회성·분석형)",
          "- 인간관계는 ‘절연/재회/폭로/분쟁/팀 재편’ 같은 사건만.",
          "- 파(破)/해(害)/충(沖)이 실제 단절로 작동하는 달만 강조한다."
        );
      }
      break;
    }

    case "compat": {
      if (!isStudyTone) {
        push("", "## 카테고리(궁합·관계 상성)", "- 궁합/관계 상성 이슈에 초점을 둔다.");
      } else {
        push(
          "",
          "## 카테고리(궁합·관계 상성·분석형)",
          "- ‘서로의 기운 설명’ 말고, 둘이 만나면 현실에서 어떤 사건이 잘 나는지로 적는다.",
          "- 부부/연인/동업 구분해서, 합충형파해가 ‘갈등/합의/결정’으로 바뀌는 타이밍만 찍는다."
        );
      }
      break;
    }

    case "risk": {
      if (!isStudyTone) {
        push("", "## 카테고리(리스크·위기)", "- 리스크/위기 관리에 초점을 둔다.");
      } else {
        push(
          "",
          "## 카테고리(리스크·위기·분석형)",
          "- 공포팔이 금지. 대신 ‘사건이 터질 확률이 높은 달’만 체크리스트처럼 쓴다.",
          "- 법적/금융/사고는 합충형파해 + 운성/신살의 ‘동시작용’이 있을 때만 사건화한다."
        );
      }
      break;
    }

    case "meta": {
      if (!isStudyTone) {
        push("", "## 카테고리(메타·구조)", "- 사주 구조를 어떻게 활용하면 좋은지에 초점을 둔다.");
      } else {
        push(
          "",
          "## 카테고리(메타·구조·분석형)",
          "- 사용한 기법을 ‘나열’하지 말고, 어떤 근거로 어떤 결론이 나왔는지 인과를 짧게 설명한다.",
          "- 단, 설명은 3~7줄 이내. 길어지면 실패다 ㅋㅋ"
        );
      }
      break;
    }
  }

  return lines.join("\n");
}
