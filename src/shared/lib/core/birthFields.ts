// shared/lib/core/birthFields.ts

/**
 * 생년월일/시간 입력 포맷이 섞여 들어와도(YYYYMMDD, YYYY-MM-DD, HHmm, HH:MM 등)
 * 안전하게 처리하기 위한 유틸.
 *
 * 내부 표준(권장):
 * - birthDay: YYYYMMDD
 * - birthTime: HHmm (또는 '모름')
 */

export type ParsedBirthDay = { y: number; m: number; d: number };
export type ParsedBirthTime = { hh: number; mm: number };

function onlyDigits(input: string): string {
  return input.replace(/\D/g, "");
}

function isValidYmd(y: number, m: number, d: number): boolean {
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return false;
  if (y < 1800 || y > 2200) return false; // 넉넉히
  if (m < 1 || m > 12) return false;
  if (d < 1 || d > 31) return false;

  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d;
}

function isValidHm(hh: number, mm: number): boolean {
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return false;
  if (hh < 0 || hh > 23) return false;
  if (mm < 0 || mm > 59) return false;
  return true;
}

/** YYYYMMDD 혹은 YYYY-MM-DD 등을 파싱. 실패 시 null */
export function parseBirthDayLoose(raw: string): ParsedBirthDay | null {
  const digits = onlyDigits(raw.trim());
  if (digits.length !== 8) return null;

  const y = Number(digits.slice(0, 4));
  const m = Number(digits.slice(4, 6));
  const d = Number(digits.slice(6, 8));
  if (!isValidYmd(y, m, d)) return null;
  return { y, m, d };
}

/** HHmm 혹은 HH:MM 등을 파싱. '모름'이나 공백이면 null */
export function parseBirthTimeLoose(raw: string): ParsedBirthTime | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "모름") return null;

  const digits = onlyDigits(trimmed);
  if (digits.length !== 4) return null;

  const hh = Number(digits.slice(0, 2));
  const mm = Number(digits.slice(2, 4));
  if (!isValidHm(hh, mm)) return null;
  return { hh, mm };
}

/**
 * birthDay를 내부 표준(YYYYMMDD)로 최대한 보정.
 * - 정상 파싱되면 YYYYMMDD 반환
 * - 파싱 실패면 원문 trim을 반환(데이터 손실 방지)
 */
export function coerceBirthDayDigits(raw: string): string {
  const trimmed = raw.trim();
  const parsed = parseBirthDayLoose(trimmed);
  if (!parsed) return trimmed;

  const yyyy = String(parsed.y).padStart(4, "0");
  const mm = String(parsed.m).padStart(2, "0");
  const dd = String(parsed.d).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/**
 * birthTime을 내부 표준(HHmm 또는 '모름')로 최대한 보정.
 * - '모름'은 그대로
 * - 정상 파싱되면 HHmm 반환
 * - 파싱 실패면 원문 trim을 반환(데이터 손실 방지)
 */
export function coerceBirthTimeDigits(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "모름") return "모름";

  const parsed = parseBirthTimeLoose(trimmed);
  if (!parsed) return trimmed;

  const hh = String(parsed.hh).padStart(2, "0");
  const mm = String(parsed.mm).padStart(2, "0");
  return `${hh}${mm}`;
}

/** 표시용: YYYY-MM-DD */
export function formatBirthDayDashed(raw: string): string {
  const parsed = parseBirthDayLoose(raw);
  if (!parsed) return raw;
  const yyyy = String(parsed.y).padStart(4, "0");
  const mm = String(parsed.m).padStart(2, "0");
  const dd = String(parsed.d).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** 표시용: HH:MM */
export function formatBirthTimeColon(raw: string): string {
  if (raw.trim() === "모름") return "모름";
  const parsed = parseBirthTimeLoose(raw);
  if (!parsed) return raw;
  const hh = String(parsed.hh).padStart(2, "0");
  const mm = String(parsed.mm).padStart(2, "0");
  return `${hh}:${mm}`;
}
