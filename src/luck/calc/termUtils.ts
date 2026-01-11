import { getSolarTermBoundaries } from "@/features/myoun";

const JIE_NAMES = new Set([
  "소한",
  "입춘",
  "경칩",
  "청명",
  "입하",
  "망종",
  "소서",
  "입추",
  "백로",
  "한로",
  "입동",
  "대설",
]);

type TermRow = { name: string; date: Date };

type JieRange = {
  start: Date;
  end: Date;
  cur: TermRow;
  next: TermRow;
};

export const collectTermsAround = (year: number): TermRow[] => {
  const buckets = [
    ...(getSolarTermBoundaries(new Date(year - 1, 5, 15, 12, 0)) ?? []),
    ...(getSolarTermBoundaries(new Date(year, 5, 15, 12, 0)) ?? []),
    ...(getSolarTermBoundaries(new Date(year + 1, 5, 15, 12, 0)) ?? []),
  ];
  return buckets
    .map((t) => ({ name: String(t.name), date: new Date(t.date) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
};

export const getJieRangeByDateStrict = (target: Date): JieRange => {
  const terms = collectTermsAround(target.getFullYear());
  const jies = terms.filter((t) => JIE_NAMES.has(t.name));
  if (jies.length < 12) {
    const idxAny = terms.findIndex((t) => t.date > target);
    const prev = terms[Math.max(0, idxAny - 1)];
    const next = terms[Math.min(terms.length - 1, idxAny)];
    return {
      start: new Date(prev.date),
      end: new Date(next.date),
      cur: prev,
      next,
    };
  }
  let i = jies.findIndex((t) => t.date > target) - 1;
  if (i < 0) i = jies.length - 1;
  const cur = jies[i];
  const next = jies[(i + 1) % jies.length];
  return {
    start: new Date(cur.date),
    end: new Date(next.date),
    cur,
    next,
  };
};

export const formatStartKST = (d?: Date): string | null => {
  if (!d) return null;
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);

  let month = "",
    day = "",
    hour = "",
    minute = "";
  for (const p of parts) {
    if (p.type === "month") month = p.value;
    if (p.type === "day") day = p.value;
    if (p.type === "hour") hour = p.value;
    if (p.type === "minute") minute = p.value;
  }
  return `${month}/${day} ${hour}:${minute}`;
};
