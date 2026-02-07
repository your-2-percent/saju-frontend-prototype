import type { RelationMode } from "@/features/prompt/buildPrompt";
import type { MyeongSik } from "@/shared/lib/storage";
import { buildPartnerInfo } from "@/features/prompt/partnerInfo";

export function buildFriendInstruction(friendMode: boolean): string {
  return friendMode ? "모든 해석은 반말로 친근하게 말한다.\n" : "";
}

export function buildTeacherInstruction(teacherMode: boolean): string {
  return teacherMode ? "선생님처럼 공부/학습용으로 차근히 설명한다.\n" : "";
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
    "파트너의 정보를 커플/궁합 해석에 반영하고,",
    "실제 관계의 흐름과 변화 중심으로 설명해주세요.",
    "",
  ].join("\n");
}
