// features/prompt/topicGuide/buildTopicGuide.ts

import { appendBaseGuide } from "./baseGuide";
import { appendTimeModeGuide } from "./timeModeGuide";
import { appendTopicGuides } from "./topicGuides";
import type { TopicContext } from "./types";
import { normalizeTimeMode } from "./types";

export function buildTopicGuide(ctx: TopicContext & { teacherMode?: boolean }) {
  const { topic, subTopic, timeMode = "single", tab, relationMode, teacherMode } =
    ctx;

  // 카테고리 없으면 아무 것도 안 붙임
  if (!topic) return "";

  const mode = normalizeTimeMode(timeMode);
  const lines: string[] = [];

  const isStudyTone = teacherMode === true;

  /* ─────────────────────────────────────────────────────────
   * 0) 기본형(공통) — “etc(기본형)”은 이 섹션만 출력
   * ───────────────────────────────────────────────────────── */

  appendBaseGuide(lines, isStudyTone);

  // ✅ topic이 etc(기본형)면 여기서 끝 (기본형만 달림)
  if (topic === "etc") return lines.join("\n");

  /* ─────────────────────────────────────────────────────────
   * 1) 시간 모드 가이드 (기본형 아래에 추가)
   * ───────────────────────────────────────────────────────── */

  appendTimeModeGuide(lines, { mode, tab, isStudyTone });

  /* ─────────────────────────────────────────────────────────
   * 2) 카테고리별 추가 프롬프트 (기본형 + 시간모드 아래에 덧붙임)
   * ───────────────────────────────────────────────────────── */

  appendTopicGuides(lines, {
    topic,
    subTopic,
    relationMode,
    isStudyTone,
  });

  return lines.join("\n");
}
