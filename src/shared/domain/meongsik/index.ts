// shared/domain/meongsik.ts
import { getDayGanZhi } from "@/shared/domain/간지/공통";
import { normalizeStem } from "@/shared/domain/간지/normalize";
import type { MyeongSik } from "@/shared/lib/storage";
import type { Stem10sin } from "@/shared/domain/간지/utils";
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import * as solarlunar from "solarlunar";

/* ===== solarlunar 안전 래퍼 (CJS/ESM 호환, 윤달 인자 false 고정) ===== */

type Lunar2SolarRaw = {
  cYear: number;
  cMonth: number;
  cDay: number;
  isLeap?: boolean;
};

type SolarLunarAPI = {
  lunar2solar: (y: number, m: number, d: number, isLeap: boolean) => Lunar2SolarRaw;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasDefault(v: unknown): v is { default: unknown } {
  return isRecord(v) && "default" in v;
}

function hasLunar2Solar(
  v: unknown
): v is { lunar2solar: (y: number, m: number, d: number, isLeap?: boolean) => unknown } {
  return isRecord(v) && typeof v["lunar2solar"] === "function";
}

function assertL2S(v: unknown): Lunar2SolarRaw {
  if (!isRecord(v)) throw new Error("Invalid lunar2solar result");
  const y = v["cYear"];
  const m = v["cMonth"];
  const d = v["cDay"];
  const leap = v["isLeap"];
  if (typeof y !== "number" || typeof m !== "number" || typeof d !== "number") {
    throw new Error("Invalid lunar2solar fields");
  }
  return {
    cYear: y,
    cMonth: m,
    cDay: d,
    isLeap: typeof leap === "boolean" ? leap : undefined,
  };
}

function pickSolarLunar(mod: unknown): SolarLunarAPI {
  const base: unknown = hasDefault(mod) ? mod.default : mod;
  if (!hasLunar2Solar(base)) throw new Error("solarlunar.lunar2solar not found");
  const lunar2solar = (y: number, m: number, d: number, isLeap: boolean): Lunar2SolarRaw => {
    const res = (base as { lunar2solar: (y: number, m: number, d: number, isLeap?: boolean) => unknown })
      .lunar2solar(y, m, d, isLeap);
    return assertL2S(res);
  };
  return { lunar2solar };
}
const SL = pickSolarLunar(solarlunar);

function lunarToSolarStrict(y: number, m: number, d: number) {
  const out = SL.lunar2solar(y, m, d, false); // 윤달 처리 고정
  return new Date(out.cYear, out.cMonth - 1, out.cDay, 4, 0);
}

export function toCorrected(ms: MyeongSik): Date {
  // birthDay: "19961229"
  // birthTime: "1630" or "모름"
  const y = Number(ms.birthDay?.slice(0, 4));
  const m = Number(ms.birthDay?.slice(4, 6)) - 1;
  const d = Number(ms.birthDay?.slice(6, 8));
  const hh = !ms.birthTime || ms.birthTime === "모름"
    ? 0
    : Number(ms.birthTime?.slice(0, 2));
  const mi = !ms.birthTime || ms.birthTime === "모름"
    ? 0
    : Number(ms.birthTime?.slice(2, 4));

  const raw = new Date(y, m, d, hh, mi, 0, 0);
  if (isNaN(raw.getTime())) throw new Error(`Invalid date: ${ms.birthDay} ${ms.birthTime}`);
  //const isUnknownTime = !ms.birthTime || ms.birthTime === "모름";
  const isUnknownPlace = !ms.birthPlace || (typeof ms.birthPlace === "object" && ms.birthPlace.name === "모름");
  return getCorrectedDate(raw, ms.birthPlace?.lon ?? 127.5, isUnknownPlace);
}

export function toDayStem(ms: MyeongSik): Stem10sin {
  let baseDate: Date;

  if (ms.calendarType === "lunar") {
    const y = parseInt(ms.birthDay.slice(0, 4), 10);
    const m = parseInt(ms.birthDay.slice(4, 6), 10);
    const d = parseInt(ms.birthDay.slice(6, 8), 10);

    // 음력 → 양력 변환
    baseDate = lunarToSolarStrict(y, m, d, 4, 0);
    console.log(baseDate);
  } else {
    // solar 그대로
    baseDate = toCorrected(ms);
  }

  const gz = getDayGanZhi(baseDate, ms.mingSikType ?? "인시");
  if (!gz) throw new Error(`getDayGanZhi returned undefined for ${baseDate.toISOString()}`);

  const stem = normalizeStem(gz);
  if (!stem) throw new Error(`Invalid day stem from ${gz}`);
  return stem;
}

