import type { Direction, DayChangeRule, DayBoundaryRule } from "@/shared/type";
import { addCalendarYears, roundToMinute, TIME_MS } from "@/features/myoun/calc/time";
import { stepGZ } from "@/features/myoun/calc/ganjiCycle";

const firstSijuOffsetMs = (birth: Date, dir: Direction, table: DayBoundaryRule): number => {
  const h = birth.getHours();
  const startHour =
    table === "조자시/야자시"
      ? (Math.floor((h + 1) / 2) * 2 - 1 + 24) % 24
      : (Math.floor(h / 2) * 2 + 1) % 24;
  const start = new Date(birth);
  start.setHours(startHour, 0, 0, 0);
  const end = new Date(start);
  end.setHours(startHour + 2, 0, 0, 0);
  const usedMs = birth.getTime() - start.getTime();
  const remainMs = end.getTime() - birth.getTime();
  return dir === "backward" ? usedMs : remainMs;
};

export const buildSijuSchedule = (
  natal: Date,
  natalHourGZ: string,
  dir: Direction,
  untilYears = 120,
  hourTable: DayBoundaryRule = "조자시/야자시"
) => {
  const ref = roundToMinute(natal);
  const usedMs = firstSijuOffsetMs(ref, dir, hourTable);
  const firstChange = roundToMinute(new Date(ref.getTime() + usedMs * 120));

  const endAt = addCalendarYears(natal, untilYears).getTime();
  const events: Array<{ at: Date; gz: string }> = [];
  let current = stepGZ(natalHourGZ, dir, 1);
  for (let t = firstChange.getTime(); t <= endAt; t += 10 * TIME_MS.DAY) {
    events.push({ at: new Date(t), gz: current });
    current = stepGZ(current, dir, 1);
  }
  return { firstChange, events };
};

export const dayChangeTrigger = (rule: DayChangeRule, dir: Direction) => {
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
    const br = ev.gz.charAt(1);
    if (isTrigger(br)) {
      cur = stepGZ(cur, dir, 1);
      events.push({ at: ev.at, gz: cur });
    }
  }
  return { events };
};
