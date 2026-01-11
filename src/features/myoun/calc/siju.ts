import type { Direction, DayChangeRule } from "@/shared/type";
import { addCalendarYears, roundToMinute, TIME_MS } from "@/features/myoun/calc/time";
import { stepGZ } from "@/features/myoun/calc/ganjiCycle";

const TWO_HOUR_MS = 2 * TIME_MS.HOUR;

/**
 * 시진(2시간 구간) 시작시각은 항상 "홀수시 시작"으로 고정
 * 예) 16:xx -> 15:00 (申시 시작)
 * 예) 10:xx -> 09:00
 * 예) 00:xx -> 23:00
 *
 * ⚠️ DayBoundaryRule(조자시/야자시)은 "일주 경계" 쪽이라
 *     시진(2시간 구간) 시작 계산에 섞으면 오히려 start가 미래로 잡혀서 튄다.
 *     (네가 겪는 1996-12-30 점프가 딱 그 증상)
 */
const getSijinStartHour = (h: number): number => {
  return (Math.floor((h + 1) / 2) * 2 - 1 + 24) % 24;
};

const firstSijuOffsetMs = (birth: Date, dir: Direction): number => {
  const h = birth.getHours();
  const startHour = getSijinStartHour(h);

  const start = new Date(birth);
  start.setHours(startHour, 0, 0, 0);

  // ✅ 핵심 안전장치: start가 birth보다 미래면, 이전 시진으로 되돌린다(2시간 빼기)
  if (start.getTime() > birth.getTime()) {
    start.setTime(start.getTime() - TWO_HOUR_MS);
  }

  const end = new Date(start.getTime() + TWO_HOUR_MS);

  // 이제 항상 start <= birth < end 여야 함
  const usedMs = birth.getTime() - start.getTime();     // 0..2h
  const remainMs = end.getTime() - birth.getTime();     // 0..2h

  // 혹시라도 여기서 범위가 깨지면(타임존/파싱 문제 등) 한번 더 방어
  if (usedMs < 0 || usedMs > TWO_HOUR_MS || remainMs < 0 || remainMs > TWO_HOUR_MS) {
    // 마지막 방어: birth 기준으로 다시 구간을 강제로 맞춤
    const s2 = new Date(birth);
    s2.setHours(getSijinStartHour(birth.getHours()), 0, 0, 0);
    while (s2.getTime() > birth.getTime()) s2.setTime(s2.getTime() - TWO_HOUR_MS);
    const e2 = new Date(s2.getTime() + TWO_HOUR_MS);
    const u2 = birth.getTime() - s2.getTime();
    const r2 = e2.getTime() - birth.getTime();
    return dir === "backward" ? u2 : r2;
  }

  return dir === "backward" ? usedMs : remainMs;
};

export const buildSijuSchedule = (
  natal: Date,
  natalHourGZ: string,
  dir: Direction,
  untilYears = 120
) => {
  const ref = roundToMinute(natal);

  // ✅ 여기서 얻는 값은 "실제 시간(ms)" (0..2h)
  const baseMs = firstSijuOffsetMs(ref, dir);

  // ✅ 네 규칙 그대로: (baseMs / 2h) * 10일  => baseMs * 120
  const SCALE = (10 * TIME_MS.DAY) / (2 * TIME_MS.HOUR); // 120
  const firstChange = roundToMinute(new Date(ref.getTime() + baseMs * SCALE));

  const endAt = addCalendarYears(natal, untilYears).getTime();
  const events: Array<{ at: Date; gz: string }> = [];

  // 첫 변곡점에서 시주 1칸 변화(역행이면 이전 시주)
  let current = stepGZ(natalHourGZ, dir, 1);

  // 이후는 10일 단위로 변화(네 규칙 유지)
  for (let t = firstChange.getTime(); t <= endAt; t += 10 * TIME_MS.DAY) {
    events.push({ at: new Date(t), gz: current });
    current = stepGZ(current, dir, 1);
  }

  return { firstChange, events };
};

export const dayChangeTrigger = (rule: DayChangeRule, dir: Direction) => {
  // ✅ 너가 말한 요구 그대로 이미 맞음:
  // - 순행 + 자시일수론 => 자(子)
  // - 역행 + 자시일수론 => 해(亥)
  // - 순행 + 인시일수론 => 인(寅)
  // - 역행 + 인시일수론 => 축(丑)
  const target =
    dir === "forward"
      ? rule === "자시일수론"
        ? "자"
        : "인"
      : rule === "자시일수론"
        ? "해"
        : "축";

  return (branch: string) => branch === target;
};

export const buildIljuFromSiju = (
  siju: ReturnType<typeof buildSijuSchedule>,
  natalDayGZ: string,
  dir: Direction,
  rule: DayChangeRule
) => {
  const isTrigger = dayChangeTrigger(rule, dir);

  let cur = natalDayGZ;
  const events: Array<{ at: Date; gz: string }> = [];

  for (const ev of siju.events) {
    const br = ev.gz.charAt(1); // "갑신" -> "신"
    if (isTrigger(br)) {
      cur = stepGZ(cur, dir, 1);
      events.push({ at: ev.at, gz: cur });
    }
  }

  return { events };
};
