import type { MyeongSik } from "@/shared/lib/storage";
import { lunarToSolarStrict } from "@/shared/lib/calendar/lunar";
import * as Twelve from "@/shared/domain/간지/twelve";

const STEMS_KO = ["갑","을","병","정","무","기","경","신","임","계"] as const;
const STEMS_HANJA = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"] as const;
const BRANCHES_KO = ["자","축","인","묘","진","사","오","미","신","유","술","해"] as const;
const BRANCHES_HANJA = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"] as const;

const STEM_SET = new Set<string>([...STEMS_KO, ...STEMS_HANJA]);
const BR_SET = new Set<string>([...BRANCHES_KO, ...BRANCHES_HANJA]);

export function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export function isGZ(x: unknown): x is string {
  return typeof x === "string" && x.length >= 2 && STEM_SET.has(x[0]) && BR_SET.has(x[1]);
}

export function ensureGZ(maybe: unknown, ...fallbacks: unknown[]): string {
  if (isGZ(maybe)) return maybe;
  for (const f of fallbacks) if (isGZ(f)) return f as string;
  return "갑자";
}

export function lastAtOrNull<T extends { at: Date }>(arr: T[], t: Date): T | null {
  let ans: T | null = null;
  const x = t.getTime();
  for (const e of arr) {
    if (e.at.getTime() <= x) ans = e;
    else break;
  }
  return ans;
}

export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function fromLocalInput(s?: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const [, y, mo, d, hh, mm] = m;
  const dt = new Date(+y, +mo - 1, +d, +hh, +mm);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

export function nameOf(ms: MyeongSik): string {
  const r = ms as unknown as Record<string, unknown>;
  if (typeof r.name === "string" && r.name) return r.name;
  if (typeof r.title === "string" && r.title) return r.title;
  if (typeof r.memo === "string" && r.memo) return r.memo;
  return "이름 없음";
}

export function parseYMDHM(ms: MyeongSik) {
  const y = Number(ms.birthDay.slice(0, 4));
  const m = Number(ms.birthDay.slice(4, 6));
  const d = Number(ms.birthDay.slice(6, 8));
  let hh = 0;
  let mm = 0;
  const r = ms as unknown as Record<string, unknown>;
  if (typeof r.birthTime === "string" && r.birthTime.length >= 4) {
    hh = Number((r.birthTime as string).slice(0, 2));
    mm = Number((r.birthTime as string).slice(2, 4));
  }
  return { y, m, d, hh, mm };
}

export function baseSolarDate(ms: MyeongSik): Date {
  const { y, m, d, hh, mm } = parseYMDHM(ms);
  const corrected = ms.corrected instanceof Date && !Number.isNaN(ms.corrected.getTime())
    ? ms.corrected
    : new Date(y, m - 1, d, hh, mm);

  const hour = corrected.getHours();
  const minute = corrected.getMinutes();

  return ms.calendarType === "lunar"
    ? lunarToSolarStrict(y, m, d, hour, minute)
    : new Date(y, m - 1, d, hour, minute);
}

export function keyOf(ms: MyeongSik): string {
  const corrected = baseSolarDate(ms);
  return `${nameOf(ms)}-${corrected.toISOString()}`;
}

export function idOf(ms: MyeongSik): string {
  const r = ms as unknown as Record<string, unknown>;
  return typeof r.id === "string" && r.id ? r.id : keyOf(ms);
}

type EraRuntime = {
  Classic?: Twelve.EraType;
  Modern?: Twelve.EraType;
  classic?: Twelve.EraType;
  modern?: Twelve.EraType;
};

function isEraRuntime(v: unknown): v is EraRuntime {
  return isRecord(v) && ("Classic" in v || "Modern" in v || "classic" in v || "modern" in v);
}

export function mapEra(mode: "classic" | "modern"): Twelve.EraType {
  const exported = (Twelve as Record<string, unknown>)["EraType"];
  if (isEraRuntime(exported)) {
    return mode === "classic"
      ? (exported.Classic ?? exported.classic)!
      : (exported.Modern ?? exported.modern)!;
  }
  return mode as unknown as Twelve.EraType;
}

export function genderOf(ms?: MyeongSik | null): "남자" | "여자" | "" {
  if (!ms) return "";
  const r = ms as unknown as Record<string, unknown>;
  const str = (key: string) =>
    typeof r[key] === "string" ? String(r[key]).trim().toLowerCase() : null;
  const bool = (key: string) =>
    typeof r[key] === "boolean" ? (r[key] as boolean) : null;

  const candidates = [
    str("gender"),
    str("sex"),
    str("genderType"),
    str("성별"),
    str("sexType"),
    str("g"),
  ].filter((v): v is string => !!v);

  for (const v of candidates) {
    if (["남", "남자", "male", "m", "boy", "man"].includes(v)) return "남자";
    if (["여", "여자", "female", "f", "girl", "woman"].includes(v)) return "여자";
  }

  const isMale = bool("isMale");
  const isFemale = bool("isFemale");
  if (isMale === true) return "남자";
  if (isFemale === true) return "여자";

  return "";
}
