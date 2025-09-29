// shared/utils/withSafeClockForUnknownTime.ts
import type { MyeongSik } from "@/shared/lib/storage";

/** 시간 미상/부재 시, 간지 계산용 Date를 12:00로 고정해 경계(야자시) 오프바이원 제거 */
export function withSafeClockForUnknownTime(ms: MyeongSik, base: Date): Date {
  const any = ms as unknown as Record<string, unknown>;

  // isUnknownTime 플래그 최우선
  const unknown = typeof any.isUnknownTime === "boolean" ? (any.isUnknownTime as boolean) : false;

  // birthTime/birthHour/birthMinute 존재 여부 (문자 "HHmm" / "HH:mm" / 숫자 조합 지원)
  const hasBirthTimeStr =
    typeof any.birthTime === "string" &&
    /^(?:\d{4}|\d{2}:\d{2})$/.test(any.birthTime as string);
  const hasBirthHourNum = typeof any.birthHour === "number";
  const hasBirthMinuteNum = typeof any.birthMinute === "number";
  const hasTime = hasBirthTimeStr || hasBirthHourNum || hasBirthMinuteNum;

  if (unknown || !hasTime) {
    const d = new Date(base);
    d.setDate(d.getDate() + 1); // ✅ 하루 추가
    d.setHours(4, 30, 0, 0);    // ✅ 정오 고정
    return d;
  }
  return base; // ✅ 시간 명시된 경우는 원본 유지
}
