// features/prompt/topicGuide/topicGuidesB.ts

import type { MainCategoryKey, SubCategoryKey } from "./types";

type Args = {
  topic: MainCategoryKey;
  subTopic?: SubCategoryKey;
  isStudyTone: boolean;
};

export function appendTopicGuidesB(lines: string[], args: Args): boolean {
  const { topic, subTopic, isStudyTone } = args;
  const push = (...xs: string[]) => lines.push(...xs);

  switch (topic) {
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
      return true;
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
      return true;
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

      if (subTopic === "health_accident") {
        push("- 사고는 장소/상황(운전/이동/계단/물가 등)으로 구체화.");
      }
      return true;
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
      return true;
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
      return true;
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
      return true;
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
      return true;
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
      return true;
    }
  }

  return false;
}
