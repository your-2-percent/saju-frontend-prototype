// features/prompt/topicGuide/baseGuide.ts

import { BASE_GUIDE_BEGINNER, BASE_GUIDE_TEACHER_EVENT } from "../topicGuideData";

export function appendBaseGuide(lines: string[], isStudyTone: boolean) {
  lines.push("### 기본형(공통)");
  const base = isStudyTone ? BASE_GUIDE_TEACHER_EVENT : BASE_GUIDE_BEGINNER;
  lines.push(...base);
}
