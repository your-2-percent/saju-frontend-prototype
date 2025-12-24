// src/shared/myeongsik/saveMyeongsikSmart.ts
import type { MyeongSik } from "@/shared/lib/storage";
import { appendGuestMyeongsik } from "./guestMyeongsikStorage";
import { useLoginNudgeStore } from "@/shared/auth/loginNudgeStore";

/**
 * 로그인 안 했어도 '일단 저장'은 해주고,
 * "유지하려면 로그인" 모달은 저장 직후 띄움.
 *
 * @returns 저장 후 게스트 누적 개수
 */
export function saveGuestThenNudge(ms: MyeongSik): number {
  const count = appendGuestMyeongsik(ms);

  // ✅ 너무 자주 띄우지 말고 "첫 저장"에서만 띄우는 게 UX 좋음
  if (count === 1) {
    useLoginNudgeStore.getState().openWith("PERSIST_SAVE");
  }

  return count;
}
