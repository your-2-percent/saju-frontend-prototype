// features/prompt/topicGuide/topicGuides.ts

import type { MainCategoryKey, RelationMode, SubCategoryKey } from "./types";
import { appendTopicGuidesA } from "./topicGuidesA";
import { appendTopicGuidesB } from "./topicGuidesB";

type Args = {
  topic: MainCategoryKey;
  subTopic?: SubCategoryKey;
  relationMode?: RelationMode;
  isStudyTone: boolean;
};

export function appendTopicGuides(lines: string[], args: Args) {
  // A/B 둘 다 시도해서 한 쪽이 처리하면 끝
  if (appendTopicGuidesA(lines, args)) return;
  if (appendTopicGuidesB(lines, args)) return;
}
