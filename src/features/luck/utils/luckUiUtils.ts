import type { MyeongSik } from "@/shared/lib/storage";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";

export { isYinUnified, toDisplayChar } from "@/shared/domain/간지/convert";
export { mapEra } from "@/shared/domain/간지/era";

const DEBUG = false;
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

export function ensureSolarBirthDay(data: MyeongSik): MyeongSik {
  const any: Record<string, unknown> = data as unknown as Record<string, unknown>;

  const birthDay = typeof any.birthDay === "string" ? any.birthDay : "";
  const calType = typeof any.calendarType === "string" ? (any.calendarType as string) : "solar";

  if (birthDay.length < 8) return data;

  const y = Number(birthDay.slice(0, 4));
  const m = Number(birthDay.slice(4, 6));
  const d = Number(birthDay.slice(6, 8));

  const leapFlags = ["isLeap", "isLeapMonth", "leapMonth", "leap", "lunarLeap"] as const;
  let isLeap = false;
  for (const k of leapFlags) {
    const v = any[k];
    if (typeof v === "boolean") {
      isLeap = v;
      break;
    }
    if (typeof v === "number") {
      isLeap = v === 1;
      break;
    }
    if (typeof v === "string") {
      isLeap = v === "1" || v.toLowerCase() === "true";
      break;
    }
  }

  if (calType === "lunar") {
    try {
      const solarDate = lunarToSolarStrict(y, m, d, 0, 0);
      const newBirthDay = `${solarDate.getFullYear()}${pad2(
        solarDate.getMonth() + 1
      )}${pad2(solarDate.getDate())}`;

      const out: MyeongSik = {
        ...data,
        birthDay: newBirthDay,
        calendarType: "solar",
      } as MyeongSik;

      if (DEBUG) {
        console.debug("[UnMyounTabs] lunar→solar:", {
          in: { y, m, d, isLeap },
          out: newBirthDay,
        });
      }
      return out;
    } catch (e) {
      if (DEBUG) console.warn("[UnMyounTabs] lunar2solar 실패 → 원본 유지", e);
      return data;
    }
  }

  return data;
}
