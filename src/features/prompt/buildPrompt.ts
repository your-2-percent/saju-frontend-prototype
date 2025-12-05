// features/AnalysisReport/buildPrompt.ts
export { buildChatPrompt } from "./buildPromptSingle";
export { buildMultiLuckPrompt } from "./buildPromptMulti";
import type { BlendTab } from "@/features/AnalysisReport/logic/blend";

// 필요하면 타입 같이 재노출
export type { DaewoonInfo } from "./buildPromptMulti";

export type MainCategoryKey =
  | "personality"
  | "lifeFlow"
  | "love"
  | "career"
  | "money"
  | "family"
  | "health"
  | "move"
  | "social"
  | "compat"
  | "risk"
  | "meta"
  | "etc";

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

// timeMode는 프롬프트 관점에서 "단일 탭 vs 멀티 운 세트"
export type TimeMode = "single" | "multi";

export type RelationMode = "solo" | "couple";

export type TopicContext = {
    topic?: MainCategoryKey;
    subTopic?: SubCategoryKey;
    timeMode: string;
    tab?: BlendTab | undefined;      // 싱글 모드에서는 필수
    relationMode?: RelationMode;
}

// 🔥 사주 해석 톤 프리셋
type ToneKey =
  | "analysis"
  | "teacher"
  | "mentor"
  | "speed"
  | "dryHumor"
  | "softWarm"
  | "pro"

