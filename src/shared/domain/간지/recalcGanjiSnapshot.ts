// shared/domain/ganji/recalcGanjiSnapshot.ts
import { getCorrectedDate } from "@/shared/lib/core/timeCorrection";
import {
  getYearGanZhi,
  getMonthGanZhi,
  getDayGanZhi,
  getHourGanZhi,
} from "@/shared/domain/간지/공통";
import type { MyeongSik } from "@/shared/lib/storage";
import type { DayBoundaryRule } from "@/shared/type";
import * as solarlunar from "solarlunar";

/* --- solarlunar 래퍼 (CJS/ESM 안전) --- */
type L2SRaw = { cYear: number; cMonth: number; cDay: number; isLeap?: boolean };
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}
function assertL2S(v: unknown): L2SRaw {
  if (!isRecord(v)) throw new Error("Invalid lunar2solar result");
  const r = v as Record<string, unknown>;
  const yVal = r["cYear"], mVal = r["cMonth"], dVal = r["cDay"];
  if (typeof yVal !== "number" || typeof mVal !== "number" || typeof dVal !== "number") {
    throw new Error("Invalid lunar2solar fields");
  }
  const leapVal = r["isLeap"];
  const isLeap = typeof leapVal === "boolean" ? leapVal : undefined;
  return { cYear: yVal, cMonth: mVal, cDay: dVal, isLeap };
}
function pickSL(mod: unknown) {
  const base = (isRecord(mod) && "default" in mod ? (mod as { default?: unknown }).default : mod);
  if (!isRecord(base)) throw new Error("solarlunar module invalid");
  const fn = (base as Record<string, unknown>)["lunar2solar"];
  if (typeof fn !== "function") throw new Error("solarlunar.lunar2solar not found");
  return (y: number, m: number, d: number) => assertL2S(
    (fn as (y: number, m: number, d: number, isLeap?: boolean) => unknown)(y, m, d, false)
  );
}
const lunar2solarStrict = pickSL(solarlunar);

/* --- 핵심: 간지/보정시 스냅샷 재계산 --- */
export function recalcGanjiSnapshot(ms: MyeongSik): Pick<MyeongSik, "corrected" | "correctedLocal" | "ganji"> {
  const hourRule: DayBoundaryRule = (ms.mingSikType as DayBoundaryRule) ?? "조자시/야자시";

  // 날짜 파싱
  let y = Number(ms.birthDay.slice(0, 4));
  let mo = Number(ms.birthDay.slice(4, 6));
  let d = Number(ms.birthDay.slice(6, 8));

  // 음력 → 양력
  if (ms.calendarType === "lunar") {
    const s = lunar2solarStrict(y, mo, d);
    y = s.cYear; mo = s.cMonth; d = s.cDay;
  }

  // 시간
  const unknownTime = !ms.birthTime || ms.birthTime === "모름";
  const hh = unknownTime ? 4 : Number(ms.birthTime.slice(0, 2));
  const mi = unknownTime ? 30 : Number(ms.birthTime.slice(2, 4));

  // 경도 (모름이면 127.5)
  const lon =
    !ms.birthPlace || ms.birthPlace.name === "모름" || ms.birthPlace.lon === 0
      ? 127.5
      : ms.birthPlace.lon;

  // 보정
  const raw = new Date(y, mo - 1, d, hh, mi, 0, 0);
  //const isUnknownTime = !ms.birthTime || ms.birthTime === "모름";
  const isUnknownPlace = !ms.birthPlace || (typeof ms.birthPlace === "object" && ms.birthPlace.name === "모름");
  const corr = getCorrectedDate(raw, lon, isUnknownPlace);
  const correctedLocal = unknownTime
    ? ""
    : corr.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });

  // 간지
  const yGZ = getYearGanZhi(corr, lon);
  const mGZ = getMonthGanZhi(corr, lon);
  const dGZ = getDayGanZhi(corr, hourRule);
  const hGZ = unknownTime ? null : getHourGanZhi(corr, hourRule);

  const ganjiText = [`원국 : ${yGZ}년 ${mGZ}월 ${dGZ}일`, hGZ ? `${hGZ}시` : null]
    .filter(Boolean)
    .join(" ");

  return { corrected: corr, correctedLocal, ganji: ganjiText };
}
