// features/prompt/buildPrompt.ts
// 엔트리/집계 모듈: 외부에서는 여기만 import 하도록 유지

export { buildChatPrompt } from "./buildPromptSingle";
export { buildMultiLuckPrompt } from "./buildPromptMulti";
export { buildChatPromptJsonOnly, buildMultiLuckPromptJsonOnly } from "./buildPromptJsonOnly";

export { buildTopicGuide } from "./topicGuide";
export type {
  MainCategoryKey,
  SubCategoryKey,
  TimeMode,
  RelationMode,
  TopicContext,
} from "./topicGuide";

// 필요하면 타입 같이 재노출
export type { DaewoonInfo } from "./buildPromptMulti";