export function buildTopicGuide(ctx: TopicContext & { tone?: ToneKey }) {
  const { topic, subTopic, timeMode = "single", tab, relationMode, tone } = ctx;

  // 카테고리 없으면 아무 것도 안 붙임
  if (!topic) return "";

  const lines: string[] = [];

  /* ───────── 공통 스타일 가이드 (모든 카테고리 공통) ───────── */

  // 사주 공부형(전문가용)인지 체크
  const isStudyTone =
    tone === "analysis" || tone === "teacher" || tone === "pro";

  if (!isStudyTone) {
    // 🔹 초보자용 톤 → 기존 가이드 그대로
    lines.push(
      "- AI 특유의 긍정적이기만 한 면은 제외한다, 최대한 객관적이고 중립적이게 사주만을 보고 설명한다. (감정적, 감성적, 추상적 문구 지양)",
      "- 애매하게 말하지 말고, 명확하게 대답한다. (사주 보는 사람들은 단정적인 결론을 선호함)",
      "- 사용자는 사주/운세를 거의 모르는 초보라고 가정한다.",
      "- “비겁, 식상, 오행, 십성, 십이운성” 같은 사주 전문 용어는 쓰지 말고, 일상적인 말로 풀어서 설명한다.",
      "- 답변은 상담실에서 직접 말로 설명하듯이, 구어체(~예요, ~할 수 있어요)로 작성한다.",
      "- 장점과 단점을 모두 말한다.",
      "- 제공된 JSON/수치는 내부 참고용으로만 이해하고 그대로 나열하지 않는다.",
      "- 출생정보는 초반 문단 안에 자연스럽게 녹여서 설명한다.",
      "- 전문 용어 대신 실제 생활 장면 중심으로 풀어서 설명한다.",
      "- 글머리표 사용 금지, 자연스러운 상담 대화처럼 작성한다."
    );
  } else {
    // 🔹 사주 공부형(분석형, 선생님형, 전문가형) → 다른 규칙
    lines.push(
      "- 분석·연구 목적의 해석이므로, 필요한 경우 사주 전문 용어(오행, 십성, 구조적 패턴 등)를 사용해도 된다.",
      "- 다만 용어를 쓸 때는 반드시 짧게라도 의미를 함께 붙여서, 문맥이 자연스러워지게 설명한다.",
      "- 초보자용 구어체를 강제하지 않는다. 문장은 전문적이고 구조적으로 정리한다.",
      "- 추상적이지 않게, 사주 구조와 기법을 객관적으로 설명한다.",
      "- 지나치게 단정 짓지 않고, 구조적 인과관계를 중심으로 설명한다.",
      "- JSON/수치는 참고 가능하지만, 결과 문장에는 자연스럽게 녹여서 쓴다."
    );
  }

  /* ───────── 시간 모드에 따른 가이드 ───────── */

  if (timeMode === "single") {
    if (tab) {
      lines.push(
        `- 지금 보고 있는 탭(${tab}) 시기를 중심으로 설명하되, 타고난 기질과 이 시기의 분위기가 어떻게 섞이는지 함께 말한다.`,
        "- “원래는 이런 스타일인데, 지금 시기에는 이런 성향이 특히 더 부각되거나 조정될 수 있다”는 식으로 연결해서 설명한다."
      );
    } else {
      lines.push(
        "- 단일 시점에 대한 해석이므로, 그 시기에 실제로 벌어질 법한 장면을 예시로 많이 들어서 설명한다."
      );
    }
  } else {
    lines.push(
      "- 여러 시점(대운/세운/월운/일운)이 함께 있으므로, 시간 순서대로 분위기 변화와 주요 이슈가 어떻게 이어지는지 흐름 위주로 정리한다.",
      "- “앞부분 몇 년은 이런 느낌으로 시작해서, 중간에 이런 전환기가 오고, 그 이후에는 이런 식으로 안정되거나 방향이 바뀔 수 있다”처럼 이야기를 풀어간다."
    );
  }

  /* ───────── 카테고리별 디테일 가이드 ───────── */

  switch (topic) {
    case "personality": {
      lines.push(
        "- 이 해석은 ‘타고난 성향/성격’에 초점을 둔다.",
        "- 타고난 기질과, 환경·경험 때문에 만들어진 행동 패턴을 구분해서 짚어준다."
      );

      if (!subTopic || subTopic === "overview" || subTopic === "personality_basic") {
        lines.push(
          "- 답변은 아래 다섯 축을 중심으로 충분히 길게 서술한다.",
          "  1) 기본 성격 틀: 내향/외향, 추진력, 소심/대담, 완벽주의 경향 등을 주변 사람 입장에서 보이는 모습과, 본인이 느끼는 내면 반응으로 나누어 설명한다.",
          "  2) 일할 때 스타일: 혼자 일할 때 VS 팀으로 움직일 때, 안정적인 루틴 VS 변화 많은 환경, 계획형 VS 즉흥형을 실제 직장·업무 상황 예시로 풀어준다.",
          "  3) 감정/대인관계: 감정을 표현하는 방식, 서운함·화가 났을 때 반응 패턴, 연애/친구 관계에서 자주 생길 수 있는 오해와 장점을 설명한다.",
          "  4) 돈 쓰는 스타일: 저축/소비/자기 투자 패턴, 언제 충동적으로 쓰기 쉬운지, 돈과 감정이 엮이는 장면을 일상 예시로 보여준다.",
          "  5) 스트레스 처리: 어떤 종류의 상황에서 특히 예민해지는지, 버티는 스타일인지 폭발하는 스타일인지, 잘 맞는 해소 방법을 생활 팁으로 제안한다.",
          "- 전체 분위기는 ‘사주 전문가가 얘기해주는 느낌’이 나면서 전문성이 보이도록 한다."
        );
      }

      if (subTopic === "personality_shadow") {
        lines.push(
          "- 특히 약점·콤플렉스·그림자 성향을 다룰 때, 비난 없이 “이런 특징이 있어서 이런 상황에서 스스로를 힘들게 만들 수 있다”는 식으로 다룬다.",
          "- 이 성향을 건강하게 쓰려면 어떤 환경과 태도가 도움이 되는지도 함께 제안한다."
        );
      }

      if (subTopic === "personality_relationshipStyle") {
        lines.push(
          "- 사람과의 거리 두는 방식, 마음을 여는 속도, 정이 들면 얼마나 오래 가는지 등을 연애/친구 관계 예시로 자세히 풀어준다."
        );
      }

      if (subTopic === "personality_workStyle") {
        lines.push(
          "- 성격이 일 스타일에 어떻게 반영되는지, “어떤 프로젝트에서 특히 살아난다 / 어떤 업무에서는 금방 지친다”를 구체적으로 설명한다."
        );
      }

      if (subTopic === "personality_stressPattern") {
        lines.push(
          "- 스트레스를 느끼는 트리거와, 겉으로 보이는 모습 vs 속으로 끙끙 앓는 부분을 구분해서 말해 준다.",
          "- 무너지지 않기 위한 최소한의 안전 장치(루틴, 사람, 환경)를 제안한다."
        );
      }

      break;
    }

    case "lifeFlow": {
      lines.push(
        "- 이 해석은 ‘인생 전반의 큰 흐름과 사이클’에 초점을 둔다.",
        "- 구체적인 사건을 예언하기보다는, 인생에서 반복되는 테마와 분위기 변화를 설명한다.",
        "- 어린 시절, 20대, 30대 이후처럼 큰 구간으로 나눠서, 각각의 시기에 어떤 주제가 강하게 작동하는지 말해준다.",
        "- 전환점·터닝포인트·쉬어가야 할 시기를 짚어주고, 각 시기에 잘 맞는 삶의 전략을 같이 제안한다."
      );

      if (subTopic === "lifeFlow_turningPoint") {
        lines.push(
          "- 특히 ‘인생 갈림길’이 될 수 있는 시기와, 그때 어떤 선택 기준을 잡으면 좋은지를 자세히 설명한다."
        );
      }

      break;
    }

    case "love": {
      lines.push(
        "- 이 해석은 ‘사랑/연애/결혼’ 이슈에 초점을 둔다.",
        "- 감정선 변화, 애정 표현 방식, 관계에서 자주 반복되는 패턴을 중심으로 서술한다."
      );

      if (!subTopic || subTopic === "overview" || subTopic === "love_pattern") {
        lines.push(
          "- 내가 어떤 스타일의 연애를 하기 쉬운지, 어떤 타입의 사람에게 끌리기 쉬운지, 과거 연애에서 반복됐을 법한 패턴을 정리해 준다."
        );
      }

      if (subTopic === "love_timing") {
        lines.push(
          "- 새로운 인연이 들어오기 좋은 시기, 관계가 깊어지기 쉬운 시기, 정리가 필요해지는 시기를 시간 흐름에 맞춰 정리한다."
        );
      }

      if (subTopic === "love_partner") {
        lines.push(
          "- 잘 맞는 파트너 성향과, 피하는 게 좋은 타입을 구체적인 성격·라이프스타일 예시로 설명한다."
        );
      }

      if (subTopic === "love_current") {
        lines.push(
          "- 현재 관계에서 생길 수 있는 오해 포인트, 서로에게 기대할 수 있는 부분, 조심하면 좋은 부분을 중심으로 말한다."
        );
      }

      if (subTopic === "love_breakup") {
        lines.push(
          "- 이별/재회 이슈를 다룰 때는, 감정의 흐름과 회복 과정에 초점을 두고, 상대를 탓하거나 단정적인 표현은 피한다."
        );
      }

      if (subTopic === "love_marriageChange") {
        lines.push(
          "- 결혼·동거·관계 격상과 같은 큰 변화가 언제·어떤 분위기에서 일어나기 쉬운지 설명한다."
        );
      }

      if (relationMode === "solo") {
        lines.push(
          "- 기준은 '현재 솔로이거나, 앞으로의 연애/결혼 흐름이 궁금한 사람'으로 둔다.",
          "- 어떤 스타일의 사람에게 끌리기 쉬운지, 연애에서 자주 반복되는 패턴이 무엇인지 알려준다.",
          "- 언제 인연이 들어오기 좋은지, 썸/연애로 발전하기 쉬운 타이밍을 같이 짚어준다."
        );
      } else if (relationMode === "couple") {
        lines.push(
          "- 기준은 '이미 파트너가 있거나, 특정 상대와의 관계를 보고 싶은 사람'으로 둔다.",
          "- 상대와의 관계에서 생기기 쉬운 갈등 포인트와 잘 맞는 지점을 둘 다 설명한다.",
          "- 이 관계를 건강하게 유지하려면 어떤 대화법/거리두기가 필요한지 조언을 붙인다.",
          "- 상대 명식 정보가 함께 들어온 경우, 두 사람의 기질 차이를 구체적인 예시 상황으로 풀어준다."
        );
      }

      break;
    }

    case "career": {
      lines.push(
        "- 이 해석은 ‘직업/커리어/진로/공부·시험’에 초점을 둔다.",
        "- 지금 하는 일과의 궁합, 앞으로 어떤 형태의 일이 잘 맞는지, 일하는 방식의 강점·약점을 중심으로 본다."
      );

      if (!subTopic || subTopic === "overview") {
        lines.push(
          "- 안정적인 회사/직장 VS 유동적인 프리랜스·자영업 중 어떤 쪽과 더 맞는지, 실제 업무 예시로 설명한다.",
          "- 혼자 파고드는 프로젝트 VS 팀과 함께 움직이는 일 중 어디에서 더 만족감을 느끼는지 말해준다."
        );
      }

      if (subTopic === "career_aptitude") {
        lines.push(
          "- 잘 맞는 업종·역할(예: 기획, 분석, 사람 상대, 크리에이티브 등)을 구체적인 업무 그림으로 설명한다."
        );
      }

      if (subTopic === "career_mode") {
        lines.push(
          "- 정규직, 프리랜스, 자영업, 파트타임 등 어떤 방식이 에너지·성격과 잘 맞는지 설명한다."
        );
      }

      if (subTopic === "career_jobChange") {
        lines.push(
          "- 이직/퇴사를 고민할 때의 신호와, 실제로 움직이기 좋은 시기, 위험한 타이밍을 구분해서 이야기한다."
        );
      }

      if (subTopic === "career_promotion") {
        lines.push(
          "- 승진·직급 상승 가능성을 다룰 때, 시기뿐 아니라 전제 조건(성과, 인간관계, 조직 상황)을 함께 제시한다."
        );
      }

      if (subTopic === "career_study" || subTopic === "career_exam") {
        lines.push(
          "- 공부/시험의 집중력·지속력 흐름을 설명하고, 언제 몰아붙이고 언제 정리하면 좋은지 타이밍 위주로 말해준다."
        );
      }

      break;
    }

    case "money": {
      lines.push(
        "- 이 해석은 ‘돈/재물/수입·지출’에 초점을 둔다.",
        "- 단순 운 좋고 나쁨이 아니라, 돈과의 관계, 쓰고 버는 패턴, 리스크를 중심으로 본다."
      );

      if (!subTopic || subTopic === "overview" || subTopic === "money_flow") {
        lines.push(
          "- 전반적인 돈의 흐름(들어오는 속도, 나가는 패턴, 모이는 구조)을 큰 그림으로 설명한다."
        );
      }

      if (subTopic === "money_income") {
        lines.push(
          "- 연봉, 보너스, 부수입 등 수입이 늘어날 수 있는 타이밍과 방식(직장 내, 부업, 프리랜스 등)을 함께 말한다."
        );
      }

      if (subTopic === "money_spending") {
        lines.push(
          "- 스트레스 받을 때, 기분 좋을 때, 인간관계에서 특히 돈을 많이 쓰기 쉬운 순간을 짚어준다."
        );
      }

      if (subTopic === "money_saving" || subTopic === "money_asset") {
        lines.push(
          "- 목돈을 모으는 방식, 장기 플랜에 맞춰 돈을 쌓는 힘이 어느 정도인지, 현실적인 전략을 제안한다."
        );
      }

      if (subTopic === "money_debt") {
        lines.push(
          "- 빚/대출은 도덕 판단이 아니라 구조 문제로 보면서, 무리하기 쉬운 패턴과 조심해야 할 선택지를 설명한다."
        );
      }

      if (subTopic === "money_invest") {
        lines.push(
          "- 투자/투기 성향을 말할 때, 위험 감수 성향과 ‘정보·분석에 얼마나 신경을 쓰는 타입인지’를 함께 다룬다."
        );
      }

      if (subTopic === "money_bigEvent") {
        lines.push(
          "- 이사, 결혼, 사업 시작 등 목돈이 크게 오가는 이벤트 시기를 중심으로, 재정 부담을 어떻게 분산하면 좋은지 이야기한다."
        );
      }

      break;
    }

    case "family": {
      lines.push(
        "- 이 해석은 ‘가족/가정’ 이슈에 초점을 둔다.",
        "- 원가족(부모·형제)과 현재 가정(배우자·자녀)을 분리해서 보는 것이 도움이 되면 그렇게 나눠 설명한다."
      );

      if (!subTopic || subTopic === "overview" || subTopic === "family_current") {
        lines.push(
          "- 현재 가정 내에서 내가 어떤 역할을 맡기 쉬운지, 책임감·돌봄·정서적 지지 측면을 중심으로 이야기한다."
        );
      }

      if (subTopic === "family_origin" || subTopic === "family_parents") {
        lines.push(
          "- 부모와의 관계에서 만들어진 기본 패턴(기대, 부담, 죄책감 등)이 지금 삶에 어떻게 이어지는지 짚어준다."
        );
      }

      if (subTopic === "family_siblings") {
        lines.push(
          "- 형제자매와의 관계 역학(맡게 되는 역할, 갈등/협력 구조)을 설명한다."
        );
      }

      if (subTopic === "family_children") {
        lines.push(
          "- 자녀운이나 양육과 관련해서는, 통제보다는 ‘어떤 태도로 아이를 대할 때 나와 아이 모두 편해지는지’를 중심으로 말한다."
        );
      }

      break;
    }

    case "health": {
      lines.push(
        "- 이 해석은 ‘건강/컨디션’에 초점을 둔다.",
        "- 의학적 진단을 내리지 말고, 취약해지기 쉬운 패턴(과로, 불면, 소화, 긴장 등)을 설명한다."
      );

      if (!subTopic || subTopic === "overview" || subTopic === "health_overall") {
        lines.push(
          "- 에너지의 기본 베이스(예: 쉽게 지치는 편/한 번 버티면 오래 가는 편)를 전체적인 느낌으로 정리한다."
        );
      }

      if (subTopic === "health_physical") {
        lines.push(
          "- 몸으로 스트레스가 나타나는 방식(두통, 위장, 근육 긴장 등)을 예시로 들어 설명한다."
        );
      }

      if (subTopic === "health_mental") {
        lines.push(
          "- 마음이 무거워질 때의 패턴(걱정, 자책, 무기력 등)을 다루되, 낙인 찍는 표현은 피하고 구체적인 생활 팁을 준다."
        );
      }

      if (subTopic === "health_stress") {
        lines.push(
          "- 어떤 상황에서 특히 스트레스를 크게 느끼는지, 그때 어떻게 조절하면 좋은지에 초점을 맞춘다."
        );
      }

      if (subTopic === "health_accident") {
        lines.push(
          "- 사고/부상 리스크를 말할 때는, 과도한 공포를 조장하지 말고, 조심하면 좋은 상황(운전, 이동, 계단 등)을 구체적으로 짚어준다."
        );
      }

      break;
    }

    case "move": {
      lines.push(
        "- 이 해석은 ‘이사/주거운’에 초점을 둔다.",
        "- 실제 이사가 성사될 가능성, 시기, 집과 동네의 분위기를 함께 본다."
      );

      if (!subTopic || subTopic === "overview" || subTopic === "move_chance") {
        lines.push(
          "- “언제쯤 집을 옮기기 쉬운지, 그 시기에 어떤 마음가짐과 여건을 준비하면 좋은지”를 중심으로 설명한다."
        );
      }

      if (subTopic === "move_timing") {
        lines.push(
          "- 이사 타이밍을 말할 때는, 한 달 단위로 찍기보다는 몇 달 단위의 구간과 분위기를 중심으로 설명한다."
        );
      }

      if (subTopic === "move_targetHouse") {
        lines.push(
          "- 마음에 둔 특정 집이 있다면, 그 집과의 인연, 들어갔을 때 생활 패턴이 어떻게 바뀔지, 좋은 점과 불편한 점을 함께 말한다."
        );
      }

      if (subTopic === "move_environment") {
        lines.push(
          "- 동네/생활권의 분위기(조용함, 활기, 접근성 등)가 이 사람 성향과 맞는지 설명한다."
        );
      }

      if (subTopic === "move_finance") {
        lines.push(
          "- 전세/월세/대출처럼 돈 흐름이 바뀌는 부분을 같이 보고, 무리하지 않는 선에서 어떻게 잡으면 좋은지 말해준다."
        );
      }

      break;
    }

    case "social": {
      lines.push(
        "- 이 해석은 ‘인간관계/사회성/인맥’에 초점을 둔다.",
        "- 사람들과의 거리감, 친해지는 속도, 갈등이 생길 때 패턴을 중심으로 본다."
      );

      if (!subTopic || subTopic === "overview" || subTopic === "social_overall") {
        lines.push(
          "- 친구·동료·지인 전반에서 반복되는 관계 패턴을 정리해 준다."
        );
      }

      if (subTopic === "social_friend") {
        lines.push(
          "- 친구 관계에서 사람들이 편하게 느끼는 점과, 오해가 생기기 쉬운 지점을 구분해서 설명한다."
        );
      }

      if (subTopic === "social_workspace") {
        lines.push(
          "- 직장 내 인간관계에서 맡게 되는 역할(조정자, 추진자, 관망자 등)을 이야기한다."
        );
      }

      if (subTopic === "social_network") {
        lines.push(
          "- 인맥을 넓히는 방식(깊은 소수 vs 넓은 얕은 관계)이 어떤 쪽에 더 가깝고, 어떻게 활용하면 좋은지 말한다."
        );
      }

      if (subTopic === "social_conflict") {
        lines.push(
          "- 갈등이 났을 때 피하는지, 정면 돌파하는지, 어느 지점에서 감정이 터지기 쉬운지 정리하고, 건강한 조절 방법을 제안한다."
        );
      }

      break;
    }

    case "compat": {
      lines.push(
        "- 이 해석은 ‘궁합/관계 상성’에 초점을 둔다.",
        "- 상대를 좋다/나쁘다로 단정하지 말고, 잘 맞는 부분과 맞추기 어려운 부분을 나눠서 설명한다."
      );

      if (!subTopic || subTopic === "overview" || subTopic === "compat_overall") {
        lines.push(
          "- 전반적인 상성의 분위기를 먼저 말하고, 일/연애/가족 등 영역별로 차이가 있다면 나눠서 설명한다."
        );
      }

      if (subTopic === "compat_love" || subTopic === "compat_marriage") {
        lines.push(
          "- 연애/결혼 궁합에서는 감정선, 생활 패턴, 가치관이 어떻게 맞는지·어디서 엇갈리는지를 구체적인 장면 예시로 풀어준다."
        );
      }

      if (subTopic === "compat_work") {
        lines.push(
          "- 직장/동업 궁합에서는 일 스타일, 책임 분배, 의사소통 방식이 얼마나 맞는지 설명한다."
        );
      }

      if (subTopic === "compat_family" || subTopic === "compat_friend") {
        lines.push(
          "- 가족/친구 관계에서는 서로가 서로에게 어떤 역할이 되기 쉬운지, 함께 있을 때 커지는 장점·단점을 나눠 말한다."
        );
      }

      break;
    }

    case "risk": {
      lines.push(
        "- 이 해석은 ‘리스크/위기 관리’에 초점을 둔다.",
        "- 공포를 조장하기보다는, 조심하면 좋은 지점을 미리 알려주는 안전 가이드처럼 설명한다."
      );

      if (!subTopic || subTopic === "overview") {
        lines.push(
          "- 돈, 사람, 건강, 멘탈 중 어느 쪽에서 리스크가 자주 생기기 쉬운지 큰 방향부터 말해준다."
        );
      }

      if (subTopic === "risk_money") {
        lines.push(
          "- 돈과 관련된 리스크(무리한 투자, 과소비, 빚 구조 등)를 다루고, 피해야 할 선택과 피해야 할 타이밍을 설명한다."
        );
      }

      if (subTopic === "risk_relationship") {
        lines.push(
          "- 인간관계에서 반복될 수 있는 위험 패턴(집착, 회피, 갑작스러운 단절 등)을 조심스럽게 짚어준다."
        );
      }

      if (subTopic === "risk_health") {
        lines.push(
          "- 건강/사고 리스크에 대해서는, 일상에서 바로 적용 가능한 안전 수칙 수준으로만 조언한다."
        );
      }

      if (subTopic === "risk_lawsuit") {
        lines.push(
          "- 법적 분쟁/소송/계약 관련 이슈는 결과를 단정하지 말고, 과정에서 생길 수 있는 부담과 체크해야 할 포인트를 정리한다."
        );
      }

      if (subTopic === "risk_burnout") {
        lines.push(
          "- 번아웃/멘탈 붕괴 리스크를 다룰 때는, 나를 소진시키는 패턴과 이를 예방하기 위한 최소한의 휴식·경계선 설정을 제안한다."
        );
      }

      break;
    }

    case "meta": {
      lines.push(
        "- 이 해석은 ‘사주 구조를 어떻게 활용하면 좋은지’에 초점을 둔다.",
        "- 기법 이름을 나열하지 말고, “이 사람 인생 구조가 대체로 이런 방향을 띠고 있어서, 이렇게 계획하면 좋다”는 식으로 정리한다."
      );

      if (subTopic === "meta_structure" || !subTopic || subTopic === "overview") {
        lines.push(
          "- 전체 구조에서 눈에 띄는 강점/약점을 요약하고, 이를 기반으로 삶의 전략을 제안한다."
        );
      }

      if (subTopic === "meta_cycle") {
        lines.push(
          "- 대운/세운 흐름을 크게 묶어서, 인생의 큰 챕터를 나누듯이 설명한다."
        );
      }

      if (subTopic === "meta_trigger") {
        lines.push(
          "- 형충, 합, 신살 등 여러 트리거가 겹칠 때 어떤 이벤트가 일어나기 쉬운지를 정리하되, 용어는 쓰지 않는다."
        );
      }

      if (subTopic === "meta_usage") {
        lines.push(
          "- 이 명식을 가진 사람이 앞으로 인생 계획을 세울 때, 어떤 기준을 잡으면 좋은지 실질적인 활용 가이드를 준다."
        );
      }

      break;
    }
  }

  return lines.join("\n");
}
