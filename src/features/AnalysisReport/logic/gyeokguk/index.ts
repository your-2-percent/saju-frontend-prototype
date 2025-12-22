// features/AnalysisReport/logic/gyeokguk/index.ts
export type { Element, GyeokgukInner, TwelveUnseong, TenGodOrUnseong } from "./types";
export { computeNaegyeok } from "./resolver";
export { detectMulsangTerms } from "./mulsang";
export { detectStructureTags } from "./structureTags";
export { STEMS, BRANCHES } from "./rules";
