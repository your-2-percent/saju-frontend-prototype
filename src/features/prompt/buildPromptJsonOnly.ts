import type { SinglePromptInput } from "./buildPromptSingle";
import { buildChatPromptParts } from "./buildPromptSingle";
import type { MultiPromptInput } from "./multi/types";
import { buildMultiLuckPromptParts } from "./buildPromptMulti";
import { sectionJson } from "./sectionFormat";
import { buildPartnerInfo } from "./partnerInfo";

export function buildChatPromptJsonOnly(input: SinglePromptInput): string {
  const { header, body } = buildChatPromptParts(input);
  const partnerInfo =
    input.relationMode === "couple" ? buildPartnerInfo(input.partnerMs ?? null) : null;
  const partnerSection = partnerInfo ? sectionJson("커플 파트너 명식", partnerInfo) : "";
  return [header, body, partnerSection].filter((v) => v && v.trim().length > 0).join("\n\n");
}

export function buildMultiLuckPromptJsonOnly(input: MultiPromptInput): string {
  const { header, body } = buildMultiLuckPromptParts(input);
  const partnerInfo =
    input.relationMode === "couple" ? buildPartnerInfo(input.partnerMs ?? null) : null;
  const partnerSection = partnerInfo ? sectionJson("커플 파트너 명식", partnerInfo) : "";
  return [header, body, partnerSection].filter((v) => v && v.trim().length > 0).join("\n\n");
}
