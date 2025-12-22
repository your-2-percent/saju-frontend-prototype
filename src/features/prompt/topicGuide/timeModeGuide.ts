// features/prompt/topicGuide/timeModeGuide.ts

import type { BlendTab } from "@/features/AnalysisReport/logic/blend";
import type { TimeMode } from "./types";

type Args = {
  mode: TimeMode;
  tab?: BlendTab | undefined;
  isStudyTone: boolean;
};

export function appendTimeModeGuide(lines: string[], args: Args) {
  const { mode, tab, isStudyTone } = args;
  const push = (...xs: string[]) => lines.push(...xs);

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
}
