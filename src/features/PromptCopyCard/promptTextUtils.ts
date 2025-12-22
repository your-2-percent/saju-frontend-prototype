import type { RelationMode } from "@/features/prompt/buildPrompt";
import type { ToneKey } from "@/features/PromptCopyCard/types";
import type { MyeongSik } from "@/shared/lib/storage";
import { buildPartnerInfo } from "@/features/prompt/partnerInfo";

export function buildToneInstruction(tone: ToneKey): string {
  switch (tone) {
    case "analysis":
      return "해석은 감정 과잉을 배제하고, 구조·패턴 중심으로 설명한다.\n";
    case "mentor":
      return "현실 조언 중심으로 균형 있게 설명한다.\n";
    case "dryHumor":
      return "건조한 유머를 섞되 과장하지 않는다.\n";
    case "softWarm":
      return "부드럽고 따뜻한 톤으로 공감하며 설명한다.\n";
    default:
      return "";
  }
}

export function buildFriendInstruction(friendMode: boolean): string {
  return friendMode ? "모든 해석은 반말로 친근하게 말한다.\n" : "";
}

export function buildPartnerPromptFragment(
  relationMode: RelationMode,
  partnerMs: MyeongSik | null,
): string {
  if (relationMode !== "couple") return "";
  const info = buildPartnerInfo(partnerMs);
  if (!info) return "";

  return [
    "",
    "",
    "[추가 정보 - 커플 파트너 명식]",
    "파트너정보",
    `- 이름 : ${info.name}`,
    `- 생년월일 : ${info.birthDate}`,
    `- 출생시간 : ${info.birthTime}`,
    `- 출생지 : ${info.birthPlace}`,
    `- ${info.ganjiText}`,
    "",
    "위 파트너 정보를 커플/궁합 해석에 반영하고,",
    "실제 관계의 상황과 흐름 중심으로 설명해 주세요.",
    "",
  ].join("\n");
}
