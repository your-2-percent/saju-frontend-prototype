// shared/domain/meongsik/derive.ts

import type { MyeongSik } from "@/shared/lib/storage";
import type { Direction } from "@/shared/type";
import { coerceBirthDayDigits, coerceBirthTimeDigits } from "@/shared/lib/core/birthFields";
import { recalcGanjiSnapshot } from "@/shared/domain/ganji/recalcGanjiSnapshot";

function toDate(v: unknown, fallback: Date): Date {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
  return fallback;
}

export function normalizeGender(v: unknown): "남자" | "여자" {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "여자" ? "여자" : "남자";
}

export function extractYearStem(ganjiTextLike: unknown): string | null {
  if (typeof ganjiTextLike !== "string") return null;
  const match = ganjiTextLike.match(/원국\s*:\s*(.)/);
  return match ? match[1] : null;
}

export function computeDaewoonDir(ms: Pick<MyeongSik, "gender" | "ganjiText" | "ganji">): Direction {
  const yearStem = extractYearStem(ms.ganjiText) ?? extractYearStem(ms.ganji);
  if (!yearStem) return "forward";

  const yangStems = ["갑", "병", "무", "경", "임"]; // 양간
  const isYang = yangStems.includes(yearStem);
  const isMale = normalizeGender(ms.gender) === "남자";

  return isYang ? (isMale ? "forward" : "backward") : (isMale ? "backward" : "forward");
}

/**
 * DB/스토리지에서 읽어온 MyeongSik을
 * - 포맷 정규화(birthDay/birthTime)
 * - Date 복원(dateObj/corrected)
 * - 간지/보정 스냅샷 재계산
 * - 대운 방향(dir) 재계산
 *
 * 으로 한 번에 정리.
 */
export function reviveAndRecalc(base: MyeongSik): MyeongSik {
  const normalized: MyeongSik = {
    ...base,
    birthDay: coerceBirthDayDigits(base.birthDay ?? ""),
    birthTime: base.birthTime === "모름" ? "모름" : coerceBirthTimeDigits(base.birthTime ?? ""),
    gender: normalizeGender(base.gender),
    dateObj: toDate(base.dateObj, new Date()),
    corrected: toDate(base.corrected, new Date(NaN)),
    correctedLocal: typeof base.correctedLocal === "string" ? base.correctedLocal : "",
    ganjiText: typeof base.ganjiText === "string" ? base.ganjiText : "",
    ganji: typeof base.ganji === "string" ? base.ganji : "",
    dayStem: typeof base.dayStem === "string" ? base.dayStem : "",
    calendarType: base.calendarType === "lunar" ? "lunar" : "solar",
    dir: base.dir === "backward" ? "backward" : "forward",
  };

  const snap = recalcGanjiSnapshot(normalized);
  const merged: MyeongSik = {
    ...normalized,
    ...snap,
  };

  return {
    ...merged,
    dir: computeDaewoonDir(merged),
  };
}
