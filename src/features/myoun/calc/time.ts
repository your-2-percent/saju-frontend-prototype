const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export const addCalendarYears = (base: Date, years: number): Date => {
  const d = new Date(base.getTime());
  const y = d.getFullYear() + years;
  const m = d.getMonth();
  const day = d.getDate();

  // UTC 기준 안전하게 세팅
  return new Date(Date.UTC(y, m, day, d.getUTCHours(), d.getUTCMinutes()));
};

export const roundToMinute = (d: Date): Date => {
  const r = new Date(d);
  r.setSeconds(0, 0);
  return r;
};

export const TIME_MS = {
  MIN,
  HOUR,
  DAY,
} as const;
