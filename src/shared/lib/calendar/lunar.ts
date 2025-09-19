// shared/lib/calendar/lunar.ts
import * as solarlunar from "solarlunar";

/* ──────────────────────────────
 * 타입
 * ────────────────────────────── */
type Lunar2SolarResult = {
  cYear: number;
  cMonth: number;
  cDay: number;
  isLeap?: boolean;
};

type Lunar2SolarFn = (
  y: number,
  m: number,
  d: number,
  isLeap: boolean
) => Lunar2SolarResult;

type SolarLunarLike = {
  lunar2solar?: unknown;
};

type SolarLunarAPI = {
  lunar2solar: (y: number, m: number, d: number, isLeap: boolean) => {
    y: number;
    m: number;
    d: number;
  };
};

/** 달력 관련 필드를 담을 수 있는 최소 형태(프로젝트 스키마와 느슨하게 호환) */
export type CalendarSource = {
  calendarType?: string;     // "lunar" | "solar" | 기타
  calendar?: string;         // "lunar" | "solar" | 기타
  isLunar?: boolean;
  lunar?: boolean;

  isLeapMonth?: boolean;
  leap?: boolean;
  leapMonth?: boolean;

  birthDay?: string | number | Date;
  birthDate?: string | number | Date;
  birth?: string | number | Date;
} | null | undefined;

/* ──────────────────────────────
 * 런타임 가드
 * ────────────────────────────── */
function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function hasDefault(obj: unknown): obj is { default: unknown } {
  return isObjectRecord(obj) && "default" in obj;
}

function hasFunction<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObjectRecord(obj) && typeof obj[key] === "function";
}

function isLunar2SolarFn(fn: unknown): fn is Lunar2SolarFn {
  return typeof fn === "function";
}

function isLunar2SolarResult(v: unknown): v is Lunar2SolarResult {
  if (!isObjectRecord(v)) return false;
  const y = v["cYear"];
  const m = v["cMonth"];
  const d = v["cDay"];
  return typeof y === "number" && typeof m === "number" && typeof d === "number";
}

/* ──────────────────────────────
 * solarlunar 안전 래퍼
 * ────────────────────────────── */
function pickSolarLunar(mod: unknown): SolarLunarAPI {
  const base: unknown = hasDefault(mod) ? (mod as { default: unknown }).default : mod;

  if (!isObjectRecord(base)) {
    throw new Error("solarlunar module is not an object");
  }

  const candidate: SolarLunarLike = base as SolarLunarLike;
  if (!hasFunction(candidate, "lunar2solar") || !isLunar2SolarFn(candidate.lunar2solar)) {
    throw new Error("solarlunar.lunar2solar not found");
  }

  const wrapped: Lunar2SolarFn = candidate.lunar2solar;

  return {
    lunar2solar(y: number, m: number, d: number, isLeap: boolean) {
      const res = wrapped(y, m, d, isLeap);
      if (!isLunar2SolarResult(res)) {
        throw new Error("Invalid lunar2solar result");
      }
      return { y: res.cYear, m: res.cMonth, d: res.cDay };
    },
  };
}

const SL = pickSolarLunar(solarlunar);

/* ──────────────────────────────
 * 입력 파서
 * ────────────────────────────── */
/** "YYYYMMDD" | "YYYY-MM-DD" | Date | number(YYYYMMDD) 허용 */
export function parseYMD(input: unknown): { y: number; m: number; d: number } | null {
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return { y: input.getFullYear(), m: input.getMonth() + 1, d: input.getDate() };
  }

  if (typeof input === "number") {
    const s = String(input);
    if (/^\d{8}$/.test(s)) {
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(4, 6));
      const d = Number(s.slice(6, 8));
      if (y && m && d) return { y, m, d };
    }
  }

  if (typeof input === "string") {
    const s = input.trim();
    // YYYYMMDD
    if (/^\d{8}$/.test(s)) {
      const y = Number(s.slice(0, 4));
      const m = Number(s.slice(4, 6));
      const d = Number(s.slice(6, 8));
      if (y && m && d) return { y, m, d };
    }
    // YYYY-MM-DD
    const m1 = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m1) {
      const y = Number(m1[1]);
      const m = Number(m1[2]);
      const d = Number(m1[3]);
      if (y && m && d) return { y, m, d };
    }
  }

  return null;
}

/* ──────────────────────────────
 * 달력/윤달 감지
 * ────────────────────────────── */
export function isLunarCalendar(src: CalendarSource): boolean {
  if (!src || typeof src !== "object") return false;

  const c1 = (src as Record<string, unknown>)["calendarType"];
  const c2 = (src as Record<string, unknown>)["calendar"];
  const b1 = (src as Record<string, unknown>)["isLunar"];
  const b2 = (src as Record<string, unknown>)["lunar"];
  const k1 = (src as Record<string, unknown>)["isLunarBirth"];
  const k2 = (src as Record<string, unknown>)["lunarBirth"];
  const k3 = (src as Record<string, unknown>)["isBirthLunar"];
  const s1 = (src as Record<string, unknown>)["calendarName"]; // "음력" 등

  return (
    c1 === "lunar" ||
    c2 === "lunar" ||
    b1 === true ||
    b2 === true ||
    k1 === true ||
    k2 === true ||
    k3 === true ||
    s1 === "음력"
  );
}

export function getLeapFlag(src: CalendarSource): boolean {
  if (!src || typeof src !== "object") return false;
  const r = src as Record<string, unknown>;
  return Boolean(
    r["isLeapMonth"] ||
    r["leap"] ||
    r["leapMonth"] ||
    r["isLunarLeap"] ||
    r["lunarLeap"]
  );
}

/* ──────────────────────────────
 * 변환기
 * ────────────────────────────── */
/** 음력 → 양력 (윤달 플래그 반영) */
export function lunarToSolar(y: number, m: number, d: number, isLeap: boolean) {
  return SL.lunar2solar(y, m, d, isLeap);
}

