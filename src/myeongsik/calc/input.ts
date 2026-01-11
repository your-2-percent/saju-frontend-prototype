// shared/domain/meongsik/input.ts

import type { MyeongSik, BirthPlace } from "@/shared/lib/storage";
import type { CalendarType } from "@/shared/type";
import {
  coerceBirthDayDigits,
  coerceBirthTimeDigits,
  parseBirthDayLoose,
  parseBirthTimeLoose,
} from "@/shared/lib/core/birthFields";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import { reviveAndRecalc, normalizeGender } from "@/myeongsik/calc/derive";

type Ok<T> = { ok: true; value: T };
type Err = { ok: false; message: string };
export type Result<T> = Ok<T> | Err;

export function normalizeMingSikType(v: unknown): MyeongSik["mingSikType"] {
  if (v === "자시" || v === "조자시/야자시" || v === "인시") return v;
  return "조자시/야자시";
}

export function normalizeCalendarType(v: unknown): CalendarType {
  return v === "lunar" ? "lunar" : "solar";
}

export function normalizeBirthPlace(
  birthPlace: BirthPlace | undefined,
  unknownPlace: boolean,
): BirthPlace {
  if (unknownPlace || !birthPlace || birthPlace.name === "모름") {
    return { name: "모름", lat: 0, lon: 127.5 };
  }

  const lat = Number.isFinite(birthPlace.lat) ? birthPlace.lat : 0;
  const lon = Number.isFinite(birthPlace.lon) ? birthPlace.lon : 127.5;
  const name = typeof birthPlace.name === "string" && birthPlace.name.trim() ? birthPlace.name.trim() : "모름";
  return { name, lat, lon };
}

export function validateName(name: unknown, requireName: boolean): Result<string> {
  const s = typeof name === "string" ? name.trim() : "";
  if (!s) {
    return requireName ? { ok: false, message: "이름을 입력해주세요." } : { ok: true, value: "이름없음" };
  }
  return { ok: true, value: s };
}

export function validateBirthDayInput(birthDay: unknown, calendarType: CalendarType): Result<string> {
  const raw = typeof birthDay === "string" ? birthDay : "";
  const digits = coerceBirthDayDigits(raw);
  const parsed = parseBirthDayLoose(digits);
  if (!parsed) return { ok: false, message: "생년월일(YYYYMMDD)을 올바르게 입력해주세요." };

  // 기존 UI 정책 유지(1900~2100)
  if (parsed.y < 1900 || parsed.y > 2100) {
    return { ok: false, message: "생년(YYYY)은 1900~2100 범위로 입력해주세요." };
  }

  if (calendarType === "solar") {
    const date = new Date(parsed.y, parsed.m - 1, parsed.d);
    if (date.getFullYear() !== parsed.y || date.getMonth() + 1 !== parsed.m || date.getDate() !== parsed.d) {
      return { ok: false, message: "존재하지 않는 날짜입니다." };
    }
  } else {
    try {
      // 변환 가능 여부로 유효성 체크
      lunarToSolarStrict(parsed.y, parsed.m, parsed.d, 0, 0);
    } catch {
      return { ok: false, message: "입력한 음력 날짜를 양력으로 변환할 수 없어요." };
    }
  }

  return { ok: true, value: digits };
}

export function validateBirthTimeInput(birthTime: unknown, unknownTime: boolean): Result<string> {
  if (unknownTime) return { ok: true, value: "모름" };
  const raw = typeof birthTime === "string" ? birthTime : "";
  const digits = coerceBirthTimeDigits(raw);
  const parsed = parseBirthTimeLoose(digits);
  if (!parsed) return { ok: false, message: "태어난 시간을 HHmm 형식으로 입력해주세요." };
  return { ok: true, value: digits };
}

export type BuildMyeongSikInput = {
  id: string;
  name?: string;
  birthDay: string;
  calendarType?: CalendarType;
  birthTime?: string;
  unknownTime: boolean;
  gender?: string;
  birthPlace?: BirthPlace;
  unknownPlace: boolean;
  relationship?: string;
  memo?: string;
  folder?: string;
  mingSikType?: MyeongSik["mingSikType"];
  favorite?: boolean;
  deletedAt?: string | null;
  sortOrder?: number;
  dateObj?: Date;
};

/**
 * 폼 입력 → MyeongSik 완성본(간지/보정/dir 포함) 생성
 * - 여기서 “도메인 규칙(검증/정규화/파생값 계산)”을 끝내고 UI는 결과만 씀.
 */
export function buildMyeongSik(input: BuildMyeongSikInput, opts?: { requireName?: boolean }): Result<MyeongSik> {
  const requireName = opts?.requireName ?? false;

  const nameR = validateName(input.name, requireName);
  if (!nameR.ok) return nameR;

  const calType = normalizeCalendarType(input.calendarType);
  const dayR = validateBirthDayInput(input.birthDay, calType);
  if (!dayR.ok) return dayR;

  const timeR = validateBirthTimeInput(input.birthTime, input.unknownTime);
  if (!timeR.ok) return timeR;

  const mingSikType = normalizeMingSikType(input.mingSikType);

  const base: MyeongSik = {
    id: input.id,
    name: nameR.value,
    birthDay: dayR.value,
    birthTime: timeR.value,
    gender: normalizeGender(input.gender),
    sortOrder: input.sortOrder,
    birthPlace: normalizeBirthPlace(input.birthPlace, input.unknownPlace),
    relationship: input.relationship ?? "",
    memo: input.memo ?? "",
    folder: input.folder,
    mingSikType,
    DayChangeRule: mingSikType === "인시" ? "인시일수론" : "자시일수론",
    favorite: input.favorite ?? false,
    deletedAt: input.deletedAt ?? null,

    // 계산/보정 필드(derive에서 채움)
    dateObj: input.dateObj ?? new Date(),
    corrected: new Date(NaN),
    correctedLocal: "",
    dayStem: "",
    ganjiText: "",
    ganji: "",
    calendarType: calType,
    dir: "forward",
  };

  return { ok: true, value: reviveAndRecalc(base) };
}
