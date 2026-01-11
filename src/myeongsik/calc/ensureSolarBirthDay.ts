// shared/domain/meongsik/ensureSolarBirthDay.ts

import type { MyeongSik } from "@/shared/lib/storage";
import { parseBirthDayLoose } from "@/shared/lib/core/birthFields";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/**
 * 음력 입력을 “양력 YYYYMMDD”로 변환해주기.
 * - 변환 실패 시 원본 그대로 반환 (안전)
 * - 현재 프로젝트 기준: lunarToSolarStrict(윤달 미적용) 유지
 */
export function ensureSolarBirthDay(ms: MyeongSik): MyeongSik {
  if (ms.calendarType !== "lunar") return ms;

  const parsed = parseBirthDayLoose(ms.birthDay ?? "");
  if (!parsed) return ms;

  try {
    const solar = lunarToSolarStrict(parsed.y, parsed.m, parsed.d, 0, 0);
    const yyyy = solar.getFullYear();
    const mm = solar.getMonth() + 1;
    const dd = solar.getDate();
    return {
      ...ms,
      birthDay: `${yyyy}${pad2(mm)}${pad2(dd)}`,
      calendarType: "solar",
    };
  } catch {
    return ms;
  }
}
