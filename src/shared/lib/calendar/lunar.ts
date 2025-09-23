// shared/lib/calendar/lunar.ts
import * as solarlunar from "solarlunar";

export type CalendarType = "solar" | "lunar";

type Lunar2SolarRaw = {
  cYear: number;
  cMonth: number;
  cDay: number;
  isLeap?: boolean;
};

type SolarLunarAPI = {
  lunar2solar: (y: number, m: number, d: number, isLeap: boolean) => Lunar2SolarRaw;
};

export function isRecord(v: unknown): v is Record<string, unknown> {
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

export function lunarToSolarStrict(y: number, m: number, d: number, h: number = 4, mm: number = 0) {
  const out = SL.lunar2solar(y, m, d, false); // 윤달 처리 고정
  return new Date(out.cYear, out.cMonth - 1, out.cDay, h, mm);
}

export function lunarToSolarStrictTime(y: number, m: number, d: number) {
  const out = SL.lunar2solar(y, m, d, false); // 윤달 처리 고정
  return new Date(out.cYear, out.cMonth - 1, out.cDay, 4, 0);
}

